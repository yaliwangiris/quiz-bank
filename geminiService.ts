// geminiService.ts (LOCAL bank engine; no LLM needed)
import { Subject, Category, Question, SESSION_METADATA } from "./types";

type PresentedChoice = { label: string; choice_id: string; text: string };

export type BankItem = {
  action?: "present_question" | "grade_answer" | "exam_summary";
  source_check?: "matched" | "not_found";

  question_id: string;
  year: number;
  subject_code: string;
  question_no: number;
  question_type?: "single" | "multiple";

  stem: string;
  stem_len?: number;
  choices_len?: number[];
  presented_choices: PresentedChoice[];

  correct_choice_ids?: string[];
  explanation?: string;
  tags?: string[];
};

export class GeminiService {
  private bank: BankItem[] = [];
  private byId = new Map<string, BankItem>();
  private byMeta = new Map<string, BankItem>(); // `${year}-${subject_code}-${no}`

  /** Call once after bank loaded */
  setBank(items: BankItem[]) {
    this.bank = Array.isArray(items) ? items : [];
    this.byId.clear();
    this.byMeta.clear();

    for (const it of this.bank) {
      if (!it?.question_id) continue;
      this.byId.set(it.question_id, it);
      const metaKey = this.metaKey(String(it.year), String(it.subject_code), String(it.question_no));
      this.byMeta.set(metaKey, it);
    }
  }

  private metaKey(year: string, subjectCode: string, questionNo: string) {
    // keep as plain "108-1301-5" normalized
    const y = String(year).trim();
    const s = String(subjectCode).trim();
    const n = String(parseInt(String(questionNo).trim(), 10));
    return `${y}-${s}-${n}`;
  }

  private mapToQuestion(it: BankItem): Question {
    return {
      id: it.question_id,
      year: it.year,
      subject_code: it.subject_code,
      question_no: it.question_no,
      subject: it.subject_code as Subject, // your Subject enum seems to be code-based
      content: it.stem,
      stem_len: it.stem_len ?? it.stem?.length ?? 0,
      choices_len:
        it.choices_len ??
        (it.presented_choices?.map((c) => (c.text ?? "").length) ?? []),
      options: (it.presented_choices || []).map((c) => ({
        id: c.choice_id,
        content: c.text,
        label: c.label,
      })),
      weight: 2,
      lawRef: it.tags?.[0],
    };
  }

  async retrieveByQuestionId(questionId: string): Promise<Question | null> {
    const qid = String(questionId || "").trim();
    const hit = this.byId.get(qid);
    if (!hit) return null;
    return this.mapToQuestion(hit);
  }

  async retrieveSpecificQuestion(year: string, subjectCode: string, questionNo: string): Promise<Question | null> {
    const key = this.metaKey(year, subjectCode, questionNo);
    const hit = this.byMeta.get(key);
    if (!hit) return null;
    return this.mapToQuestion(hit);
  }

  async fetchQuestions(mode: "SUBJECT" | "MOCK", target: string): Promise<Question[]> {
    if (!this.bank.length) return [];

    if (mode === "SUBJECT") {
      const subjectCode = String(target).trim();
      const pool = this.bank.filter((it) => String(it.subject_code).trim() === subjectCode);
      return this.sample(pool, 10).map((it) => this.mapToQuestion(it));
    }

    // MOCK: target is Category (e.g., '民法+刑法...' etc)
    const cat = target as Category;
    const meta = SESSION_METADATA?.[cat];
    const subjectCodes = meta?.subjects || [];

    const pool = this.bank.filter((it) => subjectCodes.includes(it.subject_code as any));
    return this.sample(pool, 15).map((it) => this.mapToQuestion(it));
  }

  async gradeAnswer(
    question: Question,
    selectedChoiceId: string
  ): Promise<{
    isCorrect: boolean;
    correctChoiceIds: string[];
    explanation: string;
    feedbackAsset: string;
  }> {
    const raw = this.byId.get(question.id);
    const correct = raw?.correct_choice_ids || [];

    const picked = String(selectedChoiceId || "").trim();
    const isCorrect = correct.includes(picked);

    // Use stored explanation if exists; otherwise generate a safe local one
    const explanation =
      raw?.explanation?.trim() ||
      `本題正確選項為 ${correct.join(", ") || "（題庫未附答案）"}。請回到題幹與選項逐句對照關鍵要件，排除不符合要件或推論跳躍的選項。`;

    return {
      isCorrect,
      correctChoiceIds: correct,
      explanation,
      feedbackAsset: isCorrect ? "correct" : "wrong",
    };
  }

  async getExamSummary(history: any[]): Promise<string> {
    // Simple deterministic summary (no LLM)
    if (!history?.length) return "測驗結束。";

    const total = history.length;
    const correct = history.filter((h: any) => !!h.isCorrect).length;
    const acc = Math.round((correct / total) * 100);

    return `本次共 ${total} 題，答對 ${correct} 題，正確率約 ${acc}%。建議優先回看錯題，將「題幹要件 → 選項對應要件」做成筆記，避免同類錯誤重複發生。`;
  }

  private sample<T>(arr: T[], n: number): T[] {
    const a = [...arr];
    // Fisher–Yates shuffle
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }
}
