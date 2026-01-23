
import React, { useState, useRef, useEffect } from 'react';
import { UserMemo } from '../types';

interface MemoSectionProps {
  initialMemo?: UserMemo;
  onSave: (memo: UserMemo) => void;
  onDelete: () => void;
}

export const MemoSection: React.FC<MemoSectionProps> = ({ initialMemo, onSave, onDelete }) => {
  const [text, setText] = useState(initialMemo?.text || '');
  const [image, setImage] = useState(initialMemo?.imageUrl || '');
  const [isCollapsed, setIsCollapsed] = useState(!!initialMemo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update internal state if initialMemo changes (e.g., when switching questions)
  useEffect(() => {
    setText(initialMemo?.text || '');
    setImage(initialMemo?.imageUrl || '');
    setIsCollapsed(!!initialMemo);
  }, [initialMemo]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!text && !image) return;
    onSave({
      text,
      imageUrl: image,
      timestamp: Date.now(),
    });
    setIsCollapsed(true);
  };

  const handleDelete = () => {
    if (window.confirm('確定要刪除這則筆記嗎？')) {
      onDelete();
      setText('');
      setImage('');
      setIsCollapsed(false);
    }
  };

  if (isCollapsed && initialMemo) {
    return (
      <div className="mt-6 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/50">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-indigo-800 flex items-center text-sm">
            <span className="mr-2">💡</span> 已有存檔筆記
          </h4>
          <button 
            onClick={() => setIsCollapsed(false)}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            查看並編輯
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 p-5 border rounded-2xl bg-slate-50 space-y-4 shadow-inner">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-slate-700 flex items-center">
          <span className="mr-2">📝</span> 我的解題筆記
        </h4>
        {initialMemo && (
          <button 
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            刪除筆記
          </button>
        )}
      </div>
      
      <textarea
        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 text-sm bg-white"
        placeholder="在此輸入您的法律見解、法條關鍵字..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      {image && (
        <div className="relative group inline-block">
          <img src={image} alt="Memo" className="max-h-48 rounded-xl border shadow-md" />
          <button 
            onClick={() => setImage('')}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <div className="flex space-x-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-500 text-sm font-medium hover:text-indigo-600 flex items-center transition-colors"
          >
            <span className="mr-1">📷</span> 附件照片
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageChange}
          />
        </div>
        <div className="space-x-2">
          {initialMemo && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            儲存筆記
          </button>
        </div>
      </div>
    </div>
  );
};
