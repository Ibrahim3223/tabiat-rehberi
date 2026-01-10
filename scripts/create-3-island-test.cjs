const fs = require('fs');
const path = require('path');

// Sadece 3 ada: problemli olanlar + doğru olan
const testIslands = ['buyukada', 'kinaliada', 'bozcaada'];

// Read the wikidata file
const wikidataPath = path.join(__dirname, '..', 'data', 'master-lists', 'adalar-wikidata.json');
const wikidata = JSON.parse(fs.readFileSync(wikidataPath, 'utf-8'));

console.log(`📊 Total islands in wikidata: ${wikidata.alanlar.length}`);

// Extract the test islands
const testAlanlar = wikidata.alanlar.filter(alan => {
  return testIslands.includes(alan.id);
});

console.log(`✅ Found ${testAlanlar.length} matching islands:`);
testAlanlar.forEach(alan => {
  console.log(`  - ${alan.baslik || alan.ad} (${alan.id}) - ${alan.il || 'No il'}`);
});

// Create the test file
const testData = {
  alanlar: testAlanlar
};

const outputPath = path.join(__dirname, '..', 'data', 'master-lists', 'test-merged.json');
fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

console.log(`\n✅ Test file created: ${outputPath}`);
console.log(`📝 Generate with: cd scripts && node generate-content-section-by-section.js test`);
