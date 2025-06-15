import { deviceFilters, deviceModelList } from './device-config';
import { sleep, dec2HexString } from './utils';
import { 
  DeviceEndpoints, 
  NFCError, 
  NFCErrorCode, 
  NFCReadResult, 
  NFCReaderOptions,
  NFCReaderState 
} from './types';

// NFCリーダークラス
export class NFCReader {
  private device: USBDevice | null = null;
  private deviceModel: number = 0;
  private deviceEp: DeviceEndpoints = { in: 0, out: 0 };
  private seqNumber: number = 0;
  private isPolling: boolean = false;
  private pollingInterval: number = 1000;
  private pollingTimer: NodeJS.Timeout | null = null;
  private state: NFCReaderState = {
    isConnected: false,
    isReading: false,
    error: null,
    lastRead: null
  };

  constructor(private options: NFCReaderOptions = {}) {
    this.pollingInterval = options.pollingInterval || 1000;
  }

  // 現在の状態を取得
  getState(): NFCReaderState {
    return { ...this.state };
  }

  // デバイス接続
  async connect(): Promise<void> {
    try {
      this.state.error = null;
      
      // ペアリング済みの対応デバイスを検索
      let pairedDevices = await navigator.usb.getDevices();
      pairedDevices = pairedDevices.filter((d) =>
        deviceFilters.map((p) => p.productId).includes(d.productId)
      );

      // デバイス選択（自動選択 or 選択画面）
      this.device = pairedDevices.length === 1
        ? pairedDevices[0]
        : await navigator.usb.requestDevice({ 
            filters: deviceFilters.map(f => ({
              vendorId: f.vendorId,
              productId: f.productId
            }))
          });

      if (!this.device) {
        throw new NFCError('デバイスが選択されませんでした', NFCErrorCode.DEVICE_NOT_FOUND);
      }

      this.deviceModel = deviceModelList[this.device.productId];
      if (!this.deviceModel) {
        throw new NFCError('サポートされていないデバイスです', NFCErrorCode.DEVICE_NOT_FOUND);
      }

      await this.device.open();
      await this.device.selectConfiguration(1);

      const interface1 = this.device.configuration.interfaces.find(
        (v) => v.alternate.interfaceClass === 255
      );

      if (!interface1) {
        throw new NFCError('適切なUSBインターフェースが見つかりません', NFCErrorCode.CONNECTION_FAILED);
      }

      await this.device.claimInterface(interface1.interfaceNumber);

      const inEndpoint = interface1.alternate.endpoints.find(e => e.direction === 'in');
      const outEndpoint = interface1.alternate.endpoints.find(e => e.direction === 'out');

      if (!inEndpoint || !outEndpoint) {
        throw new NFCError('適切なUSBエンドポイントが見つかりません', NFCErrorCode.CONNECTION_FAILED);
      }

      this.deviceEp = {
        in: inEndpoint.endpointNumber,
        out: outEndpoint.endpointNumber,
      };

      this.state.isConnected = true;
      console.log('NFCリーダーに接続しました');

    } catch (error) {
      this.state.error = error instanceof NFCError ? error.message : 'デバイス接続に失敗しました';
      await this.cleanup();
      throw error instanceof NFCError ? error : new NFCError(
        'デバイス接続に失敗しました',
        NFCErrorCode.CONNECTION_FAILED,
        error as Error
      );
    }
  }

  // デバイス切断
  async disconnect(): Promise<void> {
    this.stopPolling();
    await this.cleanup();
  }

  // 1回のIDm読み取り
  async readIDm(): Promise<string> {
    if (!this.device || !this.state.isConnected) {
      throw new NFCError('デバイスが接続されていません', NFCErrorCode.CONNECTION_FAILED);
    }

    try {
      this.state.isReading = true;
      this.state.error = null;

      const idmStr = await this.session300();
      
      if (!idmStr || !this.isValidIdm(idmStr)) {
        throw new NFCError('有効なIDmが読み取れませんでした', NFCErrorCode.INVALID_RESPONSE);
      }

      const result: NFCReadResult = {
        idm: idmStr,
        timestamp: new Date()
      };

      this.state.lastRead = result;
      return idmStr;

    } catch (error) {
      this.state.error = error instanceof NFCError ? error.message : 'IDm読み取りに失敗しました';
      throw error instanceof NFCError ? error : new NFCError(
        'IDm読み取りに失敗しました',
        NFCErrorCode.READ_TIMEOUT,
        error as Error
      );
    } finally {
      this.state.isReading = false;
    }
  }

  // ポーリング開始
  startPolling(onIdmRead: (idm: string) => void, onError?: (error: NFCError) => void): void {
    if (this.isPolling) {
      console.warn('ポーリングは既に開始されています');
      return;
    }

    this.isPolling = true;
    console.log(`ポーリングを開始しました（間隔: ${this.pollingInterval}ms）`);

    const poll = async () => {
      if (!this.isPolling) return;

      try {
        const idm = await this.readIDm();
        onIdmRead(idm);
      } catch (error) {
        const nfcError = error instanceof NFCError ? error : new NFCError(
          'ポーリング中にエラーが発生しました',
          NFCErrorCode.UNKNOWN_ERROR,
          error as Error
        );
        
        if (onError) {
          onError(nfcError);
        } else {
          console.error('ポーリングエラー:', nfcError.message);
        }
      }

      if (this.isPolling) {
        this.pollingTimer = setTimeout(poll, this.pollingInterval);
      }
    };

    poll();
  }

  // ポーリング停止
  stopPolling(): void {
    if (!this.isPolling) return;

    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log('ポーリングを停止しました');
  }

  // RC-S300通信セッション
  private async session300(): Promise<string> {
    if (!this.device) {
      throw new NFCError('デバイスが初期化されていません', NFCErrorCode.CONNECTION_FAILED);
    }

    const len = 50;

    try {
      // 初期化シーケンス
      await this.send300([0xff, 0x56, 0x00, 0x00]);
      await this.receive(len);

      await this.send300([0xff, 0x50, 0x00, 0x00, 0x02, 0x82, 0x00, 0x00]);
      await this.receive(len);

      await this.send300([0xff, 0x50, 0x00, 0x00, 0x02, 0x81, 0x00, 0x00]);
      await this.receive(len);

      await this.send300([0xff, 0x50, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00]);
      await this.receive(len);

      await this.send300([0xff, 0x50, 0x00, 0x00, 0x02, 0x84, 0x00, 0x00]);
      await this.receive(len);

      await this.send300([0xff, 0x50, 0x00, 0x02, 0x04, 0x8f, 0x02, 0x03, 0x00, 0x00]);
      await this.receive(len);

      // ポーリングコマンド
      await this.send300([
        0xff, 0x50, 0x00, 0x01, 0x00, 0x00, 0x11, 0x5f, 0x46, 0x04, 0xa0, 0x86,
        0x01, 0x00, 0x95, 0x82, 0x00, 0x06, 0x06, 0x00, 0xff, 0xff, 0x01, 0x00,
        0x00, 0x00, 0x00,
      ]);

      const pollingResponse = await this.receive(len);
      
      // レスポンス検証とIDm抽出
      if (pollingResponse.length === 46) {
        const idm = pollingResponse.slice(26, 34).map((v) => dec2HexString(v));
        return idm.join(' ');
      }

      throw new NFCError('有効なポーリングレスポンスが得られませんでした', NFCErrorCode.INVALID_RESPONSE);

    } catch (error) {
      throw error instanceof NFCError ? error : new NFCError(
        'RC-S300通信エラー',
        NFCErrorCode.UNKNOWN_ERROR,
        error as Error  
      );
    }
  }

  // データ送信
  private async send300(data: number[]): Promise<void> {
    if (!this.device) {
      throw new NFCError('デバイスが初期化されていません', NFCErrorCode.CONNECTION_FAILED);
    }

    const argData = new Uint8Array(data);
    const dataLen = argData.length;
    const SLOT_NUMBER = 0x00;
    const retVal = new Uint8Array(10 + dataLen);

    // ヘッダー作成
    retVal[0] = 0x6b;
    retVal[1] = 255 & dataLen;
    retVal[2] = (dataLen >> 8) & 255;
    retVal[3] = (dataLen >> 16) & 255;
    retVal[4] = (dataLen >> 24) & 255;
    retVal[5] = SLOT_NUMBER;
    retVal[6] = ++this.seqNumber;

    if (dataLen !== 0) {
      retVal.set(argData, 10);
    }

    console.log('送信データ:', Array.from(retVal).map((v) => v.toString(16)));
    
    try {
      await this.device.transferOut(this.deviceEp.out, retVal);
      await sleep(50);
    } catch (error) {
      throw new NFCError('データ送信に失敗しました', NFCErrorCode.UNKNOWN_ERROR, error as Error);
    }
  }

  // データ受信
  private async receive(length: number): Promise<number[]> {
    if (!this.device) {
      throw new NFCError('デバイスが初期化されていません', NFCErrorCode.CONNECTION_FAILED);
    }

    try {
      console.log('受信待機中:', length);
      const data = await this.device.transferIn(this.deviceEp.in, length);
      await sleep(10);

      const arr: number[] = [];
      const arrStr: string[] = [];
      
      for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
        const byte = data.data.getUint8(i);
        arr.push(byte);
        arrStr.push(dec2HexString(byte));
      }
      
      console.log('受信データ:', arrStr);
      return arr;
    } catch (error) {
      throw new NFCError('データ受信に失敗しました', NFCErrorCode.UNKNOWN_ERROR, error as Error);
    }
  }

  // IDm形式の検証
  private isValidIdm(idm: string): boolean {
    // IDmは16桁のHEX文字列（スペース区切り）かどうかをチェック
    const idmPattern = /^[0-9A-F]{2}( [0-9A-F]{2}){7}$/;
    return idmPattern.test(idm);
  }

  // リソースクリーンアップ
  private async cleanup(): Promise<void> {
    this.state.isConnected = false;
    this.state.isReading = false;
    
    if (this.device) {
      try {
        await this.device.close();
      } catch (error) {
        console.warn('デバイスクローズ時にエラーが発生しました:', error);
      }
      this.device = null;
    }
    
    this.seqNumber = 0;
    console.log('NFCリーダーのリソースをクリーンアップしました');
  }
}

// 従来の関数型インターフェース（後方互換性のため）
export async function getIDmStr(navigator: Navigator): Promise<string> {
  const reader = new NFCReader();
  try {
    await reader.connect();
    return await reader.readIDm();
  } finally {
    await reader.disconnect();
  }
}