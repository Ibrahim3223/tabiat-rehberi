const fs = require('fs');
const path = require('path');

// SADECE doğru 3 adayı seç (Wikidata ID ile)
const testIslands = [
  { id: 'kinaliada', wikidata_id: 'Q579117' },      // İstanbul
  { id: 'bozcaada', wikidata_id: 'Q211817' },       // Çanakkale
  { id: 'buyukada', wikidata_id: 'Q989883' }        // İstanbul (DOĞRU OLAN)
];

const wikidataPath = path.join(__dirname, '..', 'data', 'master-lists', 'adalar-wikidata.json');
const wikidata = JSON.parse(fs.readFileSync(wikidataPath, 'utf-8'));

console.log(`📊 Total islands in wikidata: ${wikidata.alanlar.length}`);

// Wikidata ID ile eşleştir (kesin match)
const testAlanlar = wikidata.alanlar.filter(alan => {
  return testIslands.some(spec =>
    spec.id === alan.id && spec.wikidata_id === alan.wikidata_id
  );
});

console.log(`✅ Found ${testAlanlar.length} matching islands:`);
testAlanlar.forEach(alan => {
  console.log(`  - ${alan.baslik || alan.ad} (${alan.wikidata_id}) - ${alan.il || 'No il'}`);
});

// Kaynakları ekle
testAlanlar.forEach(alan => {
  if (!alan.kaynaklar) {
    alan.kaynaklar = [
      {
        title: 'tr.wikipedia.org',
        url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(alan.ad || alan.baslik)}`,
        tip: 'genel'
      },
      {
        title: 'www.wikidata.org',
        url: `http://www.wikidata.org/entity/${alan.wikidata_id}`,
        tip: 'genel'
      }
    ];
  }
});

const testData = {
  alanlar: testAlanlar
};

const outputPath = path.join(__dirname, '..', 'data', 'master-lists', 'test-merged.json');
fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

console.log(`\n✅ Test file created with CORRECT data: ${outputPath}`);
console.log(`📝 Islands: ${testAlanlar.map(a => a.ad).join(', ')}`);
