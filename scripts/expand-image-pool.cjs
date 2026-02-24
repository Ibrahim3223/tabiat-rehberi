'use strict';
/**
 * expand-image-pool.cjs
 * Tepe/dağ/plaj gibi büyük türler için görsel havuzunu genişlet,
 * sonra MAX_USE=15 ile yeniden atama yap
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const CONTENT_DIR   = 'content/alanlar';
const CACHE_FILE    = 'scripts/wikimedia_cache_v2.json';
const RATE_LIMIT_MS = 1300;
const MAX_USE       = 15;
const UA = 'tabiatrehberi.com/1.0 (doga; contact@tabiatrehberi.com)';

// Multiple varied queries per type for maximum diversity
const TYPE_QUERIES = {
  'tepe': [
    'Turkey hill nature landscape',
    'Türkiye tepe manzara doğa',
    'Turkey mountain peak scenic',
    'Anadolu tepe yaylaları fotoğraf',
    'Turkey highland hill summer',
    'Turkey hill forest landscape',
    'Turkey rural landscape hill',
  ],
  'dag': [
    'Turkey mountain dag nature',
    'Türkiye dağ manzara',
    'Turkey mountain range landscape',
    'Anadolu dağları fotoğraf',
    'Turkey mountain peak snow',
    'Turkey mountain valley scenic',
    'Turkey mountain forest nature',
  ],
  'plaj': [
    'Turkey beach sea coast',
    'Türkiye plaj deniz sahil',
    'Turkey Mediterranean beach',
    'Turkey Aegean sea coast',
    'Turkey Black Sea beach',
    'Turkey sandy beach summer',
    'Turkey coast rocky sea',
  ],
  'milli-park': [
    'Turkey national park nature',
    'Türkiye milli park doğa',
    'Turkey nature reserve park',
    'Turkey protected area landscape',
    'Turkey wildlife nature park',
    'Turkey forest national park',
  ],
};

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
  if (/\b(map|chart|diagram|schedule|report|figure|table|document|scan|painting|drawing|railway|train|locomotive|prairie_dog|wild_scenic|executive_order)\b/i.test(url)) return false;
  if (/\bNARA\b|-_NARA_-/i.test(url)) return false;
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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); }});
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function searchWikimedia(query) {
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=80` +
    `&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=900&format=json`;
  let data;
  try { data = await rateFetch(url); } catch(e) { return []; }
  if (!data.query?.pages) return [];
  const results = [];
  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const imgUrl = info.thumburl || info.url;
    if (!isGoodImage(imgUrl)) continue;
    if ((info.thumbwidth || info.width || 0) < 600) continue;
    const license = info.extmetadata?.LicenseShortName?.value || '';
    if (/rights\s*reserved/i.test(license)) continue;
    const credit = (page.title || '').replace('File:', '').replace(/_/g,' ').replace(/\.[^.]+$/,'');
    results.push({ url: imgUrl, credit, license: license || 'CC BY-SA' });
  }
  return results;
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
  return { title: get('title'), tur: get('alan_turu') };
}

function updateHero(text, img, title) {
  const obj = JSON.stringify({ url: img.url, alt: title, caption: title, credit: img.credit, license: img.license });
  return text.replace(/(\s*hero:\s*)(\{[^}]+\})/, (_, prefix) => prefix + obj);
}

async function main() {
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch(_) {}
  }

  // Step 1: Expand pools for big types
  const typePool = {};
  // Load existing per-type cache entries
  for (const [k, imgs] of Object.entries(cache)) {
    if (k.startsWith('_type__')) {
      const tur = k.slice(7);
      typePool[tur] = imgs.filter(i => isGoodImage(i.url));
    } else {
      const tur = k.split('__')[1] || 'default';
      if (!typePool[tur]) typePool[tur] = [];
      for (const img of imgs) {
        if (isGoodImage(img.url) && !typePool[tur].find(x => x.url === img.url)) {
          typePool[tur].push(img);
        }
      }
    }
  }

  let apiCalls = 0;
  for (const [tur, queries] of Object.entries(TYPE_QUERIES)) {
    const pool = typePool[tur] || [];
    console.log(`${tur}: mevcut ${pool.length} görsel`);
    for (const q of queries) {
      const results = await searchWikimedia(q);
      apiCalls++;
      let added = 0;
      for (const r of results) {
        if (!pool.find(x => x.url === r.url)) { pool.push(r); added++; }
      }
      process.stdout.write(` +${added}`);
    }
    typePool[tur] = pool;
    console.log(` → toplam ${pool.length}`);
  }
  console.log(`\nAPI çağrısı: ${apiCalls}`);

  // Step 2: Save expanded pools to cache
  for (const [tur, imgs] of Object.entries(typePool)) {
    cache['_type__' + tur] = imgs;
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');

  // Step 3: Reassign with MAX_USE=15
  console.log('\nYeniden atama yapılıyor (MAX_USE=' + MAX_USE + ')...');
  const allFiles = walkMD(CONTENT_DIR);

  // Count current usage
  const urlUsage = {};
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    const m = t.match(/hero:.*?"url":"([^"]+)"/);
    if (m) urlUsage[m[1]] = (urlUsage[m[1]] || 0) + 1;
  }
  const overused = new Set(Object.entries(urlUsage).filter(([,c]) => c > MAX_USE).map(([u]) => u));
  console.log(`Hala aşırı kullanılan URL: ${overused.size}`);

  // Group files by tur
  const byTur = {};
  for (const fp of allFiles) {
    const text = fs.readFileSync(fp, 'utf8');
    const meta = getMeta(text);
    const tur = meta.tur || 'default';
    const hm = text.match(/hero:.*?"url":"([^"]+)"/);
    const currentUrl = hm ? hm[1] : '';
    if (overused.has(currentUrl)) {
      if (!byTur[tur]) byTur[tur] = [];
      byTur[tur].push({ fp, text, meta, currentUrl });
    }
  }

  const globalCount = { ...urlUsage };
  let fixed = 0;

  for (const [tur, files] of Object.entries(byTur)) {
    const pool = (typePool[tur] || typePool['default'] || [])
      .sort((a, b) => (globalCount[a.url] || 0) - (globalCount[b.url] || 0));
    if (pool.length === 0) continue;

    let cursor = 0;
    for (const f of files) {
      let img = null;
      for (let i = 0; i < pool.length * 2; i++) {
        const c = pool[(cursor + i) % pool.length];
        if ((globalCount[c.url] || 0) < MAX_USE) { img = c; cursor = (cursor + i + 1) % pool.length; break; }
      }
      if (!img) { img = pool[cursor % pool.length]; cursor++; }
      if (!img) continue;

      globalCount[img.url] = (globalCount[img.url] || 0) + 1;
      if (f.currentUrl) globalCount[f.currentUrl] = Math.max(0, (globalCount[f.currentUrl] || 1) - 1);

      const updated = updateHero(f.text, img, f.meta.title || 'Doğal Alan');
      if (updated !== f.text) { fs.writeFileSync(f.fp, updated, 'utf8'); fixed++; }
    }
  }

  console.log(`Güncellenen: ${fixed}`);

  // Final stats
  const finalUsage = {};
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    const m = t.match(/hero:.*?"url":"([^"]+)"/);
    if (m) finalUsage[m[1]] = (finalUsage[m[1]] || 0) + 1;
  }
  const max = Math.max(...Object.values(finalUsage));
  const over15 = Object.values(finalUsage).filter(c => c > MAX_USE).length;
  console.log(`\n═══ SONUÇ ═══`);
  console.log(`Unique URL   : ${Object.keys(finalUsage).length}`);
  console.log(`Max tekrar   : ${max}x`);
  console.log(`${MAX_USE}+ tekrar (URL): ${over15}`);
}

main().catch(e => { console.error(e); process.exit(1); });
