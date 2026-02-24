'use strict';
const fs = require('fs');
const CONTENT_DIR = 'content/alanlar';

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

// Sentence-level removal: any sentence or bullet point containing these patterns
const REMOVE_PATTERNS = [
  // Any sentence/fragment with "futbol sahası"
  /[^.!?\n]*futbol\s*sahası[^.!?\n]*[.!?]?/gi,
  // Any bullet point with "futbol sahası"
  /^[-*]\s[^\n]*futbol\s*sahası[^\n]*/gim,
  // Any sentence/fragment with "140 hektarlık"
  /[^.!?\n]*140\s*hektarlık[^.!?\n]*[.!?]?/gi,
  // Any bullet point with "140 hektarlık"
  /^[-*]\s[^\n]*140\s*hektarlık[^\n]*/gim,
];

// Word-level replacements
const WORD_FIXES = [
  [/fácil/g, 'kolay'],
];

// Pages to set draft:true by filename
const DRAFT_FILES = new Set(['suluklu-han.md']);

let fixed = 0, draftFixed = 0;

for (const f of files) {
  let text = fs.readFileSync(CONTENT_DIR + '/' + f, 'utf8');
  const original = text;

  // Draft fix
  if (DRAFT_FILES.has(f) && !/^draft:\s*true/m.test(text)) {
    text = text.replace(/^draft:\s*false/m, 'draft: true');
    draftFixed++;
  }

  // Word fixes
  for (const [pattern, replacement] of WORD_FIXES) {
    text = text.replace(pattern, replacement);
  }

  // Sentence removal
  for (const pattern of REMOVE_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // Clean up multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  if (text !== original) {
    fs.writeFileSync(CONTENT_DIR + '/' + f, text, 'utf8');
    fixed++;
  }
}

console.log('Güncellenen dosya:', fixed);
console.log('Draft yapılan    :', draftFixed);

// Verify
const files2 = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
let facil = 0, futbol = 0, hektar = 0;
for (const f of files2) {
  const t = fs.readFileSync(CONTENT_DIR + '/' + f, 'utf8');
  if (t.includes('fácil')) facil++;
  if (t.includes('200 futbol sahası')) futbol++;
  if (t.includes('140 hektarlık')) hektar++;
}
console.log('\nKalan:');
console.log('  fácil        :', facil);
console.log('  200 futbol   :', futbol);
console.log('  140 hektarlık:', hektar);
