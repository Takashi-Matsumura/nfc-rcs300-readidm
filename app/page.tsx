"use client";

import { useState, useEffect, useRef } from "react";
import { NFCReader, NFCError, NFCReaderState } from "@/lib/nfc";

export default function Home() {
  const [idm, setIdm] = useState<string | undefined>(undefined);
  const [state, setState] = useState<NFCReaderState>({
    isConnected: false,
    isReading: false,
    error: null,
    lastRead: null
  });
  const [isPolling, setIsPolling] = useState(false);
  const readerRef = useRef<NFCReader | null>(null);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.disconnect();
      }
    };
  }, []);

  // 1回読み取り
  const handleSingleRead = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const reader = new NFCReader();
      await reader.connect();
      const result = await reader.readIDm();
      
      setIdm(result);
      console.log("IDm読み取り完了:", result);
      
      await reader.disconnect();
    } catch (error) {
      const errorMessage = error instanceof NFCError ? error.message : 'IDm読み取りに失敗しました';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error("IDm読み取りエラー:", error);
    }
  };

  // ポーリング開始
  const handleStartPolling = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const reader = new NFCReader({ pollingInterval: 2000 }); // 2秒間隔
      readerRef.current = reader;
      
      await reader.connect();
      setState(reader.getState());
      
      reader.startPolling(
        (idm) => {
          setIdm(idm);
          setState(reader.getState());
          console.log("ポーリングでIDm取得:", idm);
        },
        (error) => {
          setState(prev => ({ ...prev, error: error.message }));
          console.error("ポーリングエラー:", error);
        }
      );
      
      setIsPolling(true);
    } catch (error) {
      const errorMessage = error instanceof NFCError ? error.message : 'ポーリング開始に失敗しました';
      setState(prev => ({ ...prev, error: errorMessage }));
      console.error("ポーリング開始エラー:", error);
    }
  };

  // ポーリング停止
  const handleStopPolling = async () => {
    if (readerRef.current) {
      readerRef.current.stopPolling();
      await readerRef.current.disconnect();
      readerRef.current = null;
    }
    setIsPolling(false);
    setState({
      isConnected: false,
      isReading: false,
      error: null,
      lastRead: null
    });
  };

  return (
    <div className="container m-auto p-4">
      <div className="flex flex-col h-screen items-center justify-center gap-6">
        <h1 className="text-2xl font-bold text-center">NFC IDm リーダー</h1>
        
        {/* 状態表示 */}
        <div className="text-center space-y-2">
          <div className="flex gap-4 justify-center text-sm">
            <span className={`px-2 py-1 rounded ${state.isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {state.isConnected ? '接続済み' : '未接続'}
            </span>
            <span className={`px-2 py-1 rounded ${state.isReading ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
              {state.isReading ? '読み取り中' : '待機中'}
            </span>
            {isPolling && (
              <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                ポーリング中
              </span>
            )}
          </div>
          
          {state.error && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded border">
              エラー: {state.error}
            </div>
          )}
        </div>

        {/* コントロールボタン */}
        <div className="flex gap-4">
          <button
            onClick={handleSingleRead}
            disabled={state.isReading || isPolling}
            className="bg-blue-600 border-2 border-blue-700 rounded-lg text-white px-6 py-3 hover:bg-blue-700 disabled:bg-gray-400 disabled:border-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            1回読み取り
          </button>
          
          {!isPolling ? (
            <button
              onClick={handleStartPolling}
              disabled={state.isReading}
              className="bg-green-600 border-2 border-green-700 rounded-lg text-white px-6 py-3 hover:bg-green-700 disabled:bg-gray-400 disabled:border-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              ポーリング開始
            </button>
          ) : (
            <button
              onClick={handleStopPolling}
              className="bg-red-600 border-2 border-red-700 rounded-lg text-white px-6 py-3 hover:bg-red-700 transition-colors"
            >
              ポーリング停止
            </button>
          )}
        </div>

        {/* IDm表示 */}
        <div className="text-center">
          {idm ? (
            <div className="bg-gray-100 p-4 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">読み取ったIDm:</p>
              <p className="text-xl font-mono font-bold">{idm}</p>
              {state.lastRead && (
                <p className="text-xs text-gray-500 mt-2">
                  {state.lastRead.timestamp.toLocaleString('ja-JP')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">IDmがまだ読み取られていません</p>
          )}
        </div>

        {/* 使用方法 */}
        <div className="text-center text-sm text-gray-600 max-w-md">
          <p className="mb-2">【使用方法】</p>
          <ul className="text-left space-y-1">
            <li>• <strong>1回読み取り</strong>: ボタンクリックでその場でIDmを読み取ります</li>
            <li>• <strong>ポーリング</strong>: 2秒間隔で自動的にIDmを読み取り続けます</li>
          </ul>
          <p className="mt-2 text-xs">※ RC-S300 NFCリーダーをUSBで接続してください</p>
        </div>
      </div>
    </div>
  );
}
