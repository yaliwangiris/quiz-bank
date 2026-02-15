
import React, { useState, useRef, useEffect } from 'react';
import { UserMemo } from '../types';

interface MemoSectionProps {
  questionId: string;
  memos: Record<string, UserMemo>;
  onChange: (memos: Record<string, UserMemo>) => void;
}

export const MemoSection: React.FC<MemoSectionProps> = ({ questionId, memos, onChange }) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMemo = memos[questionId];

  useEffect(() => {
    setText(currentMemo?.text || '');
    setImage(currentMemo?.imageUrl || '');
    setIsCollapsed(!!currentMemo);
    setFailedImage(false);
  }, [questionId, currentMemo]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 限制檔案大小為 1MB
      if (file.size > 1024 * 1024) {
        alert('圖片太大，請上傳小於 1MB 的圖片');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // 如果 base64 太大（>500KB字符），提示用戶
        if (result.length > 500000) {
          alert('圖片仍然較大，建議裁剪或壓縮後重新上傳');
        }
        setImage(result);
      };
      reader.onerror = () => {
        alert('圖片讀取失敗，請重試');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!text && !image) {
      alert('請輸入筆記或上傳照片');
      return;
    }
    try {
      const updatedMemos = {
        ...memos,
        [questionId]: {
          text,
          imageUrl: image,
          timestamp: Date.now(),
        }
      };
      onChange(updatedMemos);
      setIsCollapsed(true);
    } catch (error) {
      console.error('保存筆記失敗:', error);
      alert('保存筆記失敗，請檢查你的瀏覽器存儲空間');
    }
  };

  const handleDelete = () => {
    if (window.confirm('確定要刪除這則筆記嗎？')) {
      const updatedMemos = { ...memos };
      delete updatedMemos[questionId];
      onChange(updatedMemos);
      setText('');
      setImage('');
      setIsCollapsed(false);
    }
  };

  if (isCollapsed && currentMemo) {
    return (
      <div className="mt-6 p-6 border-2 border-dashed border-indigo-300 rounded-2xl bg-indigo-50">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-bold text-indigo-900 flex items-center text-sm mb-3">
              <span className="mr-2 text-lg">💡</span> 已存檔筆記
            </h4>
            {currentMemo.text && (
              <p className="text-sm text-indigo-800 mb-3 line-clamp-3">{currentMemo.text}</p>
            )}
            {currentMemo.imageUrl && !failedImage && (
              <img 
                src={currentMemo.imageUrl} 
                alt="Memo" 
                className="max-h-32 rounded-lg border shadow-sm mb-3" 
                onError={() => setFailedImage(true)}
              />
            )}
            {failedImage && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-xs mb-3">
                圖片加載失敗：可能檔案過大或已損壞
              </div>
            )}
            <div className="text-xs text-indigo-600 opacity-70">
              保存於 {new Date(currentMemo.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <button 
              onClick={() => setIsCollapsed(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1 rounded hover:bg-indigo-100 transition"
            >
              編輯
            </button>
            <button 
              onClick={handleDelete}
              className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50 transition"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 border-2 border-indigo-200 rounded-2xl bg-indigo-50/50 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-slate-800 flex items-center">
          <span className="mr-2 text-lg">📝</span> 解題筆記
        </h4>
        {currentMemo && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1 rounded hover:bg-slate-200 transition"
          >
            收起
          </button>
        )}
      </div>
      
      <textarea
        className="w-full p-4 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 text-sm bg-white focus:border-indigo-400"
        placeholder="輸入法律見解、法條關鍵字、推理過程..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      {image && (
        <div className="relative inline-block group">
          {!failedImage ? (
            <img 
              src={image} 
              alt="Memo" 
              className="max-h-40 rounded-lg border-2 border-indigo-300 shadow-md" 
              onError={() => setFailedImage(true)}
            />
          ) : (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-yellow-700 text-sm">
              圖片預覽失敗
            </div>
          )}
          {!failedImage && (
            <button 
              onClick={() => {
                setImage('');
                setFailedImage(false);
              }}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-600 text-sm font-medium hover:text-indigo-600 flex items-center transition-colors px-3 py-1 rounded hover:bg-white"
        >
          <span className="mr-1">📷</span> 添加照片
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageChange}
        />
        <div className="space-x-2">
          {currentMemo && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              刪除筆記
            </button>
          )}
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            儲存筆記
          </button>
        </div>
      </div>
    </div>
  );
};
