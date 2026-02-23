'use strict';
/**
 * fix-bad-images.cjs
 * 1) Cache'deki kötü görselleri temizle (.djvu, /pageN-, US içerikleri)
 * 2) İyileştirilmiş isGoodImage() ile dosyaları yeniden tara
 * 3) Hala kötü olan hero URL'leri düzelt
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const CONTENT_DIR   = 'content/alanlar';
const CACHE_FILE    = 'scripts/wikimedia_cache_v2.json';
const RATE_LIMIT_MS = 1400;
const MIN_WIDTH     = 700;
const UA = 'tabiatrehberi.com/1.0 (doga rehberi; contact@tabiatrehberi.com)';

const TYPE_KW = {
  'tepe'            : 'hill nature landscape Turkey',
  'dag'             : 'mountain Turkey scenic',
  'plaj'            : 'beach coast sea Turkey',
  'milli-park'      : 'national park Turkey nature',
  'jeopark'         : 'geology landscape Turkey',
  'ada'             : 'island sea Turkey',
  'gol'             : 'lake nature Turkey',
  'selalesi'        : 'waterfall nature Turkey',
  'yayla'           : 'plateau highland meadow Turkey',
  'kanyon'          : 'canyon gorge Turkey',
  'termal-kaynak'   : 'hot spring thermal Turkey',
  'kus-cenneti'     : 'bird sanctuary wetland Turkey',
  'magara'          : 'cave nature Turkey',
  'tabiat-parki'    : 'nature park Turkey',
  'botanik-bahcesi' : 'botanical garden Turkey',
  'tabiat-aniti'    : 'nature Turkey landscape',
  'kayak-merkezi'   : 'ski mountain snow Turkey',
  'default'         : 'nature landscape Turkey',
};

// ── Improved image filter ──────────────────────────────────────────────────
function isGoodImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  const fname = lower.split('/').pop();

  // Must end with real image extension
  if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(fname)) return false;

  // No .djvu page renders
  if (/\.djvu/i.test(url)) return false;

  // No /pageN- document renders (pdf, djvu, etc.)
  if (/\/page\d+-/i.test(url)) return false;

  // No PDF renders
  if (/\.pdf(\.|\/)/i.test(url)) return false;

  // No Internet Archive scans
  if (/IA_/i.test(url)) return false;

  // No SVG or GIF
  if (/\.(svg|gif)(\?|$)/i.test(lower)) return false;

  // No map/chart/diagram/document keyword in filename
  if (/\b(map|chart|diagram|schedule|report|classification|figure|table|document|scan|painting|drawing|executive_order|wild_scenic_river|prairie_dog)\b/i.test(url)) return false;

  // No known US National Park Service / NARA archive images (not Turkey)
  if (/\bNARA\b|-_NARA_-|nps\.gov|usgs\.gov/i.test(url)) return false;

  return true;
}

let lastCall = 0;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

async function searchWikimedia(query) {
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=60` +
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
    if (!isGoodImage(imgUrl)) continue;

    const w = info.thumbwidth || info.width || 0;
    if (w > 0 && w < MIN_WIDTH) continue;

    const license = info.extmetadata?.LicenseShortName?.value ||
                    info.extmetadata?.License?.value || 'CC BY-SA';
    if (/rights\s*reserved/i.test(license)) continue;

    const credit = (page.title || '').replace('File:', '').replace(/_/g, ' ').replace(/\.[^.]+$/, '');
    results.push({ url: imgUrl, credit, license });
    if (results.length >= 10) break;
  }
  return results;
}

async function getImagesForGroup(il, tur) {
  const kw = TYPE_KW[tur] || TYPE_KW['default'];
  const results = [];

  // Strategy 1: il + "Turkey" + type (more constrained to Turkey)
  if (il && il !== 'Türkiye' && il !== 'bilinmiyor') {
    const r1 = await searchWikimedia(`${il} Turkey ${kw}`);
    results.push(...r1);
  }

  // Strategy 2: type + Turkey only
  if (results.length < 5) {
    const r2 = await searchWikimedia(`Turkey ${kw}`);
    results.push(...r2.filter(x => !results.find(e => e.url === x.url)));
  }

  // Strategy 3: generic il landscape Turkey
  if (results.length < 3 && il && il !== 'Türkiye' && il !== 'bilinmiyor') {
    const r3 = await searchWikimedia(`${il} Turkey landscape nature`);
    results.push(...r3.filter(x => !results.find(e => e.url === x.url)));
  }

  // Strategy 4: fallback
  if (results.length === 0) {
    const fb = await searchWikimedia('Turkey nature mountains landscape');
    results.push(...fb);
  }

  return results.slice(0, 10);
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
    title    : get('title').replace(/^[\"']|[\"']$/g, ''),
    il       : get('il'),
    alan_turu: get('alan_turu'),
  };
}

function updateHeroInFile(text, imgData, meta) {
  // Replace any hero with url field
  return text.replace(
    /(\s*hero:\s*)(\{[^}]+\})/,
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

async function main() {
  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch (_) {}
  }

  // Step 1: Clean bad images from cache
  let cacheFixed = 0;
  for (const k of Object.keys(cache)) {
    const before = cache[k].length;
    cache[k] = cache[k].filter(img => isGoodImage(img.url));
    if (cache[k].length < before) cacheFixed++;
  }
  console.log(`Cache temizlendi: ${cacheFixed} grup güncellendi`);

  // Step 2: Scan files for bad hero images
  const allFiles = walkMD(CONTENT_DIR);
  const toFix = [];
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    const heroMatch = t.match(/hero:\s*(\{[^}]+\})/);
    if (!heroMatch) continue;
    const heroUrl = (heroMatch[1].match(/"url"\s*:\s*"([^"]+)"/) || [])[1] || '';
    if (heroUrl && !isGoodImage(heroUrl)) {
      const meta = extractFM(t);
      toFix.push({ fp, text: t, meta });
    }
  }
  console.log(`Kötü görsel içeren dosya: ${toFix.length}`);

  // Group by (il, alan_turu)
  const groups = {};
  for (const pf of toFix) {
    const k = (pf.meta.il || 'bilinmiyor') + '__' + (pf.meta.alan_turu || 'diger');
    if (!groups[k]) groups[k] = { il: pf.meta.il, tur: pf.meta.alan_turu, files: [], images: [], cursor: 0 };
    groups[k].files.push(pf);
  }

  const groupKeys = Object.keys(groups);
  console.log(`Unique grup: ${groupKeys.length}`);

  // Step 3: Fetch new images for groups with insufficient good images
  let apiCalls = 0, groupDone = 0;
  for (const k of groupKeys) {
    const g = groups[k];
    const cachedGood = (cache[k] || []).filter(i => isGoodImage(i.url));

    if (cachedGood.length >= 3) {
      g.images = cachedGood;
      groupDone++;
      continue;
    }

    process.stdout.write(`[${++groupDone}/${groupKeys.length}] ${g.il}/${g.tur} → `);
    const imgs = await getImagesForGroup(g.il, g.tur);
    apiCalls++;
    g.images = imgs;
    cache[k] = imgs;
    console.log(imgs.length + ' görsel');

    if (groupDone % 10 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`\nAPI çağrısı: ${apiCalls}`);

  // Step 4: Assign images and update files
  let fixed = 0, noImg = 0;
  for (const k of groupKeys) {
    const g = groups[k];
    if (g.images.length === 0) { noImg += g.files.length; continue; }
    for (const pf of g.files) {
      const img = g.images[g.cursor % g.images.length];
      g.cursor++;
      const updated = updateHeroInFile(pf.text, img, pf.meta);
      if (updated !== pf.text) {
        fs.writeFileSync(pf.fp, updated, 'utf8');
        fixed++;
      }
    }
  }

  console.log('\n═══ RAPOR ═══');
  console.log(`Güncellenen dosya  : ${fixed}`);
  console.log(`Görsel bulunamayan : ${noImg}`);
  console.log(`Toplam kötü dosya  : ${toFix.length}`);

  // Verify
  let remaining = 0;
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    const hm = t.match(/hero:\s*(\{[^}]+\})/);
    if (hm) {
      const u = (hm[1].match(/"url"\s*:\s*"([^"]+)"/) || [])[1] || '';
      if (u && !isGoodImage(u)) remaining++;
    }
  }
  console.log(`Kalan kötü görsel  : ${remaining}`);
}

main().catch(e => { console.error(e); process.exit(1); });
