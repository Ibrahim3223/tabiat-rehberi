'use strict';
const fs = require('fs'), path = require('path');
const dir = 'content/alanlar';

const targets = [
  // milli-park / YHGS türü
  'amasya-koyulhisar-igdirdag-saricam.md',
  'ankara-kizilcahamam-guvem-uludag-goknari.md',
  'bitlis-adilcevaz-suphan-dagi-yaban-hayati-gelistirme-sahasi.md',
  'mersin-hisardag-ve-gedik-dagi.md',
  'tekkedagi-tabiat-parki.md',
  // dag türü
  'bedesten-dagi.md',
  'cami-dagi.md',
  'cesme-dagi.md',
  'felhan-dagi.md',
  'hamam-dagi.md',
  'hisar-dagi-mersin.md',
  'hisar-dagi.md',
  'hisarli-dagi.md',
  'kervansaray-dagi.md',
  'kilise-dagi.md',
  'kizil-dag-afyonkarahisar.md',
  'kizildag-afyonkarahisar.md',
  'kizilhisar-dagi.md',
  'kochisar-dagi.md',
  'saraycik-dagi.md',
  'seyhan-dagi.md',
  'sivrihisar-daglari.md',
  'suphan-dagi.md',
  'tekke-dagi.md',
  'ziyaret-ardahan-dagi.md',
  'zorbehan-dagi.md',
  // tepe türü
  'han-dagi.md',
  // forest areas
  'ganisipi-dagi.md',
];

let fixed = 0;
for (const f of targets) {
  const fp = path.join(dir, f);
  if (!fs.existsSync(fp)) { console.log('BULUNAMADI:', f); continue; }
  const text = fs.readFileSync(fp, 'utf8');
  if (!/^draft:\s*true/m.test(text)) { console.log('Zaten false:', f); continue; }
  const newText = text.replace(/^draft:\s*true/m, 'draft: false');
  fs.writeFileSync(fp, newText, 'utf8');
  fixed++;
  console.log('✓', f);
}
console.log('\nDüzeltilen:', fixed);
