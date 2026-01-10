const data = require('./data/master-lists/adalar-merged.json');

console.log('İL/İLÇE VERİ KALİTESİ KONTROLÜ\n' + '='.repeat(50));

// İlk 20 adayı kontrol et
data.alanlar.slice(0, 20).forEach(ada => {
  const ilProblem = ada.il === 'Türkiye' || !ada.il || ada.il === '';
  const ilceProblem = !ada.ilce || ada.ilce === '';

  if (ilProblem || ilceProblem) {
    console.log(`\n❌ ${ada.ad}:`);
    console.log(`   il: "${ada.il}" ${ilProblem ? '(HATA!)' : ''}`);
    console.log(`   ilce: "${ada.ilce}" ${ilceProblem ? '(BOŞ!)' : ''}`);
  } else {
    console.log(`\n✅ ${ada.ad}: ${ada.il} / ${ada.ilce}`);
  }
});

// İstatistik
const turkyeCount = data.alanlar.filter(a => a.il === 'Türkiye').length;
const bosIlCount = data.alanlar.filter(a => !a.il || a.il === '').length;
const bosIlceCount = data.alanlar.filter(a => !a.ilce || a.ilce === '').length;

console.log('\n\n' + '='.repeat(50));
console.log('İSTATİSTİK:');
console.log(`Toplam ada sayısı: ${data.alanlar.length}`);
console.log(`il='Türkiye' olanlar: ${turkyeCount}`);
console.log(`il boş olanlar: ${bosIlCount}`);
console.log(`ilce boş olanlar: ${bosIlceCount}`);
