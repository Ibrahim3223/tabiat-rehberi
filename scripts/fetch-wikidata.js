#!/usr/bin/env node

/**
 * Wikidata SPARQL İle Veri Çekme
 *
 * Wikidata'dan SPARQL sorguları ile yapılandırılmış veri çeker.
 * Miras haritası projesinden esinlenilmiştir.
 *
 * Avantajlar:
 * - Koordinatlar otomatik
 * - Görseller otomatik
 * - İl/İlçe otomatik
 * - Wikipedia linkleri otomatik
 * - Çok daha fazla veri
 *
 * Kullanım: npm run fetch-wikidata
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../data/master-lists');
const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// Wikidata QID'leri (Türkiye doğal alanları için)
// QID Detector scripti ile bulunmuş GERÇEK QID'ler!
// NOT: Bazı kategoriler multiple QID ile çekilecek (daha fazla sonuç için)
const CATEGORIES = {
  'milli-park': {
    qid: ['Q108060568', 'Q46169', 'Q473972'],  // Türkiye Milli Parkı + Genel National Park + Protected Area
    name: 'Milli Parklar',
    file: 'milli-parklar-wikidata.json'
  },
  'tabiat-parki': {
    qid: ['Q108060572', 'Q159313'],   // Türkiye Tabiat Parkı + Nature Reserve
    name: 'Tabiat Parkları',
    file: 'tabiat-parklari-wikidata.json'
  },
  'tabiat-aniti': {
    qid: ['Q179049', 'Q1286517'],   // Natural Monument + Natural landscape
    name: 'Tabiat Anıtları',
    file: 'tabiat-anıtları-wikidata.json'
  },
  'sulak-alan': {
    qid: 'Q191992',   // Wetland (Sulak Alan)
    name: 'Sulak Alanlar',
    file: 'sulak-alanlar-wikidata.json'
  },
  'kanyon': {
    qid: 'Q150784',  // Canyon (Q39816 Valley kaldırıldı - vadilerle çakışıyordu!)
    name: 'Kanyonlar',
    file: 'kanyonlar-wikidata.json'
  },
  'selalesi': {
    qid: 'Q34038',    // Waterfall (Şelale)
    name: 'Şelaleler',
    file: 'selaleler-wikidata.json'
  },
  'magara': {
    qid: 'Q35509',    // Cave (Mağara)
    name: 'Mağaralar',
    file: 'magaralar-wikidata.json'
  },
  'gol': {
    qid: 'Q23397',    // Lake (Göl)
    name: 'Göller',
    file: 'goller-wikidata.json'
  },
  'dag': {
    qid: 'Q8502',     // Mountain (Dağ)
    name: 'Dağlar',
    file: 'daglar-wikidata.json'
  },
  'tepe': {
    qid: 'Q54050',    // Hill (Tepe)
    name: 'Tepeler',
    file: 'tepeler-wikidata.json'
  },
  'plaj': {
    qid: 'Q40080',  // Beach (SADECE plajlar - Q570116 Tourist attraction kaldırıldı!)
    name: 'Plajlar',
    file: 'plajlar-wikidata.json'
  },
  'yayla': {
    qid: ['Q190044', 'Q614316'],  // Plateau + Pasture (Q570116 Tourist attraction kaldırıldı!)
    name: 'Yaylalar',
    file: 'yaylalar-wikidata.json'
  },
  'vadi': {
    qid: 'Q39816',    // Valley (Vadi)
    name: 'Vadiler',
    file: 'vadiler-wikidata.json'
  },
  'orman': {
    qid: ['Q4421', 'Q43229', 'Q191424'],  // Forest + Protected forest + Grove
    name: 'Ormanlar',
    file: 'ormanlar-wikidata.json'
  },
  'termal-kaynak': {
    qid: 'Q177380',  // Hot spring (Q165154 Thermal bath kaldırıldı - tarihi hamamları çekiyordu!)
    name: 'Termal Kaynaklar ve Kaplıcalar',
    file: 'termal-kaynaklar-wikidata.json'
  },
  'kus-cenneti': {
    qid: 'Q5630566',  // Bird sanctuary (Q191992 Wetland kaldırıldı - sulak alanlarla çakışıyordu!)
    name: 'Kuş Cennetleri',
    file: 'kus-cennetleri-wikidata.json'
  },
  'botanik-bahcesi': {
    qid: ['Q167346', 'Q22746'],  // Botanical garden + Arboretum
    name: 'Botanik Bahçeleri',
    file: 'botanik-bahceleri-wikidata.json'
  },
  'ada': {
    qid: 'Q23442',  // Island
    name: 'Adalar',
    file: 'adalar-wikidata.json'
  },
  'kayak-merkezi': {
    qid: 'Q130003',  // Ski resort
    name: 'Kayak Merkezleri',
    file: 'kayak-merkezleri-wikidata.json'
  },
  'jeopark': {
    qid: 'Q1506179',  // Geopark (Q35509 Cave ve Q179049 Natural monument kaldırıldı - mağara/tabiat anıtı ile çakışıyordu!)
    name: 'Jeoparklar',
    file: 'jeoparklar-wikidata.json'
  },
  'burun-pelerin': {
    qid: ['Q185230', 'Q28114'],  // Headland/Cape + Peninsula
    name: 'Burunlar ve Yarımadalar',
    file: 'burunlar-wikidata.json'
  },
  'koruk-rezerv': {
    qid: ['Q759421', 'Q3516404'],  // Nature reserve + Wildlife reserve
    name: 'Koruma Alanları',
    file: 'koruma-alanlari-wikidata.json'
  }
};

/**
 * SPARQL sorgusu oluştur (GENİŞLETİLMİŞ VERSİYON + MULTIPLE QID SUPPORT)
 *
 * Değişiklikler:
 * - Multiple QID desteği (array veya string kabul eder)
 * - Her QID için UNION clause oluşturur
 * - Alt tipleri de ara (wdt:P279* - subclass of)
 * - Alternatif konum özellikleri (P276 - location)
 */
function getSPARQLQuery(qids, offset = 0) {
  // String ise array'e çevir
  const qidArray = Array.isArray(qids) ? qids : [qids];

  // Her QID için type check union'ları oluştur
  const typeChecks = qidArray.map(qid => `
      {
        ?item wdt:P17 wd:Q43.                  # Ülke: Türkiye
        ?item wdt:P31/wdt:P279* wd:${qid}.     # Tip veya alt tipi
      }
      UNION
      {
        ?item wdt:P17 wd:Q43.                  # Ülke: Türkiye
        ?item wdt:P31 wd:${qid}.               # Direkt bu tip
      }
      UNION
      {
        # Türkiye içinde bir yerde bulunan
        ?item wdt:P276 ?location.              # Konum
        ?location wdt:P17 wd:Q43.              # Konum Türkiye'de
        ?item wdt:P31/wdt:P279* wd:${qid}.     # Tip
      }`).join('\n      UNION\n');

  return `
    SELECT DISTINCT ?item ?itemLabel ?image ?coords
      ?provinceLabel ?districtLabel ?article ?altLabel
      # FİZİKSEL ÖZELLİKLER
      ?elevation ?baseElevation ?area ?width ?length ?depth ?averageDepth ?shorelineLength
      # COĞRAFYA & KONUM
      ?locatedOnTerrainLabel ?partOfLabel ?physicalFeatureLabel
      ?highestPointLabel ?lowestPointLabel ?streetAddress
      ?sharesBorderLabel ?mouthLabel ?originLabel ?drainageBasinLabel
      # İDARİ & YASAL
      ?heritageStatusLabel ?protectedAreaLabel ?managementLabel
      ?inception ?dissolved ?openingDate ?iucnCategory
      # TARİHSEL
      ?namedAfterLabel ?officialName ?nativeLabel ?shortName
      ?significantEventLabel ?timePeriodLabel
      # TURİZM
      ?website ?tripadvisorId ?visitors ?entranceFee ?openSeason ?duration
      # REFERANSLAR
      ?describedAtUrl
      # GÖRSEL & MEDYA
      ?locationMap ?locatorMap ?panorama
      # JEOLOJİK
      ?materialLabel
    WHERE {
      # Tüm QID'ler için tip kontrolleri (UNION ile birleştirilmiş)
      ${typeChecks}

      # ========================================
      # TEMEL BİLGİLER
      # ========================================
      OPTIONAL { ?item wdt:P18 ?image. }
      OPTIONAL { ?item wdt:P625 ?coords. }

      # İL/İLÇE - BASİTLEŞTİRİLMİŞ ALGORİTMA
      # Önce ilçeyi bul
      OPTIONAL {
        ?item wdt:P131 ?dist.
        ?dist wdt:P31 wd:Q2074737.  # İlçe (Türkiye)
        BIND(?dist AS ?district)
      }

      # Sonra ili bul - ilçe üzerinden veya direkt
      OPTIONAL {
        {
          # Yol 1: İlçe varsa, ilçenin ili
          ?item wdt:P131 ?dist.
          ?dist wdt:P31 wd:Q2074737.  # İlçe
          ?dist wdt:P131 ?prov.
          ?prov wdt:P31 wd:Q48336.  # İl
          BIND(?prov AS ?province)
        }
        UNION
        {
          # Yol 2: Direkt il bağlantısı
          ?item wdt:P131 ?prov.
          ?prov wdt:P31 wd:Q48336.  # İl (Türkiye)
          BIND(?prov AS ?province)
        }
      }

      # Wikipedia makalesi
      OPTIONAL {
        ?article schema:about ?item;
                 schema:isPartOf <https://tr.wikipedia.org/>.
      }

      # Alternatif isimler
      OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "tr") }

      # ========================================
      # FİZİKSEL ÖZELLİKLER (10 property)
      # ========================================
      OPTIONAL { ?item wdt:P2044 ?elevation. }           # Yükseklik
      OPTIONAL { ?item wdt:P2660 ?baseElevation. }       # Taban yüksekliği
      OPTIONAL { ?item wdt:P2046 ?area. }                # Alan
      OPTIONAL { ?item wdt:P2049 ?width. }               # Genişlik
      OPTIONAL { ?item wdt:P2043 ?length. }              # Uzunluk
      OPTIONAL { ?item wdt:P4511 ?depth. }               # Max derinlik
      OPTIONAL { ?item wdt:P2670 ?averageDepth. }        # Ortalama derinlik
      OPTIONAL { ?item wdt:P2347 ?shorelineLength. }     # Kıyı uzunluğu

      # ========================================
      # COĞRAFYA & KONUM (13 property)
      # ========================================
      OPTIONAL { ?item wdt:P706 ?locatedOnTerrain. }     # Hangi dağda/ovada
      OPTIONAL { ?item wdt:P361 ?partOf. }               # Hangi bölgenin parçası
      OPTIONAL { ?item wdt:P206 ?physicalFeature. }      # Fiziksel özellik
      OPTIONAL { ?item wdt:P610 ?highestPoint. }         # En yüksek nokta
      OPTIONAL { ?item wdt:P1589 ?lowestPoint. }         # En alçak nokta
      OPTIONAL { ?item wdt:P6375 ?streetAddress. }       # Tam adres
      OPTIONAL { ?item wdt:P47 ?sharesBorder. }          # Komşu yerler
      OPTIONAL { ?item wdt:P403 ?mouth. }                # Nehir ağzı
      OPTIONAL { ?item wdt:P885 ?origin. }               # Nehir kaynağı
      OPTIONAL { ?item wdt:P4614 ?drainageBasin. }       # Drenaj havzası

      # ========================================
      # İDARİ & YASAL (8 property)
      # ========================================
      OPTIONAL { ?item wdt:P1435 ?heritageStatus. }      # UNESCO, SİT, Ramsar
      OPTIONAL { ?item wdt:P3018 ?protectedArea. }       # Hangi koruma alanında
      OPTIONAL { ?item wdt:P1640 ?management. }          # Yöneten kurum
      OPTIONAL { ?item wdt:P571 ?inception. }            # Kuruluş tarihi
      OPTIONAL { ?item wdt:P576 ?dissolved. }            # Kapatılma
      OPTIONAL { ?item wdt:P1619 ?openingDate. }         # Açılış tarihi
      OPTIONAL { ?item wdt:P3999 ?iucnCategory. }        # IUCN kategorisi

      # ========================================
      # TARİHSEL (6 property)
      # ========================================
      OPTIONAL { ?item wdt:P138 ?namedAfter. }           # İsim nereden gelir
      OPTIONAL { ?item wdt:P1448 ?officialName. }        # Resmi adı
      OPTIONAL { ?item wdt:P1705 ?nativeLabel. }         # Yerel adı
      OPTIONAL { ?item wdt:P1813 ?shortName. }           # Kısa adı
      OPTIONAL { ?item wdt:P793 ?significantEvent. }     # Önemli olaylar
      OPTIONAL { ?item wdt:P2348 ?timePeriod. }          # Hangi dönem

      # ========================================
      # TURİZM (6 property)
      # ========================================
      OPTIONAL { ?item wdt:P856 ?website. }              # Resmi website
      OPTIONAL { ?item wdt:P3134 ?tripadvisorId. }       # TripAdvisor
      OPTIONAL { ?item wdt:P2250 ?visitors. }            # Ziyaretçi sayısı
      OPTIONAL { ?item wdt:P5555 ?entranceFee. }         # Giriş ücreti
      OPTIONAL { ?item wdt:P2817 ?openSeason. }          # Açık sezon
      OPTIONAL { ?item wdt:P2047 ?duration. }            # Ziyaret süresi

      # ========================================
      # REFERANSLAR (1 property)
      # ========================================
      OPTIONAL { ?item wdt:P973 ?describedAtUrl. }       # Tanım URL

      # ========================================
      # GÖRSEL & MEDYA (3 property)
      # ========================================
      OPTIONAL { ?item wdt:P1943 ?locationMap. }         # Konum haritası
      OPTIONAL { ?item wdt:P242 ?locatorMap. }           # Locator harita
      OPTIONAL { ?item wdt:P8592 ?panorama. }            # Panorama

      # ========================================
      # JEOLOJİK (1 property)
      # ========================================
      OPTIONAL { ?item wdt:P186 ?material. }             # Kayaç türü

      SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en,de,fr". }
    }
    LIMIT 2500
    OFFSET ${offset}
  `;
}

/**
 * Wikidata SPARQL sorgusu çalıştır
 * NOT: POST request kullanıyoruz çünkü 45 property ile sorgu çok uzun (414 hatasını önler)
 */
async function fetchWikidataResults(query) {
  const headers = {
    'User-Agent': 'TabiatRehberi/1.0 (https://tabiatrehberi.com)',
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  // POST request için form data olarak gönder
  const formData = new URLSearchParams();
  formData.append('query', query);
  formData.append('format', 'json');

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(WIKIDATA_SPARQL_ENDPOINT, formData.toString(), {
        headers,
        timeout: 60000
      });

      return response.data.results.bindings || [];
    } catch (error) {
      console.error(`  ❌ Hata (deneme ${attempt}/${maxRetries}):`, error.message);
      if (error.response?.status === 414) {
        console.error(`  ⚠️ 414 hata! Sorgu çok uzun. POST request kullanıyoruz ama hala çok uzun olabilir.`);
      }
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  return [];
}

/**
 * Koordinatlardan İl/İlçe bul (Reverse Geocoding - YEDEK SİSTEM)
 * Wikidata'dan il/ilçe gelmezse bu fonksiyon kullanılır
 */
async function reverseGeocode(lat, lon) {
  if (!lat || !lon) return { il: '', ilce: '' };

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'TabiatRehberi/1.0 (https://tabiatrehberi.com)'
      },
      timeout: 5000
    });

    const address = response.data.address || {};

    return {
      il: address.province || address.state || '',
      ilce: address.county || address.town || address.city_district || ''
    };
  } catch (error) {
    console.error(`  ⚠️ Reverse geocoding hatası:`, error.message);
    return { il: '', ilce: '' };
  }
}

/**
 * Wikidata sonuçlarını işle - 45+ property ile zenginleştirilmiş
 */
async function processResults(results, turKodu, turAdi) {
  const processed = [];

  for (const result of results) {
    const itemId = result.item.value.split('/').pop();
    const name = result.itemLabel?.value || 'Bilinmeyen';

    // QID formatında isimler atla (veri yok demek)
    if (name.startsWith('Q') && /^\d+$/.test(name.substring(1))) {
      continue;
    }

    // Koordinatları parse et
    let lat = null;
    let lon = null;
    if (result.coords?.value) {
      const coordStr = result.coords.value.replace('Point(', '').replace(')', '');
      const [lonStr, latStr] = coordStr.split(' ');
      lon = parseFloat(lonStr);
      lat = parseFloat(latStr);
    }

    // İl/İlçe - Wikidata'dan al, yoksa reverse geocoding kullan
    let il = result.provinceLabel?.value || '';
    let ilce = result.districtLabel?.value || '';

    // SADECE İKİSİ DE yoksa ve koordinat varsa reverse geocoding kullan (daha hızlı)
    if (!il && !ilce && lat && lon) {
      console.log(`  🌍 Reverse geocoding: ${name}...`);
      const location = await reverseGeocode(lat, lon);
      il = location.il;
      ilce = location.ilce;

      // Rate limiting - OpenStreetMap için
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Görsel URL
    const imageUrl = result.image?.value || '';
    const imageFilename = imageUrl ? decodeURIComponent(imageUrl.split('/').pop()) : '';

    // Helper: Sayısal değer parse et
    const parseNumber = (value) => value ? parseFloat(value.replace(/[^0-9.]/g, '')) : null;

    // Helper: Tarih parse et
    const parseDate = (value) => value ? value.split('T')[0] : null;

    const item = {
      id: `wikidata-${itemId}`,
      wikidata_id: itemId,
      ad: name,
      tur: turKodu,
      il: il,
      ilce: ilce,
      bolge: '',

      koordinat: {
        lat: lat,
        lon: lon
      },

      // ========================================
      // FİZİKSEL ÖZELLİKLER
      // ========================================
      fiziksel: {
        yukseklik: parseNumber(result.elevation?.value),              // metre
        taban_yuksekligi: parseNumber(result.baseElevation?.value),   // metre
        alan: parseNumber(result.area?.value),                        // km²
        genislik: parseNumber(result.width?.value),                   // metre
        uzunluk: parseNumber(result.length?.value),                   // metre
        derinlik: parseNumber(result.depth?.value),                   // metre
        ortalama_derinlik: parseNumber(result.averageDepth?.value),   // metre
        kiyi_uzunlugu: parseNumber(result.shorelineLength?.value)     // km
      },

      // ========================================
      // COĞRAFYA & KONUM
      // ========================================
      cografya: {
        hangi_dagda: result.locatedOnTerrainLabel?.value || null,
        parcasi: result.partOfLabel?.value || null,
        fiziksel_ozellik: result.physicalFeatureLabel?.value || null,
        en_yuksek_nokta: result.highestPointLabel?.value || null,
        en_alcak_nokta: result.lowestPointLabel?.value || null,
        tam_adres: result.streetAddress?.value || null,
        komsu_yerler: result.sharesBorderLabel?.value || null,
        nehir_agzi: result.mouthLabel?.value || null,
        nehir_kaynagi: result.originLabel?.value || null,
        drenaj_havzasi: result.drainageBasinLabel?.value || null
      },

      // ========================================
      // İDARİ & YASAL
      // ========================================
      idari: {
        koruma_statusu: result.heritageStatusLabel?.value || null,  // UNESCO, Ramsar, SİT
        koruma_alani: result.protectedAreaLabel?.value || null,
        yonetim: result.managementLabel?.value || null,
        kurulus_tarihi: parseDate(result.inception?.value),
        kapatilma_tarihi: parseDate(result.dissolved?.value),
        acilis_tarihi: parseDate(result.openingDate?.value),
        iucn_kategori: result.iucnCategory?.value || null
      },

      // ========================================
      // TARİHSEL
      // ========================================
      tarihsel: {
        isim_nereden: result.namedAfterLabel?.value || null,
        resmi_adi: result.officialName?.value || null,
        yerel_adi: result.nativeLabel?.value || null,
        kisa_adi: result.shortName?.value || null,
        onemli_olay: result.significantEventLabel?.value || null,
        donem: result.timePeriodLabel?.value || null
      },

      // ========================================
      // TURİZM
      // ========================================
      turizm: {
        resmi_site: result.website?.value || null,
        tripadvisor_id: result.tripadvisorId?.value || null,
        yillik_ziyaretci: parseNumber(result.visitors?.value),
        giris_ucreti: result.entranceFee?.value || null,
        acik_sezon: result.openSeason?.value || null,
        ziyaret_suresi: result.duration?.value || null
      },

      // ========================================
      // JEOLOJİK
      // ========================================
      jeolojik: {
        kayac_turu: result.materialLabel?.value || null
      },

      // ========================================
      // GÖRSEL & MEDYA
      // ========================================
      images: {
        hero: {
          url: imageUrl,
          filename: imageFilename,
          source: 'wikimedia'
        },
        konum_haritasi: result.locationMap?.value || null,
        locator_haritasi: result.locatorMap?.value || null,
        panorama: result.panorama?.value || null
      },

      // ========================================
      // KAYNAKLAR
      // ========================================
      olasi_kaynaklar: [
        result.article?.value || '',
        result.item.value,
        result.website?.value || '',
        result.describedAtUrl?.value || ''
      ].filter(Boolean),

      notlar: `Wikidata - ${turAdi}`,
      veri_kaynagi: 'wikidata'
    };

    processed.push(item);
  }

  return processed;
}

/**
 * Türkçe karakterleri slug'a çevir
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
 * Bir kategori için veri çek
 */
async function fetchCategory(turKodu, config) {
  const qidDisplay = Array.isArray(config.qid) ? config.qid.join(', ') : config.qid;
  console.log(`\n${config.name} (Wikidata QIDs: ${qidDisplay}) çekiliyor...\n`);

  const allItems = [];
  const seenIds = new Set();
  let offset = 0;

  while (true) {
    const query = getSPARQLQuery(config.qid, offset);
    const results = await fetchWikidataResults(query);

    if (!results || results.length === 0) {
      break;
    }

    console.log(`  📊 ${results.length} sonuç alındı (Offset: ${offset})`);

    const processed = await processResults(results, turKodu, config.name);
    let newCount = 0;

    for (const item of processed) {
      if (!seenIds.has(item.wikidata_id)) {
        seenIds.add(item.wikidata_id);
        // Slug ekle
        item.id = slugify(item.ad);
        allItems.push(item);
        newCount++;
      }
    }

    console.log(`  ✅ ${newCount} yeni alan eklendi (Toplam: ${allItems.length})`);

    // 2500'den az sonuç geldiyse, son sayfa demektir
    if (results.length < 2500) {
      break;
    }

    offset += 2500;

    // Rate limiting - API'ye nazik olalım
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Kaydet
  const output = {
    meta: {
      kaynak: 'Wikidata SPARQL',
      qid: config.qid,
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: allItems.length
    },
    alanlar: allItems
  };

  const outputPath = path.join(OUTPUT_DIR, config.file);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ ${allItems.length} ${config.name.toLowerCase()} kaydedildi: ${config.file}\n`);
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 Wikidata SPARQL Veri Çekme Başlatıldı\n');
  console.log('='.repeat(70));

  // Klasör yoksa oluştur
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    for (const [turKodu, config] of Object.entries(CATEGORIES)) {
      await fetchCategory(turKodu, config);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Wikidata veri çekme tamamlandı!');
    console.log(`📁 Çıktı klasörü: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error('\n❌ Kritik hata:', error);
    process.exit(1);
  }
}

// Scripti çalıştır
main();
