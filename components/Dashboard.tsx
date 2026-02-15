
import React, { useState } from 'react';
import { UserStats, Subject, UserMemo } from '../types';

interface DashboardProps {
  stats: UserStats;
  memos?: Record<string, UserMemo>;
  onBack: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, memos = {}, onBack }) => {
  const [expandedMemo, setExpandedMemo] = useState<string | null>(null);
  const [showAllMemos, setShowAllMemos] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  const handleImageError = (memoId: string) => {
    setFailedImages(prev => new Set([...prev, memoId]));
  };

  const accuracy = stats.totalAnswered > 0 
    ? Math.round((stats.correctCount / stats.totalAnswered) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mb-16">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter mb-4">學習數據總覽</h2>
          <p className="text-slate-500 text-lg font-medium uppercase tracking-[0.2em]">Personal Legal Performance Analysis</p>
        </div>
        <button 
          onClick={onBack}
          className="bg-slate-900 text-white px-10 py-5 rounded-full font-black text-xs tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
        >
          回到戰略中心 →
        </button>
      </header>

      <div className="grid lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl flex flex-col items-center justify-center text-center">
          <div className="text-indigo-600 text-7xl font-black mb-4 tabular-nums">{stats.totalAnswered}</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">總答題數</div>
        </div>
        <div className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl flex flex-col items-center justify-center text-center">
          <div className="text-indigo-600 text-7xl font-black mb-4 tabular-nums">{accuracy}%</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">平均正確率</div>
        </div>
        <div className="bg-indigo-900 p-10 rounded-[4rem] shadow-2xl flex flex-col items-center justify-center text-center text-white">
          <div className="text-amber-400 text-7xl font-black mb-4 tabular-nums">{stats.dailyStreak}</div>
          <div className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">連續學習天數</div>
        </div>
        <div className="bg-white p-10 rounded-[4rem] border-2 border-slate-50 shadow-xl flex flex-col items-center justify-center text-center">
          <div className="text-indigo-600 text-7xl font-black mb-4 tabular-nums">{stats.maxStreak}</div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">最高連續答對</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <section className="bg-white p-16 rounded-[5rem] border-2 border-slate-50 shadow-2xl">
          <h3 className="text-2xl font-black text-slate-900 mb-12 flex items-center">
            <span className="mr-4 text-3xl">⚖️</span> 各科正確率分佈
          </h3>
          <div className="space-y-10">
            {Object.values(Subject).map((sub) => {
              const s = stats.subjectStats[sub] || { total: 0, correct: 0 };
              const subAcc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={sub} className="group">
                  <div className="flex justify-between items-end mb-4 px-2">
                    <span className="font-black text-slate-800 text-sm tracking-tight">{sub}</span>
                    <span className="font-mono text-xs text-slate-400">{s.correct} / {s.total}</span>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-1000 group-hover:bg-indigo-400" 
                      style={{ width: `${subAcc}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[10px] font-black text-indigo-600 tracking-widest">{subAcc}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-12">
          <section className="bg-slate-900 p-16 rounded-[5rem] text-white shadow-4xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 text-indigo-500 opacity-20 text-9xl font-black">📈</div>
            <h3 className="text-2xl font-black mb-10 relative z-10">最近測驗趨勢</h3>
            <div className="space-y-8 relative z-10">
              {stats.history.length === 0 && <p className="text-indigo-300 font-bold opacity-60">尚無測驗紀錄，開始您的第一場練習吧！</p>}
              {stats.history.slice(-5).reverse().map((h, i) => (
                <div key={i} className="flex justify-between items-center p-6 bg-slate-800 rounded-3xl border border-slate-700 hover:border-indigo-400 transition-all group">
                  <div>
                    <div className="text-xs font-black text-indigo-400 mb-1 uppercase tracking-widest">{h.category}</div>
                    <div className="text-[10px] text-slate-500 font-black">{new Date(h.date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-3xl font-black text-white tabular-nums group-hover:text-indigo-400 transition-colors">
                    {h.score}<span className="text-[10px] text-slate-500 ml-1">/ {h.totalPossible}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-gradient-to-br from-indigo-50 to-blue-50 p-16 rounded-[5rem] border-2 border-indigo-200 shadow-xl">
            <h3 className="text-2xl font-black text-indigo-900 mb-10 flex items-center justify-between">
              <span className="flex items-center">
                <span className="mr-3 text-3xl">📝</span> 筆記庫 ({Object.keys(memos).length})
              </span>
              {Object.keys(memos).length > 0 && (
                <button 
                  onClick={() => setShowAllMemos(!showAllMemos)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg hover:bg-white transition-all"
                >
                  {showAllMemos ? '收起全部' : '查看全部'}
                </button>
              )}
            </h3>
            {Object.keys(memos).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-indigo-600 font-bold">尚無筆記</p>
                <p className="text-indigo-500 text-sm">在答題時儲存筆記，管理學習重點</p>
              </div>
            ) : (
              <div className="space-y-4">
                {showAllMemos ? (
                  // 展示全部筆記
                  <div className="max-h-[600px] overflow-y-auto">
                    {Object.entries(memos).reverse().map(([id, memo]) => (
                      <div 
                        key={id} 
                        className="p-5 bg-white rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 transition-all cursor-pointer"
                        onClick={() => setExpandedMemo(expandedMemo === id ? null : id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-white bg-indigo-600 px-3 py-1 rounded-lg">
                            {id}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(memo.timestamp).toLocaleString()}
                          </span>
                          <span className="text-lg text-indigo-600">
                            {expandedMemo === id ? '▼' : '▶'}
                          </span>
                        </div>
                        
                        {memo.text && (
                          <p className={`text-sm text-slate-800 font-medium ${expandedMemo === id ? '' : 'line-clamp-2'}`}>
                            {memo.text}
                          </p>
                        )}
                        
                        {expandedMemo === id && memo.imageUrl && (
                          <div className="mt-4 pt-4 border-t border-indigo-200">
                            {!failedImages.has(id) ? (
                              <img 
                                src={memo.imageUrl} 
                                alt="Note" 
                                className="max-w-full rounded-lg border shadow-md" 
                                onError={() => handleImageError(id)}
                              />
                            ) : (
                              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                                圖片加載失敗：可能檔案過大或已損壞
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // 展示最近 5 筆筆記
                  <div className="max-h-80 overflow-y-auto">
                    {Object.entries(memos).slice(-5).reverse().map(([id, memo]) => (
                      <div 
                        key={id} 
                        className="p-4 bg-white rounded-2xl border border-indigo-200 hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer mb-3"
                        onClick={() => setExpandedMemo(expandedMemo === id ? null : id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                            {id}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(memo.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {memo.text && (
                          <p className="text-sm text-slate-800 mb-2 line-clamp-2 font-medium">{memo.text}</p>
                        )}
                        {memo.imageUrl && !failedImages.has(id) && (
                          <img 
                            src={memo.imageUrl} 
                            alt="Note" 
                            className="max-h-20 rounded border" 
                            onError={() => handleImageError(id)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="bg-indigo-50 p-16 rounded-[5rem] border-2 border-indigo-100 shadow-xl mt-12">
        <h3 className="text-2xl font-black text-indigo-900 mb-8">導師分析</h3>
        <p className="text-lg font-bold leading-relaxed text-indigo-700">
          {accuracy > 80 ? '您的法律邏輯非常扎實，建議開始挑戰全真模擬試卷以維持題感。' : 
           accuracy > 60 ? '表現穩健，但特定學說見解仍有強化空間，建議針對正確率低於 70% 的科目進行專科練習。' : 
           stats.totalAnswered > 0 ? '目前法感尚在磨練中，建議先從基礎條文下手，並多看專家解析中的法源依據。' : 
           '歡迎來到考題專家系統，我們準備好與您一起征服律師國考。'}
        </p>
      </section>
    </div>
  );
};
