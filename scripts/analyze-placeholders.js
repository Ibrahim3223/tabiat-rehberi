'use strict';
const fs = require('fs');
const path = require('path');

function walkMD(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMD(fp));
    else if (e.name.endsWith('.md')) out.push(fp);
  }
  return out;
}

const files = walkMD('content/alanlar');
const groups = {};
let total = 0;

for (const fp of files) {
  const t = fs.readFileSync(fp, 'utf8');
  if (t.indexOf('placehold.co') === -1) continue;
  total++;
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m) continue;
  const fm = m[1];
  const il  = (fm.match(/^il:\s*["']?(.+?)["']?\s*$/m) || [])[1] || 'bilinmiyor';
  const tur = (fm.match(/^alan_turu:\s*["']?(.+?)["']?\s*$/m) || [])[1] || 'diger';
  const k = il + '__' + tur;
  if (!groups[k]) groups[k] = { il, tur, count: 0 };
  groups[k].count++;
}

const groupCount = Object.keys(groups).length;
const topGroups = Object.entries(groups).sort((a, b) => b[1].count - a[1].count).slice(0, 20);

console.log('Toplam placeholder dosya:', total);
console.log('Unique il+tur kombinasyonu:', groupCount);
console.log('\nEn büyük gruplar:');
topGroups.forEach(([k, v]) => console.log('  ' + v.il + ' / ' + v.tur + ': ' + v.count + ' dosya'));

const turs = {};
for (const [, v] of Object.entries(groups)) {
  turs[v.tur] = (turs[v.tur] || 0) + v.count;
}
console.log('\nAlan türü dağılımı:');
Object.entries(turs).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k+': '+v));
