'use strict';
const https = require('https');

function apiFetch(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'tabiatrehberi/1.0' } }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(JSON.parse(d)));
    }).on('error', rej);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isGoodImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  const fname = lower.split('/').pop();
  if (!/\.(jpg|jpeg|png|webp)(\?|$)/.test(fname)) return false;
  if (/\.djvu/i.test(url)) return false;
  if (/\/page\d+-/i.test(url)) return false;
  if (/\.pdf(\.|\/)/i.test(url)) return false;
  if (/\bNARA\b/.test(url)) return false;
  return true;
}

async function searchFor(name) {
  const q = encodeURIComponent(name);
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    '&gsrnamespace=6&gsrsearch=' + q + '&gsrlimit=5' +
    '&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json';
  const data = await apiFetch(url);
  const pages = data.query ? data.query.pages || {} : {};
  const results = Object.values(pages)
    .map(p => p.imageinfo && p.imageinfo[0] ? p.imageinfo[0].thumburl || '' : '')
    .filter(u => isGoodImage(u));
  return results[0] || null;
}

async function main() {
  const places = [
    'İstınata Kaplıcası',
    'Abant Gölü',
    'Kamçı Tepesi Siirt',
    'Uludağ',
    'Pamukkale',
    'Kaçkar Dağları',
    'Sarıot Kaplıcası Bolu',
    'Gürlevik Şelalesi',
    'Nemrut Gölü',
    'Tuz Gölü',
  ];
  for (const p of places) {
    const result = await searchFor(p);
    if (result) {
      console.log('BULUNDU  ' + p + ':');
      console.log('         ' + result.split('/').pop().substring(0, 70));
    } else {
      console.log('BULUNAMADI: ' + p);
    }
    await sleep(1300);
  }
}
main().catch(console.error);
