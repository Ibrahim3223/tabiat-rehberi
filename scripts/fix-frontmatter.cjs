'use strict';
const fs = require('fs');
const CONTENT_DIR = 'content/alanlar';

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
let fixed = 0;
const broken = [];

for (const f of files) {
  const fp = CONTENT_DIR + '/' + f;
  const text = fs.readFileSync(fp, 'utf8');

  // Find frontmatter block
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;

  const fm = fmMatch[1];
  // Check for lines that are just a quote char (stray " or ')
  if (!/^\"\s*$/m.test(fm) && !/^'\s*$/m.test(fm)) continue;

  broken.push(f);

  // Fix: remove lines in frontmatter that are just a stray quote
  const fixedText = text.replace(
    /^---\n([\s\S]*?)\n---/,
    (match, fmContent) => {
      const cleaned = fmContent
        .split('\n')
        .filter(line => !/^\s*["']\s*$/.test(line))
        .join('\n');
      return '---\n' + cleaned + '\n---';
    }
  );

  if (fixedText !== text) {
    fs.writeFileSync(fp, fixedText, 'utf8');
    fixed++;
  }
}

console.log('Bozuk frontmatter:', broken.length);
console.log('Düzeltilen:', fixed);
if (broken.length > 0 && broken.length <= 20) {
  broken.forEach(f => console.log(' ', f));
}
