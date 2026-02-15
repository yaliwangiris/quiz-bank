const fs = require('fs');
const files = JSON.parse(fs.readFileSync('public/bank/manifest.json')).files;
const all = [];
for (const f of files) { all.push(...JSON.parse(fs.readFileSync('public/bank/' + f))); }
const normalized = all.map(q => {
  if (!q.presented_choices && q.choices) {
    const labels = ['A','B','C','D','E','F'];
    q.presented_choices = q.choices.map((c,i)=>({label: labels[i]||String(i+1), choice_id: c.choice_id, text: c.text}));
  }
  return q;
});
console.log('total', normalized.length);
const sample = normalized.find(x => x.question_id === '108-1301-001');
console.log('sample id', sample.question_id);
console.log('presented_choices count', sample.presented_choices.length);
console.log(sample.presented_choices.slice(0,3));
