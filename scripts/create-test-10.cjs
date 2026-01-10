const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../data/master-lists/test-merged.json', 'utf-8'));

// İlk 10 alanı al - farklı türlerden
const test10 = {
  alanlar: data.alanlar.slice(0, 10)
};

fs.writeFileSync('../data/master-lists/test-10.json', JSON.stringify(test10, null, 2));

console.log('✅ Test-10 listesi oluşturuldu:');
console.log('');
test10.alanlar.forEach((a, i) => {
  console.log(`${i+1}. ${a.ad} (${a.il || 'Unknown'}) - ${a.alan_turu || a.tip}`);
});
