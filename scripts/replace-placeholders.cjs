'use strict';
/**
 * replace-placeholders.cjs
 * Wikimedia Commons API'sinden gerçek görsel URL'leri alarak
 * placehold.co placeholder'larını değiştirir.
 *
 * Çalıştır: node scripts/replace-placeholders.cjs
 * Devam et: node scripts/replace-placeholders.cjs --resume
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────
const CONTENT_DIR    = 'content/alanlar';
const CACHE_FILE     = 'scripts/wikimedia_cache.json';
const PROGRESS_FILE  = 'scripts/wikimedia_progress.json';
const RATE_LIMIT_MS  = 1300;   // ms between API calls
const IMAGES_PER_GROUP = 10;   // how many images to fetch per group
const MIN_IMG_WIDTH  = 600;    // px minimum

const UA = 'tabiatrehberi.com/1.0 (doga rehberi; contact@tabiatrehberi.com)';

// Turkish alan_turu → Wikimedia search keywords
const TYPE_KW = {
  'tepe'             : 'hill peak landscape nature',
  'dag'              : 'mountain peak landscape',
  'plaj'             : 'beach coast sea',
  'milli-park'       : 'national park nature',
  'jeopark'          : 'geopark geology landscape',
  'ada'              : 'island coast sea',
  'gol'              : 'lake nature',
  'selalesi'         : 'waterfall nature',
  'yayla'            : 'plateau highland meadow',
  'kanyon'           : 'canyon gorge',
  'termal-kaynak'    : 'hot spring thermal',
  'kus-cenneti'      : 'bird sanctuary wetland',
  'magara'           : 'cave nature',
  'tabiat-parki'     : 'nature park landscape',
  'botanik-bahcesi'  : 'botanical garden nature',
  'tabiat-aniti'     : 'natural monument landscape',
  'kayak-merkezi'    : 'ski resort mountain snow',
  'default'          : 'nature landscape Turkey',
};

// ── Helpers ───────────────────────────────────────────────────────────────
let lastCall = 0;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function rateFetch(url) {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  return new Promise((resolve, reject) => {
    const opts = Object.assign(require('url').parse(url), {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' }
    });
    const req = https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
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

function extractFM(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = m[1];
  function get(key) {
    const r = fm.match(new RegExp('^' + key + ':\\s*["\']?(.+?)["\']?\\s*$', 'm'));
    return r ? r[1].trim() : '';
  }
  return {
    title    : get('title').replace(/^["']|["']$/g, ''),
    il       : get('il'),
    alan_turu: get('alan_turu'),
    ilce     : get('ilce'),
    bolge    : get('bolge'),
  };
}

// ── Wikimedia search ──────────────────────────────────────────────────────
async function searchWikimedia(query) {
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=${IMAGES_PER_GROUP}` +
    `&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=800&format=json`;

  let data;
  try { data = await rateFetch(url); }
  catch (e) { return []; }

  if (!data.query?.pages) return [];

  const results = [];
  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const imgUrl = info.thumburl || info.url;
    if (!imgUrl) continue;
    if (/\.svg$/i.test(imgUrl)) continue;      // skip SVG
    if (/\.gif$/i.test(imgUrl)) continue;      // skip GIF
    const w = info.thumbwidth || info.width || 0;
    if (w > 0 && w < MIN_IMG_WIDTH) continue;  // skip tiny images

    const license = info.extmetadata?.LicenseShortName?.value ||
                    info.extmetadata?.License?.value || 'CC BY-SA';
    if (/rights reserved/i.test(license)) continue; // skip all-rights-reserved

    const credit = (page.title || '').replace('File:', '').replace(/_/g, ' ');
    results.push({ url: imgUrl, credit, license });
    if (results.length >= IMAGES_PER_GROUP) break;
  }
  return results;
}

async function getImagesForGroup(il, tur) {
  const kw = TYPE_KW[tur] || TYPE_KW['default'];

  // Strategy 1: il-specific + type
  const q1 = il === 'Türkiye'
    ? `${kw} Turkey nature`
    : `${il} Turkey ${kw}`;
  let imgs = await searchWikimedia(q1);

  // Strategy 2: il-specific + landscape (fallback)
  if (imgs.length < 3 && il !== 'Türkiye') {
    const q2 = `${il} Turkey nature landscape`;
    const more = await searchWikimedia(q2);
    imgs = imgs.concat(more.filter(m => !imgs.find(i => i.url === m.url)));
  }

  // Strategy 3: generic Turkey + type
  if (imgs.length < 3) {
    const q3 = `Turkey ${kw}`;
    const more = await searchWikimedia(q3);
    imgs = imgs.concat(more.filter(m => !imgs.find(i => i.url === m.url)));
  }

  // Strategy 4: ultimate fallback
  if (imgs.length === 0) {
    imgs = await searchWikimedia('Turkey landscape nature mountains');
  }

  return imgs.slice(0, IMAGES_PER_GROUP);
}

// ── File update ───────────────────────────────────────────────────────────
function updateHeroInFile(text, imgData, meta) {
  // Replace hero line with placehold.co
  return text.replace(
    /(\s*hero:\s*)(\{[^}]*placehold\.co[^}]*\})/,
    (match, prefix) => {
      const obj = {
        url    : imgData.url,
        alt    : meta.title || 'Doğal Alan',
        caption: meta.title || 'Doğal Alan',
        credit : imgData.credit,
        license: imgData.license,
      };
      return prefix + JSON.stringify(obj);
    }
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const resume = process.argv.includes('--resume');

  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch (_) {}
  }

  // Load progress
  let done = new Set();
  if (resume && fs.existsSync(PROGRESS_FILE)) {
    try {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      done = new Set(p.done || []);
      console.log('Devam ediliyor. Daha önce tamamlanan:', done.size, 'dosya');
    } catch (_) {}
  }

  function saveState() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ done: [...done] }), 'utf8');
  }

  // Phase 1: Scan files
  console.log('Dosyalar taranıyor...');
  const allFiles = walkMD(CONTENT_DIR);
  const placeholderFiles = [];
  for (const fp of allFiles) {
    if (done.has(fp)) continue;
    const t = fs.readFileSync(fp, 'utf8');
    if (t.indexOf('placehold.co') === -1) continue;
    const meta = extractFM(t);
    placeholderFiles.push({ fp, text: t, meta });
  }
  console.log('İşlenecek placeholder dosyası:', placeholderFiles.length);

  // Phase 2: Group by (il, alan_turu)
  const groups = {};
  for (const pf of placeholderFiles) {
    const k = (pf.meta.il || 'bilinmiyor') + '__' + (pf.meta.alan_turu || 'diger');
    if (!groups[k]) groups[k] = { il: pf.meta.il, tur: pf.meta.alan_turu, files: [], images: [], cursor: 0 };
    groups[k].files.push(pf);
  }

  const groupKeys = Object.keys(groups);
  console.log('Unique il+tur grubu:', groupKeys.length);

  // Phase 3: Fetch images for each group
  let apiCallCount = 0;
  let groupDone = 0;
  for (const k of groupKeys) {
    const g = groups[k];
    if (cache[k]) {
      g.images = cache[k];
      groupDone++;
      continue;
    }
    process.stdout.write(`[${++groupDone}/${groupKeys.length}] ${g.il}/${g.tur} → `);
    const imgs = await getImagesForGroup(g.il, g.tur);
    apiCallCount++;
    g.images = imgs;
    cache[k] = imgs;
    console.log(imgs.length + ' görsel');

    // Save cache periodically
    if (groupDone % 20 === 0) saveState();
  }
  saveState();
  console.log(`\nAPI çağrısı: ${apiCallCount} | Cache hit: ${groupKeys.length - apiCallCount}`);

  // Phase 4 & 5: Assign images and update files
  let fixed = 0;
  let noImage = 0;
  let total = placeholderFiles.length;
  let processed = 0;

  for (const k of groupKeys) {
    const g = groups[k];
    if (g.images.length === 0) {
      noImage += g.files.length;
      continue;
    }
    for (const pf of g.files) {
      const img = g.images[g.cursor % g.images.length];
      g.cursor++;
      const updated = updateHeroInFile(pf.text, img, pf.meta);
      if (updated !== pf.text) {
        fs.writeFileSync(pf.fp, updated, 'utf8');
        done.add(pf.fp);
        fixed++;
      }
      processed++;
      if (processed % 500 === 0) {
        process.stdout.write(`\rDosya yazılıyor: ${processed}/${total}`);
        saveState();
      }
    }
  }

  saveState();
  console.log(`\n\n═══ RAPOR ═══`);
  console.log(`Güncellenen dosya  : ${fixed}`);
  console.log(`Görsel bulunamayan : ${noImage}`);
  console.log(`Toplam placeholder : ${total}`);
  console.log(`Kalan placeholder  : ${total - fixed}`);

  // Verify: count remaining placeholders
  let remaining = 0;
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    if (t.indexOf('placehold.co') !== -1) remaining++;
  }
  console.log(`Doğrulama - kalan placeholder: ${remaining}`);
}

main().catch(e => { console.error(e); process.exit(1); });
