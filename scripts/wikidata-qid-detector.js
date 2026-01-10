#!/usr/bin/env node

/**
 * Wikidata QID Detector
 *
 * Gemini'nin yaklaşımı: Bilinen bir örneği al, tüm QID'lerini bul, kullan!
 *
 * Örnek: "Köprülü Kanyon Milli Parkı" biliniyor
 * → Wikidata'da ara
 * → Tüm P31 (instance of) değerlerini al
 * → O QID'leri kullan!
 *
 * Bu script Türkiye'deki bilinen doğal alanları sorgular ve
 * gerçek QID'leri otomatik bulur.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Bilinen örnekler (Wikidata'da kesin var olan yerler)
 */
const KNOWN_EXAMPLES = {
  'milli-park': [
    'Köprülü Kanyon Milli Parkı',
    'Köprülü Kanyon',
    'Olimpos Beydağları Sahil Milli Parkı',
    'Olimpos',
    'Uludağ Milli Parkı',
    'Uludağ',
    'Göreme Tarihi Milli Parkı',
    'Göreme',
    'Boğazköy-Alacahöyük',
    'Kazdağı Milli Parkı'
  ],
  'tabiat-parki': [
    'Küre Dağları Tabiat Parkı',
    'Ballıkayalar Tabiat Parkı',
    'Karagöl Tabiat Parkı'
  ],
  'kanyon': [
    'Saklıkent Kanyonu',
    'İhlara Vadisi',
    'Köprülü Kanyon'
  ],
  'selalesi': [
    'Düden Şelalesi',
    'Manavgat Şelalesi',
    'Kurşunlu Şelalesi',
    'Muradiye Şelalesi'
  ],
  'magara': [
    'Damlataş Mağarası',
    'Altınbeşik Mağarası',
    'Karain Mağarası'
  ],
  'gol': [
    'Van Gölü',
    'Beyşehir Gölü',
    'Eğirdir Gölü',
    'Tuz Gölü'
  ],
  'yayla': [
    'Ayder Yaylası',
    'Uzungöl',
    'Çambaşı Yaylası'
  ],
  'plaj': [
    'Ölüdeniz',
    'İztuzu Plajı',
    'Patara Plajı'
  ]
};

/**
 * Bir ismi Wikidata'da ara ve tüm P31 (instance of) değerlerini al
 */
async function findQIDsForExample(exampleName) {
  // Genişletilmiş arama: hem tam eşleşme, hem de CONTAINS kullan
  const query = `
    SELECT DISTINCT ?item ?itemLabel ?type ?typeLabel WHERE {
      {
        ?item rdfs:label "${exampleName}"@tr.
      }
      UNION
      {
        ?item rdfs:label ?label.
        FILTER(LANG(?label) = "tr" && CONTAINS(?label, "${exampleName.split(' ')[0]}"))
      }
      UNION
      {
        ?item rdfs:label "${exampleName}"@en.
      }

      ?item wdt:P17 wd:Q43.  # Türkiye
      ?item wdt:P31 ?type.   # instance of

      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
    }
    LIMIT 50
  `;

  try {
    const response = await axios.get(WIKIDATA_SPARQL_ENDPOINT, {
      params: { query, format: 'json' },
      headers: {
        'User-Agent': 'TabiatRehberi/1.0',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    const bindings = response.data.results?.bindings || [];
    const qids = bindings.map(b => ({
      qid: b.type.value.split('/').pop(),
      label: b.typeLabel?.value || 'Unknown'
    }));

    return qids;
  } catch (error) {
    console.error(`❌ Hata (${exampleName}):`, error.message);
    return [];
  }
}

/**
 * Bir kategori için tüm örnekleri tara ve QID'leri topla
 */
async function detectQIDsForCategory(categoryName, examples) {
  console.log(`\n🔍 ${categoryName} için QID'ler tespit ediliyor...\n`);

  const allQIDs = new Map(); // QID -> count

  for (const example of examples) {
    console.log(`  📄 ${example} sorgulanıyor...`);
    const qids = await findQIDsForExample(example);

    if (qids.length === 0) {
      console.log(`    ⚠️  Bulunamadı!`);
    } else {
      console.log(`    ✅ ${qids.length} QID bulundu:`);
      qids.forEach(({ qid, label }) => {
        console.log(`       - ${qid} (${label})`);
        const count = allQIDs.get(qid) || 0;
        allQIDs.set(qid, count + 1);
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // En çok tekrar edenleri bul
  const sorted = Array.from(allQIDs.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([qid, count]) => ({ qid, count }));

  console.log(`\n  📊 Özet (${categoryName}):`);
  sorted.forEach(({ qid, count }) => {
    console.log(`     ${qid}: ${count}/${examples.length} örnekte`);
  });

  return sorted.map(s => s.qid);
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🔍 Wikidata QID Detector Başlatıldı\n');
  console.log('='.repeat(70));
  console.log('Gemini yaklaşımı: Bilinen örneklerden QID\'leri çıkar!\n');

  const detectedQIDs = {};

  for (const [category, examples] of Object.entries(KNOWN_EXAMPLES)) {
    const qids = await detectQIDsForCategory(category, examples);
    detectedQIDs[category] = qids;
  }

  // Sonuçları kaydet
  const outputPath = path.join(__dirname, '../data/detected-qids.json');
  fs.writeFileSync(outputPath, JSON.stringify(detectedQIDs, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(70));
  console.log('✅ QID Tespiti Tamamlandı!');
  console.log(`📁 Sonuçlar: ${outputPath}\n`);

  // JavaScript kodu olarak çıktı ver
  console.log('📋 fetch-wikidata.js için güncellenmiş CATEGORIES:\n');
  console.log('const CATEGORIES = {');
  for (const [category, qids] of Object.entries(detectedQIDs)) {
    const qidArray = qids.length > 1 ? `[${qids.map(q => `'${q}'`).join(', ')}]` : `'${qids[0]}'`;
    console.log(`  '${category}': { qid: ${qidArray}, name: '...', file: '...' },`);
  }
  console.log('};');
}

main().catch(error => {
  console.error('\n❌ Kritik hata:', error);
  process.exit(1);
});
