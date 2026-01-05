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

// Axios default headers (403 hatasını önlemek için)
axios.defaults.headers.common['User-Agent'] = 'TabiatRehberi/1.0 (https://tabiatrehberi.com; info@tabiatrehberi.com)';

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
    format: 'json',
    origin: '*'  // CORS için
  };

  try {
    const response = await axios.get(WIKI_API, {
      params,
      headers: {
        'User-Agent': 'TabiatRehberi/1.0 (https://tabiatrehberi.com)',
        'Accept': 'application/json'
      }
    });
    const members = response.data.query?.categorymembers || [];
    console.log(`  ✅ ${members.length} madde bulundu`);
    return members;
  } catch (error) {
    console.error(`  ❌ Hata:`, error.response?.status, error.message);
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
    format: 'json',
    origin: '*'
  };

  try {
    const response = await axios.get(WIKI_API, {
      params,
      headers: {
        'User-Agent': 'TabiatRehberi/1.0 (https://tabiatrehberi.com)',
        'Accept': 'application/json'
      }
    });
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
 * Genel kategori çekme fonksiyonu
 */
async function fetchCategory(wikiCategory, outputFile, turKodu, turAdi) {
  console.log(`\n${turAdi} çekiliyor...\n`);

  const members = await fetchWikipediaCategory(wikiCategory);
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
      tur: turKodu,
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
      kaynak: `Wikipedia - ${wikiCategory}`,
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: alanlar.length
    },
    alanlar
  };

  const outputPath = path.join(OUTPUT_DIR, outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${alanlar.length} ${turAdi.toLowerCase()} kaydedildi: ${outputPath}\n`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 Master Liste Çekme Başlatıldı\n');
  console.log('=' .repeat(70));

  // Klasör yoksa oluştur
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // TÜM KATEGORİLER - Wikipedia'dan çekilecek
    const categories = [
      { wiki: 'Türkiye\'deki_milli_parklar', file: 'milli-parklar.json', kod: 'milli-park', ad: '🏞️  Milli Parklar' },
      { wiki: 'Türkiye\'deki_tabiat_parkları', file: 'tabiat-parklari.json', kod: 'tabiat-parki', ad: '🌲 Tabiat Parkları' },
      { wiki: 'Türkiye\'deki_tabiat_anıtları', file: 'tabiat-anıtları.json', kod: 'tabiat-aniti', ad: '🗿 Tabiat Anıtları' },
      { wiki: 'Türkiye\'deki_kanyonlar', file: 'kanyonlar.json', kod: 'kanyon', ad: '⛰️  Kanyonlar' },
      { wiki: 'Türkiye\'deki_şelaleler', file: 'selaleler.json', kod: 'selalesi', ad: '💧 Şelaleler' },
      { wiki: 'Türkiye\'deki_mağaralar', file: 'magaralar.json', kod: 'magara', ad: '🕳️  Mağaralar' },
      { wiki: 'Türkiye\'deki_göller', file: 'goller.json', kod: 'gol', ad: '🏔️  Göller' },
      { wiki: 'Türkiye\'deki_plajlar', file: 'plajlar.json', kod: 'plaj', ad: '🏖️  Plajlar' },
      { wiki: 'Türkiye\'deki_yaylalar', file: 'yaylalar.json', kod: 'yayla', ad: '🏔️  Yaylalar' },
      { wiki: 'Türkiye\'nin_sulak_alanları', file: 'sulak-alanlar.json', kod: 'sulak-alan', ad: '🦆 Sulak Alanlar' },
    ];

    for (const cat of categories) {
      await fetchCategory(cat.wiki, cat.file, cat.kod, cat.ad);
    }

    // Ormanlık alanlar ve kamp alanları için placeholder (Wikipedia kategorisi yok)
    console.log('\n📝 Diğer kategoriler için placeholder dosyalar oluşturuluyor...\n');

    const placeholders = [
      { file: 'ormanlik-alanlar.json', ad: 'Ormanlık Rekreasyon Alanları' },
      { file: 'kamp-alanlari.json', ad: 'Resmi Kamp Alanları' }
    ];

    for (const placeholder of placeholders) {
      const filePath = path.join(OUTPUT_DIR, placeholder.file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({
          meta: {
            kaynak: 'Manuel veya alternatif kaynaklardan eklenecek',
            guncelleme_tarihi: new Date().toISOString().split('T')[0],
            toplam_sayi: 0,
            notlar: `${placeholder.ad} için Wikipedia kategorisi bulunamadı. Resmi kaynaklardan manuel eklenecek.`
          },
          alanlar: []
        }, null, 2), 'utf-8');
        console.log(`  📄 Placeholder oluşturuldu: ${placeholder.file}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Master liste çekme tamamlandı!');
    console.log(`📁 Çıktı klasörü: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error('\n❌ Hata oluştu:', error);
    process.exit(1);
  }
}

// Scripti çalıştır
main();
