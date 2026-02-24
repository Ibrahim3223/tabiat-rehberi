'use strict';
const fs = require('fs'), path = require('path');
const dir = 'content/alanlar';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

let fixed = 0, totalReplacements = 0;

for (const f of files) {
  const fp = path.join(dir, f);
  const text = fs.readFileSync(fp, 'utf8');

  // Sadece body kısmına uygula (frontmatter'a dokunma)
  const fmEnd = text.indexOf('\n---', 4);
  if (fmEnd < 0) continue;
  const fm = text.slice(0, fmEnd + 4);
  const body = text.slice(fmEnd + 4);

  if (!/\bliving\b/i.test(body)) continue;

  // "living X" → "yaşayan X" (bitki, tür, organizma, vb. öncesinde)
  // Tek başına duran "living" → "yaşayan"
  let newBody = body.replace(/\bliving\b/gi, 'yaşayan');

  if (newBody === body) continue;

  const count = (body.match(/\bliving\b/gi) || []).length;
  totalReplacements += count;
  fs.writeFileSync(fp, fm + newBody, 'utf8');
  fixed++;
  console.log(f + ': ' + count + ' değişiklik');
}

console.log('\nDüzeltilen dosya :', fixed);
console.log('Toplam değişiklik:', totalReplacements);
