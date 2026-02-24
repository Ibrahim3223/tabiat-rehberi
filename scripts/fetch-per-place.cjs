'use strict';
/**
 * fetch-per-place.cjs
 * Her yer için Wikimedia Commons'tan özel fotoğraf arar.
 * Bulunamayan yerlerde mevcut grup görselini korur.
 * İnterrupt/resume destekli (progress.json).
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const CONTENT_DIR     = 'content/alanlar';
const PROGRESS_FILE   = 'scripts/per_place_progress.json';
const RATE_LIMIT_MS   = 1200;
const PARALLEL        = 3;       // Kaç paralel istek
const MIN_WIDTH       = 700;
const UA = 'tabiatrehberi.com/1.0 (doga; contact@tabiatrehberi.com)';

// Türü çok olan ve özel görsel bulunması zor olan türleri atla
// (grup görseli yeterli)
const SKIP_TYPES = new Set(['tepe', 'dag']);

function isGoodImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  const fname = lower.split('/').pop();
  if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(fname)) return false;
  if (/\.djvu/i.test(url)) return false;
  if (/\/page\d+-/i.test(url)) return false;
  if (/\.pdf(\.|\/)/i.test(url)) return false;
  if (/IA_/i.test(url)) return false;
  if (/\.(svg|gif)(\?|$)/i.test(lower)) return false;
  if (/\b(map|chart|diagram|schedule|report|figure|table|document|scan|painting|drawing|railway|train|locomotive|prairie_dog|wild_scenic|executive_order|coat_of_arms|flag_of|emblem|logo)\b/i.test(url)) return false;
  if (/\bNARA\b|-_NARA_-/i.test(url)) return false;
  return true;
}

// İsim ne kadar özel görsel için uygun? Kısa/genel isimleri atla.
function isSearchable(title, tur) {
  if (SKIP_TYPES.has(tur)) return false;
  if (!title || title.length < 5) return false;
  // Çok genel isimler (Büyük Göl, Küçük Tepe gibi) iyi sonuç vermez ama deneyelim
  return true;
}

let lastCallTime = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiFetch(url) {
  return new Promise((resolve, reject) => {
    const opts = Object.assign(require('url').parse(url), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' }
    });
    const req = https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const queue = [];
let activeRequests = 0;

async function rateLimitedFetch(url) {
  // Wait for a slot in the parallel pool
  while (activeRequests >= PARALLEL) {
    await sleep(100);
  }
  // Rate limit: ensure min gap between any two calls
  const now = Date.now();
  const gap  = RATE_LIMIT_MS - (now - lastCallTime);
  if (gap > 0) await sleep(gap);
  lastCallTime = Date.now();
  activeRequests++;
  try {
    return await apiFetch(url);
  } finally {
    activeRequests--;
  }
}

async function searchPlace(title, il) {
  // Strategy 1: Exact title
  const queries = [
    title,
    title + ' ' + (il || ''),
  ];

  for (const q of queries) {
    const encoded = encodeURIComponent(q.trim());
    const url = `https://commons.wikimedia.org/w/api.php?action=query` +
      `&generator=search&gsrnamespace=6&gsrsearch=${encoded}&gsrlimit=8` +
      `&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=900&format=json`;

    let data;
    try { data = await rateLimitedFetch(url); }
    catch(e) { continue; }

    if (!data.query?.pages) continue;

    const candidates = [];
    for (const page of Object.values(data.query.pages)) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const imgUrl = info.thumburl || info.url;
      if (!isGoodImage(imgUrl)) continue;
      const w = info.thumbwidth || info.width || 0;
      if (w > 0 && w < MIN_WIDTH) continue;
      const license = info.extmetadata?.LicenseShortName?.value || '';
      if (/rights\s*reserved/i.test(license)) continue;

      // Score: prefer images where the title appears in the filename
      const fname   = decodeURIComponent(imgUrl.split('/').pop() || '').toLowerCase();
      const titleLc = title.toLowerCase().replace(/[^a-zçğışöü0-9]/gi, '');
      const score   = titleLc.split('').reduce((n, c) => n + (fname.includes(c) ? 1 : 0), 0);

      const credit = (page.title || '').replace('File:', '').replace(/_/g,' ').replace(/\.[^.]+$/,'');
      candidates.push({ url: imgUrl, credit, license: license || 'CC BY-SA', score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    }
  }
  return null;
}

function walkMD(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMD(fp));
    else if (e.name.endsWith('.md')) out.push(fp);
  }
  return out;
}

function getMeta(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = m[1];
  function get(k) {
    const r = fm.match(new RegExp('^' + k + ':\\s*["\']?(.+?)["\']?\\s*$', 'm'));
    return r ? r[1].trim().replace(/^['"]/,'').replace(/['"]$/,'') : '';
  }
  return {
    title    : get('title'),
    il       : get('il'),
    alan_turu: get('alan_turu'),
    draft    : get('draft'),
  };
}

function updateHero(text, img, title) {
  const obj = JSON.stringify({
    url    : img.url,
    alt    : title,
    caption: title,
    credit : img.credit,
    license: img.license,
  });
  return text.replace(/(\s*hero:\s*)(\{[^}]+\})/, (_, prefix) => prefix + obj);
}

async function main() {
  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
    catch(_) {}
  }
  console.log(`Mevcut ilerleme: ${Object.keys(progress).length} dosya işlendi`);

  const allFiles = walkMD(CONTENT_DIR);
  const todo = allFiles.filter(fp => {
    const slug = path.basename(fp, '.md');
    return !progress[slug];
  });

  console.log(`İşlenecek: ${todo.length} / ${allFiles.length}`);
  console.log('Ctrl+C ile güvenli şekilde durdurabilirsiniz.\n');

  let found = 0, skipped = 0, notFound = 0, draftSkipped = 0;
  let lastSave = Date.now();

  const processFile = async (fp) => {
    const slug = path.basename(fp, '.md');
    const text = fs.readFileSync(fp, 'utf8');
    const meta = getMeta(text);

    // Skip draft pages
    if (meta.draft === 'true') {
      progress[slug] = 'draft';
      draftSkipped++;
      return;
    }

    // Skip types that are unlikely to have specific images
    if (!isSearchable(meta.title, meta.alan_turu)) {
      progress[slug] = 'skipped';
      skipped++;
      return;
    }

    const img = await searchPlace(meta.title, meta.il);
    if (img) {
      const updated = updateHero(text, img, meta.title);
      if (updated !== text) {
        fs.writeFileSync(fp, updated, 'utf8');
        found++;
      }
      progress[slug] = 'found:' + img.url.split('/').pop().substring(0, 40);
    } else {
      progress[slug] = 'not_found';
      notFound++;
    }

    // Save progress every 30 seconds
    if (Date.now() - lastSave > 30000) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
      lastSave = Date.now();
      const done = found + skipped + notFound + draftSkipped;
      const total = todo.length;
      const pct = Math.round(done / total * 100);
      console.log(`[${pct}%] ${done}/${total} — bulundu: ${found}, bulunamadı: ${notFound}`);
    }
  };

  // Process in batches of PARALLEL
  for (let i = 0; i < todo.length; i += PARALLEL) {
    const batch = todo.slice(i, i + PARALLEL);
    await Promise.all(batch.map(processFile));
  }

  // Final save
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');

  console.log('\n═══ RAPOR ═══');
  console.log(`Toplam dosya       : ${allFiles.length}`);
  console.log(`Özel görsel bulundu: ${found}`);
  console.log(`Bulunamadı         : ${notFound}`);
  console.log(`Atlandı (tür)      : ${skipped}`);
  console.log(`Atlandı (draft)    : ${draftSkipped}`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nDurduruldu. İlerleme kaydedildi.');
  process.exit(0);
});

main().catch(e => { console.error(e); process.exit(1); });
