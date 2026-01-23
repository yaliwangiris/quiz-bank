// geminiService.ts
import { Subject, Category, Question, SESSION_METADATA } from "./types";

type RawChoice = { choice_id: string; text: string };
type RawQuestion = {
  question_id: string;
  year: number;
  subject_code: string;
  question_no: number;
  question_type?: "single" | "multiple";
  stem: string;
  choices: RawChoice[];
  correct_choice_ids?: string[];
  explanation?: string;
  tags?: string[];
};

function charLen(s: string): number {
  // 以字元數為主（含中文、標點）
  return (s ?? "").length;
}

function normalizeId(id: string): string {
  return (id || "").trim();
}

function toQuestion(raw: RawQuestion): Question {
  const presented = raw.choices?.map((c, idx) => ({
    id: c.choice_id,
    label: String.fromCharCode("A".charCodeAt(0) + idx),
    content: c.text,
  })) ?? [];

  return {
    id: raw.question_id,
    year: raw.year,
    subject_code: raw.subject_code,
    question_no: raw.question_no,
    subject: raw.subject_code as Subject,
    content: raw.stem,
    stem_len: charLen(raw.stem),
    choices_len: raw.choices?.map(c => charLen(c.text)) ?? [],
    options: presented,
    weight: 2,
    lawRef: raw.tags?.[0],
  };
}

export class GeminiService {
  private bank: RawQuestion[] = [];

  /** App.tsx 會在載入題庫後呼叫 */
  setBank(bank: any[]) {
    // 保守處理：只收看起來像題目的物件
    this.bank = (bank || []).filter((x: any) => x && x.question_id && x.stem && x.choices);
  }

  /** 精準：question_id 完全一致才算 */
  async retrieveByQuestionId(questionId: string): Promise<Question | null> {
    const id = normalizeId(questionId);
    const hit = this.bank.find(q => normalizeId(q.question_id) === id);
    return hit ? toQuestion(hit) : null;
  }

  /** 精準：year + subject_code + question_no 完全一致才算 */
  async retrieveSpecificQuestion(year: string, subjectCode: string, questionNo: string): Promise<Question | null> {
    const y = Number(year);
    const no = Number(questionNo);
    const code = (subjectCode || "").trim();

    const hit = this.bank.find(q =>
      q.year === y &&
      String(q.subject_code).trim() === code &&
      q.question_no === no
    );

    return hit ? toQuestion(hit) : null;
  }

  /** 取題：SUBJECT（同科目抽題） / MOCK（依 SESSION_METADATA 組卷抽題） */
  async fetchQuestions(mode: "SUBJECT" | "MOCK", target: string): Promise<Question[]> {
    if (!this.bank.length) return [];

    const pickN = (arr: RawQuestion[], n: number) => {
      // 洗牌抽樣
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, n);
    };

    if (mode === "SUBJECT") {
      const subject = target as Subject;
      const pool = this.bank.filter(q => String(q.subject_code) === String(subject));
      return pickN(pool, 10).map(toQuestion);
    }

    // MOCK
    const cat = target as Category;
    const meta = SESSION_METADATA[cat];
    const subjects = meta?.subjects ?? [];
    const pool = this.bank.filter(q => subjects.includes(q.subject_code as any));
    return pickN(pool, 15).map(toQuestion);
  }

  /** 批改：直接用 bank 裡的 correct_choice_ids */
  async gradeAnswer(question: Question, selectedChoiceId: string): Promise<{
    isCorrect: boolean;
    correctChoiceIds: string[];
    explanation: string;
    feedbackAsset: string;
  }> {
    const hit = this.bank.find(q => normalizeId(q.question_id) === normalizeId(question.id));
    if (!hit) {
      return { isCorrect: false, correctChoiceIds: [], explanation: "找不到題目資料，無法批改。", feedbackAsset: "none" };
    }

    const correct = hit.correct_choice_ids ?? [];
    const isCorrect = correct.includes(selectedChoiceId);

    // 解析：優先用題庫內建 explanation；沒有就給空字串（你也可改成提示用戶自己寫筆記）
    const explanation = hit.explanation?.trim()
      ? hit.explanation.trim()
      : "（本題尚未提供官方解析，建議依題幹與選項自行整理要點。）";

    return {
      isCorrect,
      correctChoiceIds: correct,
      explanation,
      feedbackAsset: isCorrect ? "fireworks" : "none",
    };
  }

  /** 考後總結：純前端簡單統計（你可再進化） */
  async getExamSummary(history: any[]): Promise<string> {
    const total = history.length;
    if (!total) return "測驗結束。";

    const correct = history.filter((h: any) => h?.isCorrect).length;
    const acc = Math.round((correct / total) * 100);

    return `本次共作答 ${total} 題，答對 ${correct} 題，正確率 ${acc}%。建議優先複習錯題並在同科目再做一輪抽題加強。`;
  }
}
