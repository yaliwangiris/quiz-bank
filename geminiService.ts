
import { GoogleGenAI, Type } from "@google/genai";
import { Subject, Question } from "./types";

const SYSTEM_INSTRUCTION = `你是一位台灣律師考試專家，負責將法律題目結構化、提供深度法律解析並指出考題爭點。
你的任務是協助考生準備律師第一試（綜合法學）。

你的職責包含：
1. 準確檢索並回傳題庫中的真題資料。
2. 針對學生的選擇提供邏輯嚴密的法律解析，引用相關法條、最高法院實務見解或大法官解釋/憲法法庭判決。
3. 根據測驗結果提供戰略性的學習建議。

請確保所有輸出均為繁體中文，且格式嚴格遵循 JSON 結構。`;

export class GeminiService {
  private bank: any[] = [];

  private get ai(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  setBank(bank: any[]) {
    this.bank = bank;
  }

  async retrieveByQuestionId(questionId: string): Promise<Question | null> {
    const raw = this.bank.find(q => String(q.question_id || q.id) === questionId);
    return raw ? this.mapToQuestion(raw) : null;
  }

  async retrieveSpecificQuestion(year: string, code: string, no: string): Promise<Question | null> {
    const raw = this.bank.find(q => 
      String(q.year) === year && 
      String(q.subject_code) === code && 
      String(q.question_no) === no
    );
    return raw ? this.mapToQuestion(raw) : null;
  }

  async fetchQuestions(mode: 'SUBJECT' | 'MOCK', target: string): Promise<Question[]> {
    let pool = [...this.bank];
    if (mode === 'SUBJECT') {
      pool = pool.filter(q => String(q.subject_code) === target || String(q.subject_name).includes(target));
      pool = this.shuffle(pool).slice(0, 10);
    } else {
      // 模擬考邏輯：根據分類隨機選題
      pool = this.shuffle(pool).slice(0, 15);
    }
    return pool.map(q => this.mapToQuestion(q));
  }

  async gradeAnswer(question: Question, selectedId: string) {
    const prompt = `請針對以下考題進行評析：
題目：${question.content}
學生選擇：${selectedId}
正確答案 ID：${question.correctChoiceIds?.join(', ')}
請以 JSON 格式回傳：
{
  "is_correct": boolean,
  "explanation": "深度的法律邏輯解析（含法條依據）",
  "correct_choice_ids": ["c1", ...]
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });
      const res = JSON.parse(response.text || "{}");
      return {
        isCorrect: !!res.is_correct,
        correctChoiceIds: res.correct_choice_ids || question.correctChoiceIds || [],
        explanation: res.explanation || "無法生成解析。",
        feedbackAsset: res.is_correct ? "fireworks" : "crying_cat"
      };
    } catch {
      return { isCorrect: false, correctChoiceIds: [], explanation: "連線異常", feedbackAsset: "crying_cat" };
    }
  }

  async getExamSummary(history: any[]) {
    const prompt = `根據以下測驗紀錄提供專家診斷：${JSON.stringify(history)}`;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });
      return JSON.parse(response.text || "{}").explanation || "完成測驗，表現穩健。";
    } catch {
      return "診斷報告生成失敗。";
    }
  }

  private mapToQuestion(q: any): Question {
    const rawChoices = q.choices || q.presented_choices || [];
    return {
      id: String(q.question_id || q.id),
      year: Number(q.year),
      subject_code: String(q.subject_code),
      question_no: Number(q.question_no),
      subject: q.subject_code as Subject,
      content: q.stem || q.content || "",
      options: rawChoices.map((c: any, idx: number) => ({
        id: String(c.choice_id || `c${idx + 1}`),
        content: String(c.text || c.content || ""),
        label: String(c.label || String.fromCharCode(65 + idx)),
      })),
      weight: 2,
      lawRef: q.tags?.[0],
      correctChoiceIds: q.correct_choice_ids || [],
      stem_len: q.stem_len || (q.stem || "").length,
      choices_len: q.choices_len || rawChoices.map((c: any) => (c.text || c.content || "").length),
    };
  }

  private shuffle(arr: any[]) {
    return [...arr].sort(() => Math.random() - 0.5);
  }
}
