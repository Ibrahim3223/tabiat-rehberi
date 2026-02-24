'use strict';
/**
 * replace-placeholders-v2.cjs
 * Geliştirilmiş versiyon:
 * - PDF/doküman görsellerini filtrele
 * - filetype:JPEG arama parametresi ekle
 * - İkincil arama stratejileri
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const CONTENT_DIR   = 'content/alanlar';
const CACHE_FILE    = 'scripts/wikimedia_cache_v2.json';
const RATE_LIMIT_MS = 1300;
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

// ── Strict image URL filter ───────────────────────────────────────────────
function isGoodImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Must be a real image extension (final extension before thumb suffix)
  if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(lower.split('/').pop())) return false;
  // No PDF page renderings
  if (/\.pdf(\.jpg|\.png|\/page)/i.test(url)) return false;
  // No Internet Archive scans
  if (/IA_/i.test(url)) return false;
  // No maps/charts/diagrams common naming
  if (/\b(map|chart|diagram|schedule|report|classification|figure|table|document|scan)\b/i.test(url)) return false;
  // No SVG or GIF
  if (/\.(svg|gif)(\?|$)/i.test(lower)) return false;
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

async function searchWikimedia(query) {
  const q = encodeURIComponent(query);
  // gsrlimit=50 to compensate for aggressive filtering
  const url = `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=50` +
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

  // Strategy 1: il + type
  if (il && il !== 'Türkiye' && il !== 'bilinmiyor') {
    const q1 = `${il} ${kw}`;
    const r1 = await searchWikimedia(q1);
    results.push(...r1);
  }

  // Strategy 2: type only (Turkey level)
  if (results.length < 5) {
    const q2 = `Turkey ${kw}`;
    const r2 = await searchWikimedia(q2);
    results.push(...r2.filter(x => !results.find(e => e.url === x.url)));
  }

  // Strategy 3: generic il landscape
  if (results.length < 3 && il && il !== 'Türkiye' && il !== 'bilinmiyor') {
    const q3 = `${il} landscape nature scenery`;
    const r3 = await searchWikimedia(q3);
    results.push(...r3.filter(x => !results.find(e => e.url === x.url)));
  }

  // Strategy 4: ultimate fallback
  if (results.length === 0) {
    const fallback = await searchWikimedia('Turkey nature mountains forest landscape');
    results.push(...fallback);
  }

  return results.slice(0, 10);
}

function updateHeroInFile(text, imgData, meta) {
  return text.replace(
    /(\s*hero:\s*)(\{[^}]*placehold\.co[^}]*\}|\{[^}]*upload\.wikimedia[^}]*\})/,
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
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch (_) {}
  }

  function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  }

  // Scan all files (including previously "fixed" ones that got bad images)
  console.log('Dosyalar taranıyor...');
  const allFiles = walkMD(CONTENT_DIR);
  const toFix = [];

  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    // Check for placeholder OR bad wikimedia image (PDF etc.)
    const heroMatch = t.match(/hero:\s*(\{[^}]+\})/);
    if (!heroMatch) continue;
    const heroUrl = (heroMatch[1].match(/"url"\s*:\s*"([^"]+)"/) || [])[1] || '';
    if (heroUrl.indexOf('placehold.co') !== -1 || !isGoodImage(heroUrl)) {
      const meta = extractFM(t);
      toFix.push({ fp, text: t, meta });
    }
  }

  console.log('Düzeltilecek dosya:', toFix.length);

  // Group
  const groups = {};
  for (const pf of toFix) {
    const k = (pf.meta.il || 'bilinmiyor') + '__' + (pf.meta.alan_turu || 'diger');
    if (!groups[k]) groups[k] = { il: pf.meta.il, tur: pf.meta.alan_turu, files: [], images: [], cursor: 0 };
    groups[k].files.push(pf);
  }

  const groupKeys = Object.keys(groups);
  console.log('Unique il+tur grubu:', groupKeys.length);

  // Fetch
  let apiCalls = 0, groupDone = 0;
  for (const k of groupKeys) {
    const g = groups[k];
    const cached = cache[k];
    // Use cache only if it has good images
    if (cached && cached.filter(x => isGoodImage(x.url)).length >= 3) {
      g.images = cached.filter(x => isGoodImage(x.url));
      groupDone++;
      continue;
    }
    process.stdout.write(`[${++groupDone}/${groupKeys.length}] ${g.il}/${g.tur} → `);
    const imgs = await getImagesForGroup(g.il, g.tur);
    apiCalls++;
    g.images = imgs;
    cache[k] = imgs;
    console.log(imgs.length + ' görsel');
    if (groupDone % 15 === 0) saveCache();
  }
  saveCache();
  console.log(`\nAPI çağrısı: ${apiCalls}`);

  // Assign & write
  let fixed = 0, noImg = 0;
  const total = toFix.length;
  let processed = 0;

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
      processed++;
      if (processed % 500 === 0) {
        process.stdout.write(`\rDosya yazılıyor: ${processed}/${total}`);
      }
    }
  }

  console.log(`\n\n═══ RAPOR ═══`);
  console.log(`Güncellenen dosya  : ${fixed}`);
  console.log(`Görsel bulunamayan : ${noImg}`);
  console.log(`Toplam işlenen     : ${total}`);

  // Final verify
  let remaining = 0, badRemaining = 0;
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    if (t.indexOf('placehold.co') !== -1) remaining++;
    const hm = t.match(/hero:\s*(\{[^}]+\})/);
    if (hm) {
      const u = (hm[1].match(/"url"\s*:\s*"([^"]+)"/) || [])[1] || '';
      if (u && !isGoodImage(u)) badRemaining++;
    }
  }
  console.log(`Kalan placeholder  : ${remaining}`);
  console.log(`Kalan kötü görsel  : ${badRemaining}`);
}

main().catch(e => { console.error(e); process.exit(1); });
