
export enum Subject {
  CONSTITUTIONAL = '憲法',
  ADMINISTRATIVE = '行政法',
  INTERNATIONAL_PUBLIC = '國際公法',
  INTERNATIONAL_PRIVATE = '國際私法',
  CRIMINAL = '刑法',
  CRIMINAL_PROC = '刑事訴訟法',
  LEGAL_ETHICS = '法律倫理',
  CIVIL = '民法',
  CIVIL_PROC = '民事訴訟法',
  COMPANY = '公司法',
  INSURANCE = '保險法',
  NOTES = '票據法',
  SECURITIES = '證券交易法',
  EXECUTION = '強制執行法',
  LEGAL_ENGLISH = '法學英文',
}

export enum Category {
  SESSION_1 = '綜合法學(一)：公法、國際法',
  SESSION_2 = '綜合法學(一)：刑法、刑訴、倫理',
  SESSION_3 = '綜合法學(二)：民法、民訴',
  SESSION_4 = '綜合法學(二)：商法、執行法、法英',
  
}

export interface SessionConfig {
  subjects: Subject[];
  totalPoints: number;
}

export const SESSION_METADATA: Record<Category, SessionConfig> = {
  [Category.SESSION_1]: {
    subjects: [Subject.CONSTITUTIONAL, Subject.ADMINISTRATIVE, Subject.INTERNATIONAL_PUBLIC, Subject.INTERNATIONAL_PRIVATE],
    totalPoints: 300
  },
  [Category.SESSION_2]: {
    subjects: [Subject.CIVIL, Subject.CIVIL_PROC],
    totalPoints: 300
  },
  [Category.SESSION_3]: {
    subjects: [Subject.COMPANY, Subject.INSURANCE, Subject.NOTES, Subject.SECURITIES, Subject.EXECUTION, Subject.LEGAL_ENGLISH],
    totalPoints: 300
  },
  [Category.SESSION_4]: {
    subjects: [Subject.CRIMINAL, Subject.CRIMINAL_PROC, Subject.LEGAL_ETHICS],
    totalPoints: 300
  }
};

export interface SubjectStat {
  total: number;
  correct: number;
}

export interface UserStats {
  totalAnswered: number;
  correctCount: number;
  currentStreak: number; 
  maxStreak: number;
  dailyStreak: number; 
  lastActiveDate?: number;
  subjectStats: Record<string, SubjectStat>;
  history: Array<{
    date: number;
    score: number;
    totalPossible: number;
    category: string;
  }>;
}

export interface Question {
  id: string; 
  year: number;
  subject_code: string;
  question_no: number;
  subject: Subject;
  content: string;
  options: { id: string; content: string; label: string }[];
  weight: number;
  lawRef?: string;
  correctChoiceIds?: string[];
  // Integrity fields
  stem_len?: number;
  choices_len?: number[];
}

export interface UserMemo {
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export type AppMode = 'IDLE' | 'SUBJECT_PRACTICE' | 'MOCK_EXAM';

export interface QuizState {
  mode: AppMode;
  category?: Category;
  questions: Question[];
  currentIndex: number;
  score: number;
  answers: Record<string, string>;
  memos: Record<string, UserMemo>;
  status: 'IDLE' | 'LOADING' | 'QUIZ' | 'RESULT' | 'DASHBOARD';
  stats: UserStats;
  summaryText?: string;
}
