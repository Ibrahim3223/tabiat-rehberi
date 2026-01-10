#!/usr/bin/env node

/**
 * Çoklu Kaynak Birleştirme Scripti
 *
 * Wikipedia ve Wikidata'dan gelen verileri birleştirir.
 * En kaliteli veriyi seçer (koordinat, görsel, kaynak sayısı vs.)
 *
 * Kullanım: npm run merge-sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_LISTS_DIR = path.join(__dirname, '../data/master-lists');

// Her tür için hangi dosyaları birleştireceğiz
const MERGE_PAIRS = [
  {
    wikipedia: 'milli-parklar.json',
    wikidata: 'milli-parklar-wikidata.json',
    dkmp: 'milli-parklar-dkmp.json',
    output: 'milli-parklar-merged.json',
    tur: 'milli-park',
    name: 'Milli Parklar'
  },
  {
    wikipedia: 'tabiat-parklari.json',
    wikidata: 'tabiat-parklari-wikidata.json',
    output: 'tabiat-parklari-merged.json',
    tur: 'tabiat-parki',
    name: 'Tabiat Parkları'
  },
  {
    wikipedia: 'tabiat-anıtları.json',
    wikidata: 'tabiat-anıtları-wikidata.json',
    output: 'tabiat-anıtları-merged.json',
    tur: 'tabiat-aniti',
    name: 'Tabiat Anıtları'
  },
  {
    wikipedia: 'sulak-alanlar.json',
    wikidata: 'sulak-alanlar-wikidata.json',
    output: 'sulak-alanlar-merged.json',
    tur: 'sulak-alan',
    name: 'Sulak Alanlar'
  },
  {
    wikipedia: 'kanyonlar.json',
    wikidata: 'kanyonlar-wikidata.json',
    output: 'kanyonlar-merged.json',
    tur: 'kanyon',
    name: 'Kanyonlar'
  },
  {
    wikipedia: 'selaleler.json',
    wikidata: 'selaleler-wikidata.json',
    output: 'selaleler-merged.json',
    tur: 'selalesi',
    name: 'Şelaleler'
  },
  {
    wikipedia: 'magaralar.json',
    wikidata: 'magaralar-wikidata.json',
    output: 'magaralar-merged.json',
    tur: 'magara',
    name: 'Mağaralar'
  },
  {
    wikipedia: 'goller.json',
    wikidata: 'goller-wikidata.json',
    output: 'goller-merged.json',
    tur: 'gol',
    name: 'Göller'
  },
  {
    wikidata: 'daglar-wikidata.json',
    output: 'daglar-merged.json',
    tur: 'dag',
    name: 'Dağlar'
  },
  {
    wikidata: 'tepeler-wikidata.json',
    output: 'tepeler-merged.json',
    tur: 'tepe',
    name: 'Tepeler'
  },
  {
    wikidata: 'plajlar-wikidata.json',
    output: 'plajlar-merged.json',
    tur: 'plaj',
    name: 'Plajlar'
  },
  {
    wikidata: 'yaylalar-wikidata.json',
    output: 'yaylalar-merged.json',
    tur: 'yayla',
    name: 'Yaylalar'
  },
  {
    wikidata: 'vadiler-wikidata.json',
    output: 'vadiler-merged.json',
    tur: 'vadi',
    name: 'Vadiler'
  },
  {
    wikidata: 'ormanlar-wikidata.json',
    output: 'ormanlar-merged.json',
    tur: 'orman',
    name: 'Ormanlar'
  },
  {
    wikidata: 'termal-kaynaklar-wikidata.json',
    output: 'termal-kaynaklar-merged.json',
    tur: 'termal-kaynak',
    name: 'Termal Kaynaklar'
  },
  {
    wikidata: 'kus-cennetleri-wikidata.json',
    output: 'kus-cennetleri-merged.json',
    tur: 'kus-cenneti',
    name: 'Kuş Cennetleri'
  },
  {
    wikidata: 'botanik-bahceleri-wikidata.json',
    output: 'botanik-bahceleri-merged.json',
    tur: 'botanik-bahcesi',
    name: 'Botanik Bahçeleri'
  },
  {
    wikidata: 'adalar-wikidata.json',
    output: 'adalar-merged.json',
    tur: 'ada',
    name: 'Adalar'
  },
  {
    wikidata: 'kayak-merkezleri-wikidata.json',
    output: 'kayak-merkezleri-merged.json',
    tur: 'kayak-merkezi',
    name: 'Kayak Merkezleri'
  },
  {
    wikidata: 'jeoparklar-wikidata.json',
    output: 'jeoparklar-merged.json',
    tur: 'jeopark',
    name: 'Jeoparklar'
  }
];

/**
 * İki alan benzer mi kontrol et (fuzzy matching)
 */
function areSimilar(name1, name2) {
  if (!name1 || !name2) return false;

  const normalize = (str) => str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Tam eşleşme
  if (n1 === n2) return true;

  // Biri diğerini içeriyor
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Levenshtein distance (basit)
  const maxLen = Math.max(n1.length, n2.length);
  let diff = 0;
  for (let i = 0; i < maxLen; i++) {
    if (n1[i] !== n2[i]) diff++;
  }

  const similarity = 1 - (diff / maxLen);
  return similarity > 0.8; // %80+ benzerlik
}

/**
 * İki alanı birleştir (en iyi veriyi seç)
 */
function mergeAreas(wiki, wikidata) {
  const merged = { ...wiki };

  // Koordinat: Wikidata'dan tercih et (genelde daha doğru)
  if (wikidata.koordinat && (wikidata.koordinat.lat || wikidata.koordinat.lon)) {
    merged.koordinat = wikidata.koordinat;
  }

  // Görsel: Wikidata'dan tercih et
  if (wikidata.images?.hero?.url) {
    merged.images = wikidata.images;
  }

  // İl/İlçe: Daha dolu olanı al
  if (wikidata.il && !merged.il) {
    merged.il = wikidata.il;
  }
  if (wikidata.ilce && !merged.ilce) {
    merged.ilce = wikidata.ilce;
  }

  // Kaynakları birleştir (unique)
  const allSources = [
    ...(merged.olasi_kaynaklar || []),
    ...(wikidata.olasi_kaynaklar || [])
  ];
  merged.olasi_kaynaklar = [...new Set(allSources.filter(Boolean))];

  // Wikidata ID'yi sakla
  if (wikidata.wikidata_id) {
    merged.wikidata_id = wikidata.wikidata_id;
  }

  merged.veri_kaynagi = 'merged';

  return merged;
}

/**
 * İki listeyi birleştir
 */
function mergeLists(wikiList, wikidataList) {
  const merged = [];
  const matched = new Set();

  console.log(`  📊 Wikipedia: ${wikiList.length}, Wikidata: ${wikidataList.length}`);

  // Wikipedia listesinden başla
  for (const wikiItem of wikiList) {
    // Wikidata'da eşleşen var mı?
    const wikidataMatch = wikidataList.find(wd =>
      areSimilar(wikiItem.ad, wd.ad) && !matched.has(wd.id)
    );

    if (wikidataMatch) {
      // Birleştir
      const mergedItem = mergeAreas(wikiItem, wikidataMatch);
      merged.push(mergedItem);
      matched.add(wikidataMatch.id);
      console.log(`  ✅ Birleştirildi: ${wikiItem.ad}`);
    } else {
      // Sadece Wikipedia'dan ekle
      merged.push({ ...wikiItem, veri_kaynagi: 'wikipedia' });
    }
  }

  // Wikidata'da olup Wikipedia'da olmayan alanları ekle
  for (const wikidataItem of wikidataList) {
    if (!matched.has(wikidataItem.id)) {
      merged.push({ ...wikidataItem, veri_kaynagi: 'wikidata' });
      console.log(`  ➕ Yeni (Wikidata): ${wikidataItem.ad}`);
    }
  }

  return merged;
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🔗 Kaynak Birleştirme Başlatıldı\n');
  console.log('='.repeat(70));

  let totalMerged = 0;

  for (const pair of MERGE_PAIRS) {
    console.log(`\n📦 ${pair.name} birleştiriliyor...\n`);

    // Dosyaları oku
    let wikiData = { alanlar: [] };
    let wikidataData = { alanlar: [] };
    let dkmpData = { alanlar: [] };

    if (pair.wikipedia) {
      const wikiPath = path.join(MASTER_LISTS_DIR, pair.wikipedia);
      if (fs.existsSync(wikiPath)) {
        wikiData = JSON.parse(fs.readFileSync(wikiPath, 'utf-8'));
      }
    }

    if (pair.wikidata) {
      const wikidataPath = path.join(MASTER_LISTS_DIR, pair.wikidata);
      if (fs.existsSync(wikidataPath)) {
        wikidataData = JSON.parse(fs.readFileSync(wikidataPath, 'utf-8'));
      }
    }

    if (pair.dkmp) {
      const dkmpPath = path.join(MASTER_LISTS_DIR, pair.dkmp);
      if (fs.existsSync(dkmpPath)) {
        dkmpData = JSON.parse(fs.readFileSync(dkmpPath, 'utf-8'));
      }
    }

    // Tüm kaynakları birleştir
    let mergedList = mergeLists(
      wikiData.alanlar || [],
      wikidataData.alanlar || []
    );

    // DKMP varsa onu da ekle
    if (dkmpData.alanlar && dkmpData.alanlar.length > 0) {
      mergedList = mergeLists(mergedList, dkmpData.alanlar);
    }

    // Kaydet
    const output = {
      meta: {
        kaynak: 'Wikipedia + Wikidata + DKMP (merged)',
        guncelleme_tarihi: new Date().toISOString().split('T')[0],
        toplam_sayi: mergedList.length,
        wikipedia_sayi: wikiData.alanlar?.length || 0,
        wikidata_sayi: wikidataData.alanlar?.length || 0,
        dkmp_sayi: dkmpData.alanlar?.length || 0
      },
      alanlar: mergedList
    };

    const outputPath = path.join(MASTER_LISTS_DIR, pair.output);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n  ✅ ${mergedList.length} alan birleştirildi: ${pair.output}`);
    totalMerged += mergedList.length;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Birleştirme tamamlandı!`);
  console.log(`📊 Toplam ${totalMerged} alan\n`);
}

main().catch(error => {
  console.error('\n❌ Hata:', error);
  process.exit(1);
});
