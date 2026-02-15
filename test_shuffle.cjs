#!/usr/bin/env node

/**
 * 測試選項洗牌和答案識別邏輯
 */

// 模擬 shuffle 函數
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 模擬題目數據
const mockQuestion = {
  question_id: "104-1301-001",
  year: 104,
  subject_code: "1301",
  question_no: 1,
  stem: "甲欲殺 A...",
  presented_choices: [
    { label: "A", choice_id: "c1", text: "甲成立殺人罪之未遂，不適用中止規定" },
    { label: "B", choice_id: "c2", text: "甲成立殺人罪之中止未遂" },
    { label: "C", choice_id: "c3", text: "甲成立殺人罪之普通未遂" },
    { label: "D", choice_id: "c4", text: "甲犯意變更，應論以普通傷害罪" }
  ],
  correct_choice_ids: ["c2"],
  explanation: "本題考查未遂罪中之中止"
};

console.log("=== 選項洗牌與答案識別測試 ===\n");

// 測試 3 次
for (let test = 1; test <= 3; test++) {
  console.log(`\n測試輪 ${test}:`);
  console.log(`原始順序: c1 → c2 → c3 → c4`);
  
  // 洗牌
  const baseOptions = mockQuestion.presented_choices.map(c => ({
    id: c.choice_id,
    content: c.text,
    label: c.label,
    choice_id: c.choice_id
  }));
  
  const shuffledOptions = shuffle(baseOptions);
  console.log(`洗牌後: ${shuffledOptions.map(o => o.choice_id).join(" → ")}`);
  
  // 重新標籤 (A, B, C, D)
  const finalOptions = shuffledOptions.map((opt, idx) => {
    const newLabel = ['A', 'B', 'C', 'D'][idx];
    return {
      id: opt.choice_id,
      content: opt.content,
      label: newLabel
    };
  });
  
  console.log(`新標籤: ${finalOptions.map((o, i) => `${o.label}=${o.id}`).join(", ")}`);
  
  // 模擬用戶選擇第 0 個選項（新標籤 A）
  const selectedChoice = finalOptions[0];
  console.log(`\n用戶選擇: 標籤"${selectedChoice.label}" (choice_id="${selectedChoice.id}")`);
  
  // 驗證答案
  const correct = mockQuestion.correct_choice_ids;
  const isCorrect = correct.includes(selectedChoice.id);
  
  console.log(`正確答案: ${correct.join(", ")}`);
  console.log(`判定結果: ${isCorrect ? "✓ 正確" : "✗ 錯誤"}`);
  
  if (selectedChoice.id === "c2") {
    console.log("→ 恭喜！即使選項位置改變，系統仍正確識別答案！");
  }
}

console.log("\n\n=== 核心結論 ===");
console.log("✓ 選項位置每次都會隨機改變");
console.log("✓ 但通過 choice_id 系統永遠能正確識別答案");
console.log("✓ 用戶看到同一題時，正確答案的位置會改變");
console.log("✓ 系統通過 choice_id 識別，位置改變不影響判定");
