'use strict';
const fs = require('fs');

const CONTENT_DIR = 'content/alanlar';
const keywords = ['hamam','türbe','tekke','cami','külliye','müze','stadyum',
  'mezarlık','kervansaray','kilise','saray','medrese','bedesten','mescid','hisar',
  // "han", "sur", "köprü", "çeşme" — more careful word boundary check
  'han','sur','köprü','çeşme'];

const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

let facil = 0, futbol = 0, hektar = 0;
const titleProblems = [];

for (const f of files) {
  const t = fs.readFileSync(CONTENT_DIR + '/' + f, 'utf8');
  const isDraft = /^draft:\s*true/m.test(t);

  if (t.includes('fácil')) facil++;
  if (t.includes('200 futbol sahası')) futbol++;
  if (t.includes('140 hektarlık')) hektar++;

  if (isDraft) continue;

  const titleM = t.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (!titleM) continue;
  const title = titleM[1].toLowerCase();

  for (const kw of keywords) {
    // Word boundary: keyword must not be surrounded by Turkish word chars
    const re = new RegExp('(?<![a-zA-ZçğışöüÇĞİŞÖÜ])' + kw + '(?![a-zA-ZçğışöüÇĞİŞÖÜ])', 'i');
    if (re.test(title)) {
      titleProblems.push({ f, title, kw });
      break;
    }
  }
}

console.log('Kalan sorunlar:');
console.log('  fácil        :', facil);
console.log('  200 futbol   :', futbol);
console.log('  140 hektarlık:', hektar);
console.log('\nBaşlık keyword ama draft değil (word boundary):', titleProblems.length);
titleProblems.slice(0, 20).forEach(x => console.log('  [' + x.kw + ']', x.title, '→', x.f));
