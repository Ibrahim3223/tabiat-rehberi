'use strict';
/**
 * fix-frontmatter.cjs (v2)
 * Frontmatter'da regex bozulmasından kalan geçersiz satırları temizle:
 *   1) Sadece tek tırnak işareti olan satırlar: `"` veya `'`
 *   2) YAML anahtarı olmayan ama içeriği kalmış satırlar
 *      (ör: ` Cadde, birçok... tanınır."`)
 */
const fs = require('fs');
const CONTENT_DIR = 'content/alanlar';

// Valid YAML frontmatter line patterns
const VALID = [
  /^---$/,                                                    // delimiter
  /^\s*$/,                                                    // empty
  /^[a-zA-Z_çğışöüÇĞİŞÖÜ][^:\n]*\s*:/,                    // top-level key: value
  /^\s+[-[{]/,                                               // indented: list item or array/object
  /^\s+[a-zA-Z_çğışöüÇĞİŞÖÜ0-9][^:\n]*\s*:/,              // indented key: value (nested)
  /^\s+"[^"]*":\s*/,                                         // indented "quoted-key":
];

function isValidFMLine(line) {
  return VALID.some(re => re.test(line));
}

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
let fixed = 0;
let totalRemoved = 0;

for (const f of files) {
  const fp = CONTENT_DIR + '/' + f;
  const text = fs.readFileSync(fp, 'utf8');

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;

  const fmLines = fmMatch[1].split('\n');
  const cleanLines = fmLines.filter(line => {
    if (isValidFMLine(line)) return true;
    // Remove invalid lines (corrupted fragments)
    totalRemoved++;
    return false;
  });

  if (cleanLines.length === fmLines.length) continue;

  const newFM = '---\n' + cleanLines.join('\n') + '\n---';
  const newText = text.replace(/^---\n[\s\S]*?\n---/, newFM);
  fs.writeFileSync(fp, newText, 'utf8');
  fixed++;
}

console.log('Düzeltilen dosya   :', fixed);
console.log('Kaldırılan satır   :', totalRemoved);
