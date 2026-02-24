'use strict';
/**
 * analyze-content.cjs
 * İçerik kalite analizi: şablon cümleler, yabancı kelimeler, bağlam sorunları
 */
const fs   = require('fs');
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

function getBody(text) {
  // Strip front matter
  const m = text.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return m ? m[1] : text;
}

function getFM(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

function getField(fm, key) {
  const r = fm.match(new RegExp('^' + key + ':\\s*["\']?(.+?)["\']?\\s*$', 'm'));
  return r ? r[1].trim().replace(/^["']|["']$/g, '') : '';
}

const files = walkMD('content/alanlar');
console.log('Toplam dosya:', files.length);

// ── 1. Şablon cümle frekans analizi ─────────────────────────────────────
const TEMPLATE_PHRASES = [
  '140 hektarlık bir',
  '200 futbol sahası',
  'hem yerli hem de yabancı turistler',
  'ziyaretçiler tarafından sıkça ziyaret',
  'doğal güzelliği ile de dikkat çekmektedir',
  'ziyaretçilere.*?keşfetme fırsatı',
  'bir çekim merkezi olarak görev yapar',
  'flora ve fauna açısından oldukça zengin',
  'ekolojik dengesini korumak açısından',
  'çeşitli bitki türleri ve zengin fauna',
  'yaklaşık 200 futbol',
  'önemli bir turistik destinasyon',
  'doğaseverlerin gözdesi',
  'ziyaretçilerine unutulmaz',
  'doğal bir cennet',
  'benzersiz doğal güzellik',
  'eşsiz doğal güzellik',
  'doğa tutkunlarının',
  'kesinlikle ziyaret etmeli',
  'mutlaka görülmesi gereken',
];

console.log('\n── ŞABLON CÜMLE FREKANSLARI ──────────────────────────────────');
const phraseCount = {};
for (const phrase of TEMPLATE_PHRASES) {
  const re = new RegExp(phrase, 'gi');
  let count = 0;
  for (const fp of files) {
    const body = getBody(fs.readFileSync(fp, 'utf8'));
    if (re.test(body)) count++;
    re.lastIndex = 0;
  }
  phraseCount[phrase] = count;
}
Object.entries(phraseCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([p, c]) => console.log(`  [${c.toString().padStart(5)}] ${p.substring(0, 70)}`));

// ── 2. Yabancı dil sızıntıları ───────────────────────────────────────────
console.log('\n── YABANCI DİL SIZINTILARI ────────────────────────────────────');
const FOREIGN = [
  { pattern: /\bfácil\b/gi, label: 'fácil (İsp.)' },
  { pattern: /\bbeautiful\b/gi, label: 'beautiful (İng.)' },
  { pattern: /\bhabital\b/gi, label: 'habital (yazım)' },
  { pattern: /\bhabitat\b/gi, label: 'habitat (İng. ama kabul)' },
  { pattern: /\btrès\b/gi, label: 'très (Fr.)' },
  { pattern: /\brivière\b/gi, label: 'rivière (Fr.)' },
  { pattern: /\bsehr\b/gi, label: 'sehr (Alm.)' },
  { pattern: /\bschön\b/gi, label: 'schön (Alm.)' },
  { pattern: /\btuyên b\b/gi, label: 'tuyên bố (Viet.)' },
  { pattern: /\bpassedir\b/gi, label: 'passedir (bozuk)' },
  { pattern: /[àáâãèéêëìíîïòóôõùúûýÿ]/g, label: 'Lat. aksan (non-TR)' },
];

for (const { pattern, label } of FOREIGN) {
  let fileCount = 0, total = 0;
  const samples = [];
  for (const fp of files) {
    const body = getBody(fs.readFileSync(fp, 'utf8'));
    const matches = body.match(pattern);
    if (matches) {
      fileCount++;
      total += matches.length;
      if (samples.length < 2) samples.push(path.basename(fp));
    }
  }
  if (fileCount > 0) {
    console.log(`  [${fileCount.toString().padStart(5)} dosya / ${total} adet] ${label}`);
    samples.forEach(s => console.log(`    örnek: ${s}`));
  }
}

// ── 3. Bağlam dışı cümleler ──────────────────────────────────────────────
console.log('\n── BAĞLAM DIŞI CÜMLELER ───────────────────────────────────────');
const CONTEXT_ISSUES = [
  { pattern: /canavar/gi, label: 'canavar (saçma)' },
  { pattern: /cankurtaran/gi, label: 'cankurtaran' },
];
for (const { pattern, label } of CONTEXT_ISSUES) {
  let count = 0;
  const samples = [];
  for (const fp of files) {
    const body = getBody(fs.readFileSync(fp, 'utf8'));
    if (pattern.test(body)) {
      count++;
      if (samples.length < 3) {
        const line = body.split('\n').find(l => pattern.test(l));
        samples.push({ f: path.basename(fp), line: (line || '').substring(0, 90) });
      }
      pattern.lastIndex = 0;
    }
  }
  if (count > 0) {
    console.log(`  [${count} dosya] ${label}`);
    samples.forEach(s => console.log(`    ${s.f}: ${s.line}`));
  }
}

// ── 4. Alan türü / başlık uyumsuzluğu ───────────────────────────────────
console.log('\n── ALAN TÜRÜ ANALİZİ ──────────────────────────────────────────');
const NON_NATURE = ['hamam', 'türbe', 'tekke', 'cami', 'külliye', 'müze', 'stadyum', 'mezar', 'anit', 'han', 'kervansaray', 'kule', 'köprü', 'sur', 'kale'];
const titleLower = {};
let nonNatureCount = 0;
const nonNatureSamples = [];
for (const fp of files) {
  const text = fs.readFileSync(fp, 'utf8');
  const fm = getFM(text);
  const title = getField(fm, 'title').toLowerCase();
  const tur   = getField(fm, 'alan_turu').toLowerCase();
  for (const kw of NON_NATURE) {
    if (title.includes(kw)) {
      nonNatureCount++;
      if (nonNatureSamples.length < 8) nonNatureSamples.push(`${tur.padEnd(15)} | ${path.basename(fp)}`);
      break;
    }
  }
}
console.log(`  Başlığında mimari/kültürel yer geçen: ${nonNatureCount} dosya`);
nonNatureSamples.forEach(s => console.log('  ' + s));

// ── 5. "140 hektar" sapması ──────────────────────────────────────────────
console.log('\n── "140 HEKTAR" SAPMASI ───────────────────────────────────────');
let h140 = 0;
for (const fp of files) {
  const body = getBody(fs.readFileSync(fp, 'utf8'));
  if (/140 hektar/i.test(body)) h140++;
}
console.log(`  "140 hektarlık" geçen dosya: ${h140}`);

// ── 6. Intra-page repetition ────────────────────────────────────────────
console.log('\n── SAYFA İÇİ TEKRAR (3+ kez aynı cümle parçası) ─────────────');
const REPEAT_PHRASES = [
  'dikkat çeker',
  'çekim merkezi',
  'ziyaret edebilirsiniz',
  'doğa severler',
  'ziyaretçilerine sunmaktadır',
];
for (const ph of REPEAT_PHRASES) {
  const re = new RegExp(ph, 'gi');
  let worst = 0, worstFile = '';
  for (const fp of files) {
    const body = getBody(fs.readFileSync(fp, 'utf8'));
    const m = body.match(re);
    if (m && m.length > worst) { worst = m.length; worstFile = path.basename(fp); }
  }
  console.log(`  "${ph}" — max ${worst}x → ${worstFile}`);
}
