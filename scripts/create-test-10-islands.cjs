const fs = require('fs');
const path = require('path');

// Read the test islands list
const testIslands = fs.readFileSync(path.join(__dirname, '..', 'test-islands.txt'), 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);

console.log('📋 Test islands to extract:', testIslands);

// Read the wikidata file
const wikidataPath = path.join(__dirname, '..', 'data', 'master-lists', 'adalar-wikidata.json');
const wikidata = JSON.parse(fs.readFileSync(wikidataPath, 'utf-8'));

console.log(`📊 Total islands in wikidata: ${wikidata.alanlar.length}`);

// Extract the test islands
const testAlanlar = wikidata.alanlar.filter(alan => {
  return testIslands.includes(alan.id);
});

console.log(`✅ Found ${testAlanlar.length} matching islands`);
testAlanlar.forEach(alan => {
  console.log(`  - ${alan.baslik} (${alan.id}) - ${alan.il || 'No il'}`);
});

// Create the test file
const testData = {
  alanlar: testAlanlar
};

const outputPath = path.join(__dirname, '..', 'data', 'master-lists', 'test-10-adalar-wikidata.json');
fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

console.log(`\n✅ Test file created: ${outputPath}`);
