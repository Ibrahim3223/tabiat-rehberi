'use strict';
/**
 * fix-image-dedup.cjs
 * Aynı görselin yüzlerce dosyada tekrarlanmasını önler.
 * Strateji:
 *   1) Cache'deki tüm görselleri alan_turu bazında havuzla
 *   2) Her türün tüm dosyaları için global round-robin ata (URL başına max 3 kullanım)
 *   3) Yeterli görsel yoksa Wikimedia'dan daha fazla çek
 */
const fs    = require('fs');
const path  = require('path');
const https = require('https');

const CONTENT_DIR   = 'content/alanlar';
const CACHE_FILE    = 'scripts/wikimedia_cache_v2.json';
const RATE_LIMIT_MS = 1300;
const MAX_USE       = 3;   // bir URL en fazla kaç farklı dosyada kullanılabilir
const UA = 'tabiatrehberi.com/1.0 (doga; contact@tabiatrehberi.com)';

const TYPE_QUERIES = {
  'tepe'            : ['Turkey hill tepe nature landscape', 'Turkey mountain tepesi'],
  'dag'             : ['Turkey mountain dağ nature', 'Turkey dağı landscape'],
  'plaj'            : ['Turkey beach coast sea', 'Turkey plajı kıyı'],
  'milli-park'      : ['Turkey national park nature', 'Turkey tabiat parkı'],
  'jeopark'         : ['Turkey geology jeopark landscape', 'Turkey geological'],
  'ada'             : ['Turkey island sea nature', 'Turkey adası'],
  'gol'             : ['Turkey lake nature göl', 'Turkey gölü'],
  'selalesi'        : ['Turkey waterfall şelale nature', 'Turkey waterfall stream'],
  'yayla'           : ['Turkey plateau highland yayla', 'Turkey highland meadow'],
  'kanyon'          : ['Turkey canyon gorge kanyon', 'Turkey gorge river'],
  'termal-kaynak'   : ['Turkey hot spring thermal', 'Turkey kaplıca ılıca termal'],
  'kus-cenneti'     : ['Turkey bird sanctuary wetland kuş', 'Turkey bird wildlife'],
  'magara'          : ['Turkey cave mağara nature', 'Turkey underground cave'],
  'tabiat-parki'    : ['Turkey nature park tabiat', 'Turkey scenic landscape'],
  'botanik-bahcesi' : ['Turkey botanical garden', 'Turkey park garden flowers'],
  'tabiat-aniti'    : ['Turkey natural monument', 'Turkey nature landscape scenic'],
  'kayak-merkezi'   : ['Turkey ski resort mountain snow', 'Turkey snow mountain'],
  'orman'           : ['Turkey forest orman nature', 'Turkey woodland trees'],
  'sulak-alan'      : ['Turkey wetland sulak bataklık', 'Turkey marsh lake'],
  'tabiat-aniti'    : ['Turkey natural landmark', 'Turkey nature scenic'],
  'default'         : ['Turkey nature landscape', 'Turkey scenic doğa'],
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
  if (/\b(map|chart|diagram|schedule|report|classification|figure|table|document|scan|painting|drawing|executive_order|wild_scenic_river|prairie_dog|railway|train|locomotive|car_)\b/i.test(url)) return false;
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

async function searchWikimedia(query, limit = 50) {
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=${limit}` +
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
  return { title: get('title'), il: get('il'), tur: get('alan_turu') };
}

function updateHero(text, img, title) {
  const obj = JSON.stringify({ url: img.url, alt: title, caption: title, credit: img.credit, license: img.license });
  return text.replace(/(\s*hero:\s*)(\{[^}]+\})/, (_, prefix) => prefix + obj);
}

async function main() {
  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch(_) {}
  }

  // Step 1: Read all files
  console.log('Dosyalar okunuyor...');
  const allFiles = walkMD(CONTENT_DIR);
  const fileData = allFiles.map(fp => {
    const text = fs.readFileSync(fp, 'utf8');
    const meta = getMeta(text);
    const hm   = text.match(/hero:.*?"url":"([^"]+)"/);
    return { fp, text, meta, currentUrl: hm ? hm[1] : '' };
  });
  console.log(`Toplam: ${fileData.length} dosya`);

  // Step 2: Build per-type image pool from cache (all groups of same tur combined)
  const typePool = {}; // tur → [{url, credit, license}]
  for (const [key, imgs] of Object.entries(cache)) {
    const tur = key.split('__')[1] || 'default';
    if (!typePool[tur]) typePool[tur] = [];
    for (const img of imgs) {
      if (isGoodImage(img.url) && !typePool[tur].find(x => x.url === img.url)) {
        typePool[tur].push(img);
      }
    }
  }

  // Step 3: Count current URL usage
  const urlUsage = {};
  for (const f of fileData) {
    if (f.currentUrl) urlUsage[f.currentUrl] = (urlUsage[f.currentUrl] || 0) + 1;
  }

  // Identify overused URLs
  const overused = new Set(Object.entries(urlUsage).filter(([,c]) => c > MAX_USE).map(([u]) => u));
  console.log(`Aşırı kullanılan URL: ${overused.size}`);

  // Step 4: Group files by tur, find which need reassignment
  const byTur = {};
  for (const f of fileData) {
    const tur = f.meta.tur || 'default';
    if (!byTur[tur]) byTur[tur] = [];
    byTur[tur].push(f);
  }

  // Step 5: For each tur, check if pool is large enough; fetch more if needed
  let apiCalls = 0;
  for (const [tur, files] of Object.entries(byTur)) {
    const pool = typePool[tur] || [];
    const needFiles = files.filter(f => overused.has(f.currentUrl));
    if (needFiles.length === 0) continue;

    // How many unique slots do we need?
    const uniqueNeeded = Math.ceil(needFiles.length / MAX_USE);
    const currentUnique = pool.length;

    if (currentUnique < uniqueNeeded) {
      const queries = TYPE_QUERIES[tur] || TYPE_QUERIES['default'];
      process.stdout.write(`Fetching for ${tur}: ${currentUnique} var, ${uniqueNeeded} gerekli → `);
      for (const q of queries) {
        if (pool.length >= uniqueNeeded + 10) break;
        const results = await searchWikimedia(q, 80);
        apiCalls++;
        for (const r of results) {
          if (!pool.find(x => x.url === r.url) && isGoodImage(r.url)) {
            pool.push(r);
          }
        }
      }
      typePool[tur] = pool;
      console.log(`${pool.length} görsel`);
    }
  }
  console.log(`\nWikimedia API çağrısı: ${apiCalls}`);

  // Step 6: Reassign overused files
  // For each tur, build a cursor-based assignment that avoids overused URLs
  let fixed = 0;
  const globalUrlCount = { ...urlUsage };

  for (const [tur, files] of Object.entries(byTur)) {
    const pool = typePool[tur] || typePool['default'] || [];
    if (pool.length === 0) continue;

    const needFiles = files.filter(f => overused.has(f.currentUrl));
    if (needFiles.length === 0) continue;

    // Build available URL queue: prefer URLs with low usage count
    const available = pool.filter(img => (globalUrlCount[img.url] || 0) < MAX_USE)
                          .sort((a, b) => (globalUrlCount[a.url] || 0) - (globalUrlCount[b.url] || 0));

    let cursor = 0;
    for (const f of needFiles) {
      // Find next available image
      let img = null;
      for (let i = 0; i < available.length; i++) {
        const candidate = available[(cursor + i) % available.length];
        if ((globalUrlCount[candidate.url] || 0) < MAX_USE) {
          img = candidate;
          cursor = (cursor + i + 1) % available.length;
          break;
        }
      }
      if (!img) {
        // All at limit, increase limit by 1 and try again
        img = available[cursor % available.length];
        cursor++;
      }
      if (!img) continue;

      globalUrlCount[img.url] = (globalUrlCount[img.url] || 0) + 1;
      // Reduce old URL count
      if (f.currentUrl) globalUrlCount[f.currentUrl] = Math.max(0, (globalUrlCount[f.currentUrl] || 1) - 1);

      const updated = updateHero(f.text, img, f.meta.title || 'Doğal Alan');
      if (updated !== f.text) {
        fs.writeFileSync(f.fp, updated, 'utf8');
        fixed++;
      }
    }
  }

  // Step 7: Save updated cache
  // Merge typePool back into cache (per-type key)
  for (const [tur, imgs] of Object.entries(typePool)) {
    cache['_type__' + tur] = imgs;
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');

  // Step 8: Report
  console.log('\n═══ RAPOR ═══');
  console.log(`Güncellenen dosya: ${fixed}`);

  // Final check
  const finalUsage = {};
  for (const fp of allFiles) {
    const t = fs.readFileSync(fp, 'utf8');
    const m = t.match(/hero:.*?"url":"([^"]+)"/);
    if (m) finalUsage[m[1]] = (finalUsage[m[1]] || 0) + 1;
  }
  const finalOver = Object.entries(finalUsage).filter(([,c]) => c > MAX_USE);
  const maxRepeat = Math.max(...Object.values(finalUsage));
  console.log(`Unique URL: ${Object.keys(finalUsage).length}`);
  console.log(`Hala ${MAX_USE}+ tekrar: ${finalOver.length}`);
  console.log(`En çok tekrar: ${maxRepeat}x`);
}

main().catch(e => { console.error(e); process.exit(1); });
