const fs = require('fs');

// Load all questions from public/bank
const files = JSON.parse(fs.readFileSync('public/bank/manifest.json')).files;
const all = [];
for (const f of files) {
  all.push(...JSON.parse(fs.readFileSync('public/bank/' + f)));
}

// Normalize to presented_choices
const normalized = all.map(q => {
  if (!q.presented_choices && q.choices) {
    const labels = ['A','B','C','D','E','F'];
    q.presented_choices = q.choices.map((c,i)=>({label: labels[i]||String(i+1), choice_id: c.choice_id, text: c.text}));
  }
  return q;
});

// Create CATEGORY_CODE_MAP
const CATEGORY_CODE_MAP = {
  'SESSION_1': ['2301'],
  'SESSION_2': ['1301'],
  'SESSION_3': ['3301'],
  'SESSION_4': ['4301'],
};

// Simulate fetchQuestions(MOCK, category)
function testMockFetch(category) {
  console.log(`\n=== Testing MOCK fetch for ${category} ===`);
  console.log(`bank total: ${normalized.length}`);
  
  const codes = CATEGORY_CODE_MAP[category] || [];
  console.log(`CATEGORY_CODE_MAP codes: ${JSON.stringify(codes)}`);
  
  if (Array.isArray(codes) && codes.length > 0) {
    const pool = normalized.filter((it) => codes.includes(String(it.subject_code).trim()));
    console.log(`✓ pool from codes: ${pool.length}`);
    console.log(`Sample IDs: ${pool.slice(0, 3).map(q => q.question_id).join(', ')}`);
    return pool.slice(0, 15);
  }
  
  console.log('✗ No codes matched, would fallback to full bank');
  return normalized.slice(0, 15);
}

// Test each category
['SESSION_1', 'SESSION_2', 'SESSION_3', 'SESSION_4'].forEach(cat => {
  const result = testMockFetch(cat);
  if (result.length === 0) {
    console.log(`⚠️ WARNING: No questions returned for ${cat}`);
  }
});

// Also check subject code distribution
console.log('\n=== Subject Code Distribution ===');
const codeCounts = {};
for (const q of normalized) {
  const code = String(q.subject_code).trim();
  codeCounts[code] = (codeCounts[code] || 0) + 1;
}
Object.entries(codeCounts).sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
  console.log(`${code}: ${count} questions`);
});
