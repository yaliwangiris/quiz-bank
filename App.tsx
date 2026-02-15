import React, { useState, useEffect, useCallback } from 'react';
import { Subject, Category, Question, QuizState, UserStats, SESSION_METADATA } from './types';
import { GeminiService } from './geminiService';
import { triggerFireworks, CryingCat } from './components/Fireworks';
import { MemoSection } from './components/MemoSection';
import { Dashboard } from './components/Dashboard';

const gemini = new GeminiService();

  // 💾 規範化題庫格式函數
const normalizeQuestions = (questions: any[]): any[] => {
  return questions.map((q: any) => {
    if (!q.presented_choices && q.choices) {
      const choiceLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      q.presented_choices = q.choices.map((choice: any, idx: number) => ({
        label: choiceLabels[idx] || String(idx + 1),
        choice_id: choice.choice_id,
        text: choice.text
      }));
    }
    return q;
  });
};
  const INITIAL_STATS: UserStats = { 
  totalAnswered: 0, 
  correctCount: 0, 
  currentStreak: 0, 
  maxStreak: 0, 
  dailyStreak: 0, 
  subjectStats: {}, 
  history: [] 
};

export default function App() {
  const [bank, setBank] = useState<any[]>([]);
  // ✅ 只保留一個 useEffect 來載入題庫
  useEffect(() => {
    const loadBankFromPublic = async () => {
      try {
        const base = import.meta.env.BASE_URL || "/";
        const manifestUrl = `${base}bank/manifest.json`;

        console.log("[bank] Loading manifest from:", manifestUrl);

        const manifestRes = await fetch(manifestUrl, { cache: "no-store" });
        if (!manifestRes.ok) {
          throw new Error(`manifest fetch failed: ${manifestRes.status} ${manifestRes.statusText}`);
        }

        const manifest = await manifestRes.json();
        const files: string[] = manifest.files || [];

        if (!files.length) {
          console.warn("manifest has no files");
          setBank([]);
          return;
        }

        console.log("[bank] Loading files:", files.length, "total");

        const all = await Promise.allSettled(
          files.map(async (f) => {
            const url = `${base}bank/${f}`;
            console.log("[bank] Fetching:", url);
            const r = await fetch(url, { cache: "no-store" });
            if (!r.ok) throw new Error(`file_not_found: ${f} (${r.status})`);
            return r.json();
          })
        );

        // 處理可能是陣列或物件的情況，以及 Promise 結果
        const results = all
          .filter((p) => p.status === 'fulfilled')
          .map((p) => (p as PromiseSettledResult<any>).value);
        
        const flattened = results.flatMap((x: any) => Array.isArray(x) ? x : [x]);

        const normalized = normalizeQuestions(flattened);
        console.log("[bank] ✅ Loaded questions:", normalized.length, "from", results.length, "files");
        setBank(normalized);
        gemini.setBank(normalized); // 立即設定到 gemini service
      } catch (e) {
        console.error("[bank] ❌ Load failed:", e);
        setBank([]);
        alert("題庫載入失敗：請確認 public/bank/manifest.json 與題庫檔案已上傳。\n\n" + (e as Error).message);
      }
    };

    loadBankFromPublic();
  }, []);

  // ✅ 當 bank 更新時，同步到 gemini service
  useEffect(() => {
    if (bank.length > 0) {
      gemini.setBank(bank);
      console.log("[bank] Synced to gemini service:", bank.length, "questions");
    }
  }, [bank]);

  const [correctMap, setCorrectMap] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<'NONE' | 'CORRECT' | 'WRONG'>('NONE');
  const [explanation, setExplanation] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [currentCorrectIds, setCurrentCorrectIds] = useState<string[]>([]);

  const [searchYear, setSearchYear] = useState('108');
  const [searchCode, setSearchCode] = useState('1301');
  const [searchNo, setSearchNo] = useState('1');
  const [searchId, setSearchId] = useState('108-1301-001');
  const [simpleMode, setSimpleMode] = useState(false);
  // 考試方向 mapping（按使用者要求）
  const EXAM_DIRECTIONS: { code: string; label: string }[] = [
    { code: '1301', label: '綜合法學一（刑法、刑事訴訟法、法律倫理）' },
    { code: '2301', label: '綜合法學一（憲法、行政法、國際公法、國際私法）' },
    { code: '3301', label: '綜合法學二（民法、民事訴訟法）' },
    { code: '4301', label: '綜合法學二（公司法、保險法、票據法、證券交易法、強制執行法、法學英文）' },
  ];

  const [state, setState] = useState<QuizState>(() => {
    const savedMemos = localStorage.getItem('law_quiz_memos');
    const savedStats = localStorage.getItem('law_quiz_stats');
    let stats: UserStats = savedStats ? JSON.parse(savedStats) : INITIAL_STATS;

    const today = new Date().setHours(0, 0, 0, 0);
    const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate).setHours(0, 0, 0, 0) : null;
    
    if (lastActive) {
      const diff = (today - lastActive) / (1000 * 60 * 60 * 24);
      if (diff === 1) stats.dailyStreak += 1;
      else if (diff > 1) stats.dailyStreak = 1;
    } else {
      stats.dailyStreak = 1;
    }
    stats.lastActiveDate = Date.now();

    return {
      mode: 'IDLE',
      questions: [],
      currentIndex: 0,
      score: 0,
      answers: {},
      memos: savedMemos ? JSON.parse(savedMemos) : {},
      status: 'IDLE',
      stats,
    };
  });

  // 上傳題庫功能已移除，題庫僅由後端/靜態 public 匯入

  const forceResetToHome = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setFeedback('NONE');
    setExplanation('');
    setLoadingAction(false);
    setCurrentCorrectIds([]);
    setCorrectMap({});
    
    setState(prev => ({
      ...prev,
      status: 'IDLE',
      mode: 'IDLE',
      questions: [],
      currentIndex: 0,
      score: 0,
      answers: {},
      category: undefined,
      summaryText: undefined
    }));
  }, []);

  useEffect(() => {
    localStorage.setItem('law_quiz_memos', JSON.stringify(state.memos));
    localStorage.setItem('law_quiz_stats', JSON.stringify(state.stats));
  }, [state.memos, state.stats]);

  const handleExit = () => {
    if (window.confirm('確定要結束目前的測驗並返回首頁嗎？')) {
      forceResetToHome();
    }
  };

  const handleRetrieveQuestion = async (byId: boolean = false) => {
    if (bank.length === 0) {
      alert("題庫尚未載入完成，請稍候再試。");
      return;
    }

    setState(prev => ({ ...prev, status: 'LOADING' }));
    try {
      const q = byId 
        ? await gemini.retrieveByQuestionId(searchId)
        : await gemini.retrieveSpecificQuestion(searchYear, searchCode, searchNo);

      if (q) {
        setCorrectMap({});
        setState(prev => ({
          ...prev,
          questions: [q],
          status: 'QUIZ',
          currentIndex: 0,
          score: 0,
          answers: {},
          mode: 'SUBJECT_PRACTICE'
        }));
      } else {
        alert("找不到指定真題，請確認 ID 或年度/代碼/題號是否正確。");
        forceResetToHome();
      }
    } catch (err) {
      alert("檢索失敗。");
      forceResetToHome();
    }
  };

  const startPractice = async (subject: string | Subject) => {
    if (bank.length === 0) {
      alert("題庫尚未載入完成，請稍候再試。");
      return;
    }
    setState(prev => ({ ...prev, status: 'LOADING', mode: 'SUBJECT_PRACTICE' }));
    try {
      const subjectCode = String(subject);
      const qs = await gemini.fetchQuestions('SUBJECT', subjectCode);
      if (!qs.length) {
        alert(`目前題庫中無「${subjectCode}」的題目。\n\n目前題庫共有 ${bank.length} 題，請確認是否包含此科目。`);
        forceResetToHome();
        return;
      }
      setState(prev => ({ ...prev, questions: qs, status: 'QUIZ', currentIndex: 0, score: 0, answers: {} }));
    } catch (err) {
      console.error(err);
      alert("載入失敗。");
      forceResetToHome();
    }
  };

  const startMockExam = async (cat: Category) => {
    if (bank.length === 0) {
      alert("題庫尚未載入完成，請稍候再試。");
      return;
    }

    setState(prev => ({ ...prev, status: 'LOADING', mode: 'MOCK_EXAM', category: cat }));
    try {
      const qs = await gemini.fetchQuestions('MOCK', cat);
      if (!qs.length) {
        alert(`目前題庫中無「${cat}」相關科目的題目。\n\n目前題庫共有 ${bank.length} 題。`);
        forceResetToHome();
        return;
      }
      setState(prev => ({ ...prev, questions: qs, status: 'QUIZ', currentIndex: 0, score: 0, answers: {} }));
    } catch (err) {
      console.error(err);
      alert("生成失敗。");
      forceResetToHome();
    }
  };

  const handleSelectOption = async (optionId: string) => {
    const currentQ = state.questions[state.currentIndex];
    if (!currentQ || state.answers[currentQ.id] || loadingAction) return;

    setLoadingAction(true);
    try {
      const result = await gemini.gradeAnswer(currentQ, optionId);
      setCurrentCorrectIds(result.correctChoiceIds);
      setExplanation(result.explanation);
      setFeedback(result.isCorrect ? 'CORRECT' : 'WRONG');
      setCorrectMap(prev => ({ ...prev, [currentQ.id]: result.correctChoiceIds }));

      if (result.isCorrect) triggerFireworks();

      setState(prev => {
        const subStat = prev.stats.subjectStats[currentQ.subject] || { total: 0, correct: 0 };
        return {
          ...prev,
          answers: { ...prev.answers, [currentQ.id]: optionId },
          score: result.isCorrect ? prev.score + currentQ.weight : prev.score,
          stats: {
            ...prev.stats,
            totalAnswered: prev.stats.totalAnswered + 1,
            correctCount: prev.stats.correctCount + (result.isCorrect ? 1 : 0),
            currentStreak: result.isCorrect ? prev.stats.currentStreak + 1 : 0,
            maxStreak: Math.max(prev.stats.maxStreak, result.isCorrect ? prev.stats.currentStreak + 1 : 0),
            subjectStats: {
              ...prev.stats.subjectStats,
              [currentQ.subject]: { total: subStat.total + 1, correct: subStat.correct + (result.isCorrect ? 1 : 0) }
            }
          }
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  const finishQuiz = async () => {
    setState(prev => ({ ...prev, status: 'LOADING' }));
    const totalPossible = state.questions.reduce((acc, q) => acc + q.weight, 0);
    
    const summary = await gemini.getExamSummary(state.questions.map(q => ({
      id: q.id,
      isCorrect: (correctMap[q.id] || []).includes(state.answers[q.id]),
      subject: q.subject
    })));

    setState(prev => ({
      ...prev,
      status: 'RESULT',
      summaryText: summary,
      stats: {
        ...prev.stats,
        history: [...prev.stats.history, { 
          date: Date.now(), 
          score: state.score, 
          totalPossible,
          category: prev.mode === 'MOCK_EXAM' ? prev.category! : '專科強化'
        }]
      }
    }));
  };

  const nextQuestion = () => {
    setFeedback('NONE');
    setExplanation('');
    setCurrentCorrectIds([]);
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      finishQuiz();
    }
  };

  if (state.status === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="w-24 h-24 border-[12px] border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-10 shadow-xl"></div>
        <p className="text-indigo-900 font-black text-2xl tracking-[0.3em] uppercase animate-pulse">律師專家諮詢中...</p>
      </div>
    );
  }

  if (state.status === 'DASHBOARD') return <Dashboard stats={state.stats} memos={state.memos} onBack={forceResetToHome} />;

  if (state.status === 'IDLE') {
    if (simpleMode) {
      return (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <header className="text-center mb-8">
            <h1 className="text-6xl font-black text-slate-900 mb-4">律師一試 - 簡化檢視</h1>
            <div className="mb-4">
              <button onClick={() => setSimpleMode(false)} className="px-6 py-2 bg-slate-900 text-white rounded-full">切換完整介面</button>
            </div>
            <div className="mt-6 bg-white p-6 rounded-xl shadow">
              <div className="mb-2 font-black">題庫題數： <span className="text-indigo-600">{bank.length}</span></div>
              <div className="text-sm text-slate-500 mb-4">題庫由後端匯入；點選下方方向開始對應練習或檢索題目</div>
              <div className="flex flex-col sm:flex-row gap-3">
                {EXAM_DIRECTIONS.map(d => (
                  <button key={d.code} onClick={() => startPractice(d.code)} className="px-4 py-2 bg-indigo-600 text-white rounded">{d.code} — {d.label}</button>
                ))}
              </div>
            </div>
          </header>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-bold mb-4">題庫前 30 題（Question ID）</h2>
            <div className="grid grid-cols-1 gap-2">
              {bank.slice(0, 30).map((q: any) => (
                <div key={q.question_id} className="flex items-center justify-between p-3 border rounded">
                  <div className="font-mono">{q.question_id}</div>
                  <div className="space-x-2">
                    <button onClick={() => { setSearchId(q.question_id); handleRetrieveQuestion(true); }} className="px-3 py-1 bg-indigo-600 text-white rounded">檢索</button>
                    <button onClick={() => { setSearchYear(String(q.year)); setSearchCode(String(q.subject_code)); setSearchNo(String(q.question_no)); handleRetrieveQuestion(false); }} className="px-3 py-1 bg-slate-200 rounded">以 Metadata 檢索</button>
                  </div>
                </div>
              ))}
              {bank.length === 0 && <div className="text-rose-500 font-bold">目前題庫為空（請上傳或確認 manifest）</div>}
            </div>
          </section>
        </div>
      );
    }
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 animate-in fade-in duration-700">
        <header className="text-center mb-16 relative">
          <button onClick={() => setState(s => ({ ...s, status: 'DASHBOARD' }))} className="absolute top-0 right-0 p-4 bg-white rounded-3xl border shadow-lg hover:scale-105 transition-all group">
            <span className="text-2xl">📊</span>
            <span className="text-[10px] font-black uppercase ml-2 text-slate-400 group-hover:text-indigo-600">戰力分析</span>
          </button>
          <h1 className="text-9xl font-black text-slate-900 mb-10 tracking-tighter leading-none">律師一試<br/><span className="text-indigo-600">考題專家</span></h1>
          <div className="mt-6 text-center">
            {bank.length > 0 ? (
              <div className="text-xl font-black text-emerald-600">✓ 題庫已載入: {bank.length} 題</div>
            ) : (
              <div className="text-xl font-black text-rose-500 animate-pulse">⏳ 題庫載入中...</div>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-16">
            <section className="bg-slate-900 rounded-[5rem] p-16 text-white shadow-4xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 text-indigo-500 opacity-10 text-9xl font-black">⚖️</div>
              <h2 className="text-xl font-black mb-12 flex items-center">
                <span className="w-3 h-3 rounded-full bg-indigo-500 mr-4"></span>
                真題精確檢索系統
              </h2>
              
              <div className="mb-12 p-8 bg-slate-800 rounded-3xl border border-slate-700">
                <label className="text-[10px] font-black text-indigo-400 uppercase mb-4 block">按 Question ID 搜尋</label>
                <div className="flex gap-4">
                  <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="例如: 108-1301-001" className="flex-1 bg-slate-700 border-2 border-slate-600 rounded-3xl p-5 text-xl font-black focus:border-indigo-500 outline-none placeholder:text-slate-500" />
                  <button onClick={() => handleRetrieveQuestion(true)} disabled={bank.length === 0} className="bg-indigo-600 px-10 rounded-3xl font-black hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">檢索</button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">年度</label>
                  <input type="text" value={searchYear} onChange={e => setSearchYear(e.target.value)} placeholder="108" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center font-black focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">科目代碼</label>
                  <input type="text" value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="1301" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center font-black focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">題號</label>
                  <input type="text" value={searchNo} onChange={e => setSearchNo(e.target.value)} placeholder="1" className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-center font-black focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <button onClick={() => handleRetrieveQuestion(false)} disabled={bank.length === 0} className="w-full bg-slate-700 py-6 rounded-3xl font-black text-lg border-2 border-indigo-900/50 hover:bg-indigo-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">由 Metadata 定位題目</button>
            </section>

            <div className="space-y-10">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest border-b-4 border-slate-100 pb-4">全真模擬測驗</h2>
              <div className="grid md:grid-cols-2 gap-10">
                {Object.keys(Category).map(key => {
                   const cat = Category[key as keyof typeof Category];
                   return (
                    <button key={cat} onClick={() => startMockExam(cat)} disabled={bank.length === 0} className="bg-white border-2 border-slate-100 p-14 rounded-[5rem] text-left hover:border-indigo-600 transition-all shadow-xl hover:shadow-4xl group disabled:opacity-50 disabled:cursor-not-allowed">
                      <h3 className="text-2xl font-black mb-6 group-hover:text-indigo-600 transition-colors">{cat}</h3>
                      <div className="text-[10px] font-bold bg-slate-100 text-slate-400 px-4 py-1.5 rounded-full inline-block uppercase tracking-widest">300 Points Mock</div>
                    </button>
                   );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-12">
            <div className="bg-indigo-600 rounded-[5rem] p-16 text-white shadow-4xl relative overflow-hidden group cursor-pointer" onClick={() => setState(s => ({ ...s, status: 'DASHBOARD' }))}>
              <h3 className="text-2xl font-black mb-4">數據總結</h3>
              <p className="text-indigo-100 font-bold mb-8">分析各科目正確率，定位學習弱點。</p>
              <div className="bg-white/20 px-8 py-3 rounded-full inline-block font-black text-[10px] tracking-widest uppercase">Go to Dashboard</div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (state.status === 'QUIZ') {
    const currentQ = state.questions[state.currentIndex];
    if (!currentQ) return null;
    const answered = !!state.answers[currentQ.id];

    return (
      <div className="max-w-5xl mx-auto px-6 py-16 pb-48 animate-in fade-in duration-500">
        <nav className="flex justify-between items-center mb-16">
          <button onClick={handleExit} className="group flex items-center space-x-4 text-slate-900 font-black px-10 py-5 rounded-full bg-white border-2 border-slate-100 shadow-xl hover:text-rose-600 transition-all active:scale-95">
            <span className="text-2xl">✕</span>
            <span className="text-xs tracking-widest">返回主畫面</span>
          </button>
          <div className="px-10 py-5 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl">
            {state.currentIndex + 1} / {state.questions.length}
          </div>
        </nav>

        <article className="bg-white rounded-[6rem] p-20 shadow-4xl border-2 border-slate-50 relative mb-16 overflow-hidden">
          <div className="absolute top-0 left-0 px-16 py-8 bg-slate-900 text-white font-black rounded-br-[4rem] text-sm tracking-widest uppercase shadow-2xl">
            真題：民國 {currentQ.year} 年度 第 {currentQ.question_no} 題
          </div>

          <div className="mt-24 mb-12 flex items-center space-x-6">
            <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
            <span className="text-indigo-600 font-black uppercase tracking-widest">{currentQ.subject} (代碼: {currentQ.subject_code})</span>
          </div>

          <h2 className="text-4xl text-slate-800 font-bold leading-[1.8] mb-20 tracking-tight">{currentQ.content}</h2>
          
          <div className="grid gap-8">
            {currentQ.options.map((opt) => {
              const isSelected = state.answers[currentQ.id] === opt.id;
              const isCorrect = currentCorrectIds.includes(opt.id);
              let cls = "w-full text-left p-12 rounded-[3.5rem] border-4 transition-all flex items-start group shadow-lg ";
              if (!answered) cls += "bg-slate-50 border-slate-50 hover:border-indigo-600 hover:bg-white active:scale-[0.98]";
              else if (isCorrect) cls += "border-emerald-500 bg-emerald-50 text-emerald-900 ring-[16px] ring-emerald-500/10";
              else if (isSelected) cls += "border-rose-500 bg-rose-50 text-rose-900 opacity-90";
              else cls += "bg-slate-50 border-slate-50 opacity-40";

              return (
                <button key={opt.id} disabled={answered || loadingAction} onClick={() => handleSelectOption(opt.id)} className={cls}>
                  <div className={`flex-shrink-0 w-16 h-16 rounded-3xl flex items-center justify-center mr-10 text-3xl font-black transition-all ${answered && isCorrect ? 'bg-emerald-500 text-white' : 'bg-white shadow group-hover:bg-indigo-600 group-hover:text-white'}`}>
                    {opt.label}
                  </div>
                  <span className="font-bold text-2xl leading-relaxed pt-3">{opt.content}</span>
                </button>
              );
            })}
          </div>

          {feedback !== 'NONE' && (
            <div className="mt-24 pt-20 border-t-2 border-slate-50 animate-in zoom-in duration-500">
              {feedback === 'CORRECT' ? (
                <div className="flex justify-center">
                  <div className="text-5xl font-black text-emerald-600 flex items-center tracking-tighter">
                    <span className="text-7xl mr-8">🏛️</span> 邏輯嚴密・精確命中
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="flex justify-center">
                    <CryingCat />
                  </div>
                  {explanation && (
                    <div className="bg-rose-50 border-2 border-rose-200 rounded-[3rem] p-12">
                      <h4 className="text-xl font-black text-rose-900 mb-6">📖 正確選項解析</h4>
                      <p className="text-lg text-rose-800 leading-relaxed font-semibold">{explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </article>

        {answered && (
          <section className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
            <MemoSection 
              questionId={currentQ.id} 
              memos={state.memos} 
              onChange={(newMemos) => setState(prev => ({ ...prev, memos: newMemos }))}
            />
            <button 
              onClick={nextQuestion} 
              className="w-full bg-slate-900 text-white py-14 rounded-[5rem] font-black text-5xl hover:bg-indigo-600 transition-all shadow-5xl active:scale-[0.98] tracking-widest uppercase"
            >
              {state.currentIndex < state.questions.length - 1 ? '下一題任務 →' : '產出戰略總結'}
            </button>
          </section>
        )}
      </div>
    );
  }

  if (state.status === 'RESULT') {
    const totalPossible = state.questions.reduce((acc, q) => acc + q.weight, 0);
    const accuracy = state.questions.length > 0 ? Math.round((state.stats.correctCount / Math.max(state.stats.totalAnswered, state.questions.length)) * 100) : 0;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-10 animate-in zoom-in duration-700">
        <div className="max-w-5xl w-full bg-white rounded-[8rem] p-24 shadow-5xl text-center border-2 border-slate-100 relative overflow-hidden">
          <div className="text-[14rem] mb-12 animate-bounce">🎓</div>
          <h2 className="text-8xl font-black text-slate-900 mb-6 tracking-tighter uppercase">階段測驗完成</h2>
          <p className="text-indigo-600 font-black text-lg mb-16 tracking-widest uppercase">Final Assessment Report</p>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-16 rounded-[4rem] border-2 border-indigo-300 shadow-lg">
              <div className="text-indigo-600 text-6xl font-black leading-none mb-4 tabular-nums">{state.score}</div>
              <div className="text-[10px] text-indigo-700 font-black uppercase tracking-[0.8em] mb-2">YOUR SCORE</div>
              <div className="text-2xl font-black text-indigo-500">/ {totalPossible}</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-16 rounded-[4rem] border-2 border-emerald-300 shadow-lg flex flex-col justify-center">
              <div className="text-emerald-600 text-6xl font-black mb-4">{accuracy}%</div>
              <div className="text-[10px] text-emerald-700 font-black uppercase tracking-[0.8em]">正確率</div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-16 rounded-[4rem] border-2 border-amber-300 shadow-lg flex flex-col justify-center">
              <div className="text-amber-600 text-6xl font-black mb-4">{state.questions.length}</div>
              <div className="text-[10px] text-amber-700 font-black uppercase tracking-[0.8em]">總題數</div>
            </div>
          </div>
            
          <div className="bg-indigo-900 p-12 rounded-[4rem] text-left text-white shadow-4xl relative overflow-hidden mb-16">
            <div className="absolute bottom-0 right-0 p-8 text-indigo-800 opacity-40 text-7xl font-black">⚖️</div>
            <h4 className="text-[12px] font-black uppercase tracking-[0.5em] mb-6 opacity-60">專家綜合診斷</h4>
            <p className="text-xl font-bold leading-[2] text-indigo-50 relative z-10">
              {state.summaryText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => setState(s => ({ ...s, status: 'DASHBOARD' }))} 
              className="bg-indigo-100 border-2 border-indigo-300 text-indigo-900 py-12 rounded-[3rem] font-black text-2xl hover:bg-indigo-200 transition-all active:scale-[0.98] shadow-lg tracking-widest uppercase"
            >
              📊 數據分析
            </button>
            <button 
              onClick={forceResetToHome} 
              className="bg-slate-900 text-white py-12 rounded-[3rem] font-black text-2xl hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-5xl tracking-widest uppercase"
            >
              🚀 返回戰略
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
