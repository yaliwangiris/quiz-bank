const fs = require('fs');
const all = JSON.parse(fs.readFileSync('public/bank/108_1301.json'));
const normalized = all.map(q => {
  if (!q.presented_choices && q.choices) {
    const labels = ['A','B','C','D','E','F'];
    q.presented_choices = q.choices.map((c,i)=>({label: labels[i]||String(i+1), choice_id: c.choice_id, text: c.text}));
  }
  return q;
});
const byId = new Map();
const byMeta = new Map();
function metaKey(year, subjectCode, questionNo){
  const y = String(year).trim();
  const s = String(subjectCode).trim();
  const n = String(parseInt(String(questionNo).trim(),10));
  return `${y}-${s}-${n}`;
}
for(const it of normalized){ if(!it?.question_id) continue; byId.set(it.question_id, it); byMeta.set(metaKey(String(it.year), String(it.subject_code), String(it.question_no)), it); }
console.log('byId has 108-1301-001', byId.has('108-1301-001'));
console.log('byMeta has 108-1301-1', byMeta.has('108-1301-1'));
console.log(byMeta.get('108-1301-1')?.question_id);
console.log(byId.get('108-1301-001')?.presented_choices?.length);
