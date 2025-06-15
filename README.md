# NFC RC-S300 Reader 🔍

TypeScript対応のNFCカードリーダーアプリケーション。SONY RC-S300 USB NFCリーダーを使用してFeliCa IDmを読み取ります。

## 📋 概要

このプロジェクトは、WebUSB APIを使用してRC-S300 NFCリーダーからIDm（FeliCaカードの固有ID）を読み取るNext.jsアプリケーションです。ワンクリック読み取りと連続ポーリング機能の両方を提供します。

## ✨ 機能

- 🚀 **ワンクリック読み取り**: ボタンクリックでIDmを即座に取得
- 🔄 **自動ポーリング**: 2秒間隔での連続的なIDm監視
- 🔒 **TypeScript型安全性**: 完全な型定義でコンパイル時エラー検出
- 🎯 **詳細なエラーハンドリング**: 分類されたエラーコードと明確なメッセージ
- 📱 **レスポンシブUI**: モダンなTailwind CSSデザイン
- 🧹 **メモリリーク防止**: 適切なリソース管理とクリーンアップ

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **API**: WebUSB API
- **ハードウェア**: SONY RC-S300/RC-S380 NFCリーダー

## 📦 インストール

### 前提条件

- Node.js 18+
- SONY RC-S300またはRC-S380 NFCリーダー
- Chrome系ブラウザ（WebUSB API対応）
- HTTPS環境（本番環境の場合）

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/your-username/nfc-rcs300-typescript.git
cd nfc-rcs300-typescript

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

アプリケーションは `http://localhost:3000` で利用できます。

## 🔧 使用方法

### 基本的な使い方

1. **デバイス接続**: RC-S300をUSBポートに接続
2. **ブラウザでアクセス**: Chrome系ブラウザでアプリを開く
3. **デバイス選択**: 初回使用時にUSBデバイスの許可を与える
4. **IDm読み取り**: 
   - **1回読み取り**: ボタンクリックで即座に読み取り
   - **ポーリング開始**: 連続監視モードで自動読み取り

### ライブラリとしての使用

```typescript
import { NFCReader, getIDmStr } from '@/lib/nfc';

// 従来の関数型インターフェース
async function singleRead() {
  try {
    const idm = await getIDmStr(navigator);
    console.log('読み取ったIDm:', idm);
  } catch (error) {
    console.error('エラー:', error);
  }
}

// クラスベースのインターフェース
async function advancedUsage() {
  const reader = new NFCReader({ pollingInterval: 1000 });
  
  try {
    await reader.connect();
    
    // ポーリング開始
    reader.startPolling(
      (idm) => console.log('IDm:', idm),
      (error) => console.error('エラー:', error)
    );
    
    // 10秒後に停止
    setTimeout(() => {
      reader.stopPolling();
      reader.disconnect();
    }, 10000);
  } catch (error) {
    console.error('接続エラー:', error);
  }
}
```

## 📁 プロジェクト構造

```
├── app/                    # Next.js App Router
│   ├── page.tsx           # メインページ
│   ├── layout.tsx         # レイアウト
│   └── globals.css        # グローバルスタイル
├── lib/                   # ライブラリコード
│   └── nfc/              # NFC関連モジュール
│       ├── index.ts       # メインエクスポート
│       ├── nfc-reader.ts  # NFCReaderクラス
│       ├── types.ts       # 型定義
│       ├── device-config.ts # デバイス設定
│       └── utils.ts       # ユーティリティ関数
├── package.json           # プロジェクト設定
└── README.md             # このファイル
```

## 🔧 APIリファレンス

### NFCReader クラス

#### コンストラクタ
```typescript
new NFCReader(options?: NFCReaderOptions)
```

#### メソッド
- `connect(): Promise<void>` - デバイスに接続
- `disconnect(): Promise<void>` - デバイスから切断
- `readIDm(): Promise<string>` - IDmを1回読み取り
- `startPolling(onIdmRead, onError?)` - ポーリング開始
- `stopPolling(): void` - ポーリング停止
- `getState(): NFCReaderState` - 現在の状態を取得

### 型定義

```typescript
interface NFCReaderOptions {
  pollingInterval?: number;  // ポーリング間隔（ms）
  maxRetries?: number;       // 最大リトライ回数
  timeout?: number;          // タイムアウト（ms）
}

interface NFCReaderState {
  isConnected: boolean;      // 接続状態
  isReading: boolean;        // 読み取り中
  error: string | null;      // エラーメッセージ
  lastRead: NFCReadResult | null; // 最後の読み取り結果
}
```

## 🎯 対応デバイス

| デバイス | Product ID | ベンダーID | 対応状況 |
|----------|------------|------------|----------|
| RC-S300  | 0x0dc8     | 0x054c     | ✅ 対応   |
| RC-S300  | 0x0dc9     | 0x054c     | ✅ 対応   |
| RC-S380  | 0x06c1     | 0x054c     | ✅ 対応   |
| RC-S380  | 0x06c3     | 0x054c     | ✅ 対応   |

## 🚨 注意事項

- **HTTPS必須**: 本番環境ではHTTPS接続が必要です
- **ブラウザ対応**: WebUSB APIをサポートするChrome系ブラウザのみ対応
- **デバイス権限**: 初回使用時にUSBデバイスへのアクセス許可が必要です
- **メモリ管理**: ポーリング使用時は適切にstopPolling()を呼び出してください

## 🐛 トラブルシューティング

### よくある問題

1. **デバイスが認識されない**
   - USBケーブルの接続を確認
   - デバイスドライバーのインストール確認
   - ブラウザの再起動を試行

2. **Permission Deniedエラー**
   - ブラウザの設定でUSBデバイスへのアクセスを許可
   - HTTPSでアクセスしているか確認

3. **読み取りエラー**
   - NFCカードがリーダーに正しく置かれているか確認
   - カードが対応フォーマット（FeliCa）か確認

## 🤝 貢献

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 🙏 謝辞

このプロジェクトは、有限会社さくらシステムの近藤秀尚氏が作成されたオリジナルのJavaScriptコードをベースに、TypeScript化と機能拡張を行ったものです。

---

**作成者**: Takashi-Matsumura
**更新日**: 2024年12月
