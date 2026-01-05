#!/usr/bin/env node

/**
 * Master Liste Çekme Scripti
 *
 * Wikipedia, Wikidata ve diğer güvenilir kaynaklardan
 * Türkiye'deki doğal alanların listesini çeker.
 *
 * Kullanım: npm run fetch-lists
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../data/master-lists');

// Wikipedia API endpoint
const WIKI_API = 'https://tr.wikipedia.org/w/api.php';

/**
 * Wikipedia'dan kategori içeriğini çeker
 */
async function fetchWikipediaCategory(categoryName, limit = 500) {
  console.log(`📚 Wikipedia kategorisi çekiliyor: ${categoryName}`);

  const params = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Kategori:${categoryName}`,
    cmlimit: limit,
    format: 'json'
  };

  try {
    const response = await axios.get(WIKI_API, { params });
    const members = response.data.query?.categorymembers || [];
    console.log(`  ✅ ${members.length} madde bulundu`);
    return members;
  } catch (error) {
    console.error(`  ❌ Hata:`, error.message);
    return [];
  }
}

/**
 * Wikipedia sayfasından temel bilgileri çeker
 */
async function fetchPageDetails(pageTitle) {
  const params = {
    action: 'query',
    titles: pageTitle,
    prop: 'coordinates|pageprops|extracts',
    exintro: true,
    explaintext: true,
    format: 'json'
  };

  try {
    const response = await axios.get(WIKI_API, { params });
    const pages = response.data.query?.pages || {};
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') return null;

    const page = pages[pageId];
    const coordinates = page.coordinates?.[0] || {};

    return {
      title: page.title,
      lat: coordinates.lat || null,
      lon: coordinates.lon || null,
      extract: page.extract || ''
    };
  } catch (error) {
    console.error(`  ❌ Sayfa detayı alınamadı (${pageTitle}):`, error.message);
    return null;
  }
}

/**
 * Türkçe karakterleri slug'a çevirir
 */
function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'i',
    'İ': 'i', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  return text
    .split('')
    .map(char => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * İl bilgisini metinden çıkarmaya çalışır
 */
function extractProvince(text, title) {
  const provinces = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
    'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
    'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
    'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
    'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
    'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
    'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
    'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize',
    'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Sivas', 'Şırnak', 'Tekirdağ',
    'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
  ];

  const combinedText = `${title} ${text}`.toLowerCase();

  for (const province of provinces) {
    if (combinedText.includes(province.toLowerCase())) {
      return province;
    }
  }

  return 'Bilinmiyor';
}

/**
 * Milli parkları çeker
 */
async function fetchMilliParklar() {
  console.log('\n🏞️  Milli Parklar çekiliyor...\n');

  const members = await fetchWikipediaCategory('Türkiye\'deki_milli_parklar');
  const alanlar = [];

  for (const member of members) {
    if (member.title.startsWith('Kategori:')) continue;

    console.log(`  📄 İşleniyor: ${member.title}`);
    const details = await fetchPageDetails(member.title);

    if (!details) continue;

    const il = extractProvince(details.extract, details.title);

    alanlar.push({
      id: slugify(member.title),
      ad: details.title,
      tur: 'milli-park',
      il: il,
      ilce: '',
      bolge: '',
      koordinat: {
        lat: details.lat,
        lon: details.lon
      },
      olasi_kaynaklar: [
        'https://www.tarimorman.gov.tr/DKMP',
        `https://tr.wikipedia.org/wiki/${encodeURIComponent(member.title)}`
      ],
      notlar: details.extract.substring(0, 200)
    });

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const output = {
    meta: {
      kaynak: 'Wikipedia - Türkiye\'deki milli parklar kategorisi',
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: alanlar.length
    },
    alanlar
  };

  const outputPath = path.join(OUTPUT_DIR, 'milli-parklar.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${alanlar.length} milli park kaydedildi: ${outputPath}\n`);
}

/**
 * Tabiat parklarını çeker
 */
async function fetchTabiatParklari() {
  console.log('\n🌲 Tabiat Parkları çekiliyor...\n');

  const members = await fetchWikipediaCategory('Türkiye\'deki_tabiat_parkları');
  const alanlar = [];

  for (const member of members) {
    if (member.title.startsWith('Kategori:')) continue;

    console.log(`  📄 İşleniyor: ${member.title}`);
    const details = await fetchPageDetails(member.title);

    if (!details) continue;

    const il = extractProvince(details.extract, details.title);

    alanlar.push({
      id: slugify(member.title),
      ad: details.title,
      tur: 'tabiat-parki',
      il: il,
      ilce: '',
      bolge: '',
      koordinat: {
        lat: details.lat,
        lon: details.lon
      },
      olasi_kaynaklar: [
        'https://www.tarimorman.gov.tr/DKMP',
        `https://tr.wikipedia.org/wiki/${encodeURIComponent(member.title)}`
      ],
      notlar: details.extract.substring(0, 200)
    });

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const output = {
    meta: {
      kaynak: 'Wikipedia - Türkiye\'deki tabiat parkları kategorisi',
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: alanlar.length
    },
    alanlar
  };

  const outputPath = path.join(OUTPUT_DIR, 'tabiat-parklari.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${alanlar.length} tabiat parkı kaydedildi: ${outputPath}\n`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 Master Liste Çekme Başlatıldı\n');
  console.log('=' .repeat(50));

  // Klasör yoksa oluştur
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    await fetchMilliParklar();
    await fetchTabiatParklari();

    // Diğer kategoriler için placeholder'lar
    console.log('\n📝 Diğer kategoriler için placeholder dosyalar oluşturuluyor...\n');

    const otherCategories = [
      'kanyonlar', 'selaleler', 'magaralar', 'goller',
      'plajlar', 'yaylalar', 'ormanlik-alanlar',
      'sulak-alanlar', 'kamp-alanlari', 'tabiat-anıtları'
    ];

    for (const category of otherCategories) {
      const filePath = path.join(OUTPUT_DIR, `${category}.json`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({
          meta: {
            kaynak: 'Manuel eklenecek',
            guncelleme_tarihi: new Date().toISOString().split('T')[0],
            toplam_sayi: 0
          },
          alanlar: []
        }, null, 2), 'utf-8');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Master liste çekme tamamlandı!');
    console.log(`📁 Çıktı klasörü: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error('\n❌ Hata oluştu:', error);
    process.exit(1);
  }
}

// Scripti çalıştır
main();
