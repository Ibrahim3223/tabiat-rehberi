#!/usr/bin/env node

/**
 * SECTION-BY-SECTION İçerik Üretim Scripti v3
 *
 * Özellikler:
 * - Adaptive içerik: Ünlü yerler detaylı, az bilinir yerler kısa
 * - Anti-fabrication: Bilmediğinde uydurmak yerine dürüst yaz
 * - Genel Bakış: Tarihçeden önce giriş paragrafı
 * - Bölge otomatik belirleme (IL_BOLGE_MAP)
 * - 7 API call: Metadata, Genel Bakış, Tarihçe, Coğrafya, Flora, Ziyaret, İlginç Bilgiler
 */

import Groq from 'groq-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MASTER_LISTS_DIR = path.join(__dirname, '../data/master-lists');
const CONTENT_DIR = path.join(__dirname, '../content/alanlar');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// CLI argümanları
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity;
const isTestMode = args.includes('test');

// İl -> Bölge mapping
const IL_BOLGE_MAP = {
  // Marmara
  'İstanbul': 'Marmara', 'Edirne': 'Marmara', 'Kırklareli': 'Marmara', 'Tekirdağ': 'Marmara',
  'Çanakkale': 'Marmara', 'Balıkesir': 'Marmara', 'Bursa': 'Marmara', 'Kocaeli': 'Marmara',
  'Sakarya': 'Marmara', 'Bilecik': 'Marmara', 'Yalova': 'Marmara',
  // Ege
  'İzmir': 'Ege', 'Aydın': 'Ege', 'Muğla': 'Ege', 'Denizli': 'Ege', 'Manisa': 'Ege',
  'Uşak': 'Ege', 'Afyonkarahisar': 'Ege', 'Kütahya': 'Ege',
  // Akdeniz
  'Antalya': 'Akdeniz', 'Mersin': 'Akdeniz', 'Adana': 'Akdeniz', 'Hatay': 'Akdeniz',
  'Kahramanmaraş': 'Akdeniz', 'Osmaniye': 'Akdeniz', 'Isparta': 'Akdeniz', 'Burdur': 'Akdeniz',
  // İç Anadolu
  'Ankara': 'İç Anadolu', 'Konya': 'İç Anadolu', 'Eskişehir': 'İç Anadolu', 'Kayseri': 'İç Anadolu',
  'Sivas': 'İç Anadolu', 'Yozgat': 'İç Anadolu', 'Kırşehir': 'İç Anadolu', 'Nevşehir': 'İç Anadolu',
  'Aksaray': 'İç Anadolu', 'Niğde': 'İç Anadolu', 'Karaman': 'İç Anadolu', 'Kırıkkale': 'İç Anadolu',
  'Çankırı': 'İç Anadolu',
  // Karadeniz
  'Trabzon': 'Karadeniz', 'Rize': 'Karadeniz', 'Artvin': 'Karadeniz', 'Giresun': 'Karadeniz',
  'Ordu': 'Karadeniz', 'Samsun': 'Karadeniz', 'Sinop': 'Karadeniz', 'Kastamonu': 'Karadeniz',
  'Çorum': 'Karadeniz', 'Amasya': 'Karadeniz', 'Tokat': 'Karadeniz', 'Bartın': 'Karadeniz',
  'Karabük': 'Karadeniz', 'Zonguldak': 'Karadeniz', 'Bolu': 'Karadeniz', 'Düzce': 'Karadeniz',
  'Gümüşhane': 'Karadeniz', 'Bayburt': 'Karadeniz',
  // Doğu Anadolu
  'Erzurum': 'Doğu Anadolu', 'Erzincan': 'Doğu Anadolu', 'Kars': 'Doğu Anadolu', 'Ardahan': 'Doğu Anadolu',
  'Iğdır': 'Doğu Anadolu', 'Ağrı': 'Doğu Anadolu', 'Van': 'Doğu Anadolu', 'Hakkari': 'Doğu Anadolu',
  'Bitlis': 'Doğu Anadolu', 'Muş': 'Doğu Anadolu', 'Bingöl': 'Doğu Anadolu', 'Tunceli': 'Doğu Anadolu',
  'Elazığ': 'Doğu Anadolu', 'Malatya': 'Doğu Anadolu',
  // Güneydoğu Anadolu
  'Gaziantep': 'Güneydoğu Anadolu', 'Şanlıurfa': 'Güneydoğu Anadolu', 'Diyarbakır': 'Güneydoğu Anadolu',
  'Mardin': 'Güneydoğu Anadolu', 'Batman': 'Güneydoğu Anadolu', 'Şırnak': 'Güneydoğu Anadolu',
  'Siirt': 'Güneydoğu Anadolu', 'Adıyaman': 'Güneydoğu Anadolu', 'Kilis': 'Güneydoğu Anadolu'
};

function getBolge(il) {
  if (!il) return '';
  // Exact match
  if (IL_BOLGE_MAP[il]) return IL_BOLGE_MAP[il];
  // Partial match
  for (const [key, value] of Object.entries(IL_BOLGE_MAP)) {
    if (il.includes(key) || key.includes(il)) return value;
  }
  return '';
}

/**
 * Wikimedia Commons görsel ara
 */
async function fetchWikimediaImages(searchTerm, maxImages = 5) {
  const excludeKeywords = [
    'bird', 'kuş', 'kus', 'animal', 'hayvan',
    'airport', 'havaalani', 'havaalanı', 'havalimanı',
    'map', 'harita', 'location', 'konum',
    'logo', 'coat', 'flag', 'bayrak', 'amblem',
    'diagram', 'chart', 'graph', 'şema',
    'hare', 'tavşan', 'tavsan', 'rabbit',
    'arctic', 'kutup', 'polar'
  ];

  const searchTerms = [
    `${searchTerm} landscape`,
    `${searchTerm} panorama`,
    `${searchTerm} Turkey nature`,
    searchTerm
  ];

  let allImages = [];

  for (const term of searchTerms) {
    if (allImages.length >= maxImages) break;

    try {
      const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: term,
          gsrnamespace: 6,
          gsrlimit: 30,
          prop: 'imageinfo',
          iiprop: 'url|extmetadata|mime',
          iiurlwidth: 1200
        },
        headers: {
          'User-Agent': 'TabiatRehberi/3.0 (https://tabiatrehberi.com)'
        },
        timeout: 10000
      });

      const pages = response.data?.query?.pages || {};

      for (const page of Object.values(pages)) {
        if (allImages.length >= maxImages) break;

        const imageInfo = page.imageinfo?.[0];
        if (!imageInfo) continue;

        const mime = imageInfo.mime || '';
        const url = imageInfo.url || '';
        const title = page.title.replace('File:', '').toLowerCase();

        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(mime)) continue;

        if (url.includes('.pdf') || url.includes('.svg') || url.includes('.ogv') || url.includes('.webm')) {
          continue;
        }

        const hasExcludedKeyword = excludeKeywords.some(keyword =>
          title.includes(keyword.toLowerCase())
        );
        if (hasExcludedKeyword) continue;

        const locationWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 3);
        const hasLocationMatch = locationWords.some(word => title.includes(word));

        if (!hasLocationMatch) continue;

        allImages.push({
          url: imageInfo.url,
          thumb: imageInfo.thumburl || imageInfo.url,
          title: page.title.replace('File:', ''),
          author: imageInfo.extmetadata?.Artist?.value || 'Wikimedia Commons',
          license: imageInfo.extmetadata?.LicenseShortName?.value || 'CC BY-SA'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      // Sessizce devam et
    }
  }

  return allImages.slice(0, maxImages);
}

/**
 * SECTION 1: Metadata üret
 */
async function generateMetadata(area) {
  const prompt = `"${area.ad}" (${area.il}, ${area.tur}) için SEO metadata üret.

JSON DÖNDÜR:
{
  "title": "${area.ad} Rehberi - ${area.il}",
  "description": "150-160 karakter SEO açıklama",
  "keywords": ["${area.ad}", "${area.il}", "${area.tur}", "5-8 anahtar kelime daha"]
}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * SECTION 2: Genel Bakış (Giriş Paragrafı)
 */
async function generateGenelBakis(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında kısa bir giriş paragrafı yaz.
Bu metin sayfanın başında, tarihçeden önce gelecek.

🚨🚨🚨 MUTLAK YASAK KURALLAR - İHLAL EDİLEMEZ 🚨🚨🚨:

1. SIRALAMA YASAĞI (KESİNLİKLE YASAK):
   ❌ "en büyük", "en büyük ikinci", "en büyük üçüncü"
   ❌ "birinci", "ikinci", "üçüncü"
   ❌ "en eski", "en yüksek", "en uzun", "en derin"
   ❌ "Türkiye'nin en X'i", "İstanbul'un en X'i"
   ✅ Sadece: "büyük adalarından biri", "önemli yerlerden biri"

2. ULAŞIM YASAĞI (KESİNLİKLE YASAK):
   ❌ tramvay, metro, teleferik, füniküler, tren
   ✅ Sadece: tekne, vapur, araba (genel ifadeler)

3. EMİN DEĞİLSEN YAZMA:
   ❌ "X ile ünlüdür" (emin değilsen)
   ✅ "Doğal güzellikleri ile bilinir" (genel)

🎯 AMAÇ: Ziyaretçiye yerin ne olduğunu hızlıca anlatmak

📏 UZUNLUK: 2-3 cümle (50-100 kelime)

İçerik:
- Yerin ne olduğu (ada/milli park/göl/şelale...)
- Nerede bulunduğu
- Ana özelliği/ünü (meşhur ise)
- Örnek: "Bozcaada, Çanakkale'ye bağlı bir adadır. Tarihi kalesi, bağları ve plajları ile ünlüdür."

SADECE metni döndür, başlık ekleme.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,
    max_tokens: 300
  });

  return completion.choices[0].message.content.trim();
}

/**
 * SECTION 3: Tarihçe
 */
async function generateTarihce(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında tarihçe yaz.

🚨 KRİTİK KURALLAR:
- SADECE "${area.ad}" hakkında yaz - BAŞKA YERİ KARIŞTIRMA!
- "aslında X'dır", "bazı kaynaklarda Y'dir" gibi ifadeler YASAK
- UYDURMAK KESİNLİKLE YASAK
- Emin değilsen: "Bu yer hakkında detaylı tarihî bilgi bulunmamaktadır" yaz ve DUR
- "Önemli bir merkez" gibi genel/boş laflar YAZMA
- Tarih/kişi/olay bilmiyorsan YAZMA
- "en büyük", "en eski", "ilk", "tek" gibi SUPERLATİFLER YASAK (emin değilsen)

📏 UZUNLUK:
- Bildiğin kadar yaz - LİMİT YOK
- Ünlü yer ise: TÜM bildiklerini yaz, 500+ kelime olabilir
- Az bilinen yer ise: 2-3 cümle bile olabilir
- ÖNEMLİ: Uzatmak için UYDURMAK veya BAŞKA YER KARIŞTIRMAK YASAK

İçerik (sadece emin olduklarını yaz):
- Adın kökeni ve etimolojisi (kesin ise)
- Antik dönem, Bizans, Osmanlı tarihi (spesifik olaylar)
- KESIN tarihler, olaylar, kişiler (belirsiz değil)
- Önemli tarihi yapılar (somut)
- Tarihi önemi (doğrulanabilir)

SADECE metni döndür, başlık ekleme.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,  // ULTRA düşük: hallüsinasyon önleme
    max_tokens: 2000
  });

  return completion.choices[0].message.content.trim();
}

/**
 * SECTION 4: Coğrafya
 */
async function generateCografya(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında coğrafya bilgisi yaz.

🚨 KURALLAR:
- SADECE %100 doğru bilgileri yaz
- UYDURMAK YASAK
- "Stratejik konum", "önemli nokta" gibi boş laflar YAZMA
- Rakam bilmiyorsan YAZMA

📏 UZUNLUK:
- Bildiğin kadar yaz - LİMİT YOK
- Ünlü yer ise: Tüm coğrafi detayları ver (konum, alan, yükseklik, jeoloji, iklim, komşu yerler...)
- Az bilinen yer ise: Kısa yaz, 2-3 cümle yeterli
- ÖNEMLİ: Uzatmak için UYDURMAK YASAK

İçerik (biliyorsan):
- Konum ve koordinatlar
- Yakın şehirler/yerleşimler ve mesafeler
- Alan, yükseklik, derinlik gibi ölçümler
- Jeolojik yapı ve oluşum
- İklim özellikleri
- Önemli coğrafi noktalar (tepeler, koylar, nehirler vb.)

SADECE metni döndür, başlık ekleme.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,  // ULTRA düşük: hallüsinasyon önleme
    max_tokens: 1500
  });

  return completion.choices[0].message.content.trim();
}

/**
 * SECTION 5: Flora & Fauna
 */
async function generateFloraFauna(area) {
  // Alan türü kontrolü - ada ise özel uyarı
  const isIsland = area.tur === 'ada' || area.ad.toLowerCase().includes('ada');
  const islandWarning = isIsland ? `
⚠️ ÖZEL UYARI - BU BİR ADA:
- Adalarda BÜYÜK MEMELİLER (çakal, yaban kedisi, yaban domuzu, tilki) YAŞAMAZ
- Küçük adalarda sadece küçük memeliler olur (fare, yarasa, gelincik)
- Büyük adalarda (Gökçeada, Bozcaada gibi) bile büyük memeli popülasyonları çok nadir
- EMİN DEĞİLSEN TÜR YAZMA
` : '';

  const prompt = `"${area.ad}" (${area.il}) flora ve fauna bilgisi yaz.
${islandWarning}
🚨 KRİTİK KURALLAR:
- SADECE %100 EMİN OLDUĞUN türleri yaz
- HAYVAN/BİTKİ TÜRÜ UYDURMAK KESİNLİKLE YASAK
- Bilmiyorsan kısa yaz veya "detaylı bilgi bulunmamaktadır" de
- "Çeşitli türler" gibi belirsiz ifadeler YASAK

📏 UZUNLUK:
- Bildiğin kadar yaz - LİMİT YOK
- Milli park, koruma alanı: TÜM bilinen türleri detaylı listele
- Az bilinen yer: 1-2 cümle yeterli
- ÖNEMLİ: Uzatmak için TÜR UYDURMAK YASAK

İçerik yapısı (biliyorsan yaz):
- Bitki örtüsü genel tanımı
- Ağaç/bitki türleri (Latince isimlerle)
- Endemik türler (varsa)
- Kuş türleri
- Memeli türleri (küçük ada ise: fare, yarasa, gelincik gibi)
- Sürüngen/balık türleri
- Koruma statüsü
- Tehlike altındaki türler

SADECE metni döndür, başlık ekleme.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,
    max_tokens: 1500
  });

  return completion.choices[0].message.content.trim();
}

/**
 * SECTION 5: Ziyaret Bilgileri
 */
async function generateZiyaret(area) {
  const prompt = `"${area.ad}" (${area.il}) için ziyaret bilgileri yaz.

🚨 KRİTİK KURALLAR:
- SADECE %100 EMİN OLDUĞUN bilgileri yaz
- ULAŞIM/TESİS/ÜCRET UYDURMAK KESİNLİKLE YASAK
- Pazarlama dili KULLANMA ("ziyaretçilerini bekliyor" gibi)

⚠️ EMİN DEĞİLSEN NE YAZACAKSIN:
- "Halka açık değildir" SADECE özel mülk/askeri bölge ise kullan (emin olmalısın)
- Ulaşım bilmiyorsan: "Detaylı ulaşım bilgisi için yerel kaynaklara danışınız" yaz
- Adalar için: "Tekne ile ulaşım mümkün olabilir" gibi genel ifadeler kullanılabilir
- ASLA vapur saati, mesafe, ücret UYDURMA

⚠️ ÖZEL DİKKAT:
- Küçük/ıssız adalar: Düzenli sefer yoksa söyle AMA hemen "halka açık değil" deme
- Bisiklet kiralama, restoran, otel gibi TESİSLER VARSA YAZMA
- Aktivite: Sadece EMİN olduklarını yaz (uydurmak yasak)

📏 UZUNLUK:
- Ünlü turistik yer: DETAYLI yaz (200-300 kelime)
  * Ulaşım (hangi şehirden, nasıl, ne kadar sürer)
  * Görülmesi gereken yerler (somut)
  * Aktiviteler (gerçek olan)
  * Praktik ipuçları
  * Yakındaki yerler

- Küçük/az bilinen yer: KISA ve DÜRÜST yaz (30-50 kelime)
  * Varsa ulaşım, yoksa "ulaşım zor/yok" de
  * Kısa açıklama

⚠️ MUTLAKA JSON DÖNDÜR:
{
  "metin": "Dürüst ziyaret bilgileri (BU FIELD BOŞ OLAMAZ)",
  "en_iyi_donem": "İlkbahar ve sonbahar",
  "zorluk": "Kolay/Orta/Zor",
  "tahmini_sure": "2-3 saat",
  "aktiviteler": ["aktivite1", "aktivite2"]
}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,  // ULTRA düşük: hallüsinasyon önleme, daha doğru bilgi
    max_tokens: 1800,  // Artırıldı: ünlü yerler için daha fazla detay
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * SECTION 7: İlginç Bilgiler
 */
async function generateIlgincBilgiler(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında ilginç bilgiler listele.

🚨🚨🚨 MUTLAK YASAK - İHLAL EDİLEMEZ 🚨🚨🚨:

1. SIRALAMA/REKORTAM YASAĞI:
   ❌ "en büyük", "en büyük ikinci/üçüncü"
   ❌ "Türkiye'nin/İstanbul'un en X'i"
   ❌ "birinci", "ikinci", "üçüncü"
   ❌ "ilk", "tek", "en eski", "en yüksek"
   ❌ "X km² ile en büyük"
   ✅ Sadece: "büyük adalardan biri", "önemli yerlerden biri"

2. ULAŞIM YASAĞI:
   ❌ tramvay, metro, teleferik, füniküler, tren

3. TARİH/KİŞİ/OLAY YASAĞI:
   ❌ Tarih, kişi adı, olay (emin değilsen)

4. EMİN DEĞİLSEN HİÇ YAZMA:
   ❌ Tahmin, varsayım, "muhtemelen"
   ✅ Sadece %100 kesin bilgiler

📏 ADET:
- Ünlü yer ise: 5-7 ilginç bilgi
- Az bilinen yer ise: 2-3 ilginç bilgi

İçerik türleri:
- Rekorlar, sayısal veriler
- Tarihî olaylar
- Kültürel önem
- Doğal özellikler
- Az bilinen gerçekler

JSON DÖNDÜR:
{
  "bilgiler": ["Bilgi 1", "Bilgi 2", ...]
}`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.05,
    max_tokens: 800,  // Artırıldı: ünlü yerler için 5-7 bilgi
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Tüm bölümleri birleştir ve markdown oluştur
 */
async function generateFullContent(area, images) {
  console.log(`\n📍 İşleniyor: ${area.ad} (${area.il})`);
  console.log(`  🔄 7 bölüm için API call yapılacak...`);

  try {
    // 7 ayrı API call
    console.log(`  1/7 Metadata...`);
    const metadata = await generateMetadata(area);

    console.log(`  2/7 Genel Bakış...`);
    const genelBakis = await generateGenelBakis(area);

    console.log(`  3/7 Tarihçe...`);
    const tarihce = await generateTarihce(area);

    console.log(`  4/7 Coğrafya...`);
    const cografya = await generateCografya(area);

    console.log(`  5/7 Flora & Fauna...`);
    const floraFauna = await generateFloraFauna(area);

    console.log(`  6/7 Ziyaret...`);
    const ziyaret = await generateZiyaret(area);
    // Fallback for missing metin field
    if (!ziyaret.metin) {
      ziyaret.metin = 'Detaylı ziyaret bilgisi için yerel turizm ofislerine danışabilirsiniz.';
    }

    console.log(`  7/7 İlginç Bilgiler...`);
    const ilgincBilgiler = await generateIlgincBilgiler(area);

    // Hero image - Wikidata öncelikli
    let heroImage;
    if (area.images?.hero?.url) {
      heroImage = {
        url: area.images.hero.url,
        alt: `${area.ad} manzarası`,
        credit: area.images.hero.credit || 'Wikimedia Commons',
        license: area.images.hero.license || 'CC BY-SA'
      };
      console.log(`  ✅ Wikidata görseli kullanıldı`);
    } else if (images.length > 0) {
      heroImage = {
        url: images[0].url,
        alt: `${area.ad} manzarası`,
        credit: images[0].author,
        license: images[0].license
      };
      console.log(`  ✅ Wikimedia Commons görseli kullanıldı`);
    } else {
      heroImage = {
        url: '',
        alt: `${area.ad} manzarası`,
        credit: '',
        license: ''
      };
      console.log(`  ⚠️  Görsel bulunamadı`);
    }

    const gallery = images.slice(0, 5).map(img => ({
      url: img.url,
      thumb: img.thumb,
      alt: `${area.ad} - ${img.title}`,
      credit: img.author,
      license: img.license
    }));

    // Slug oluştur
    const slug = area.id || area.ad.toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    // İl ve ilce düzeltmesi (veri kaynağında bazen ters)
    let il = area.il;
    let ilce = area.ilce || '';

    // Eğer il "Türkiye" ise, ilce alanını il olarak kullan
    if (il === 'Türkiye' && ilce) {
      il = ilce;
      ilce = '';
    }

    // Bölge belirleme
    const bolge = getBolge(il);

    // Frontmatter
    const frontMatter = {
      title: metadata.title,
      date: new Date().toISOString(),
      draft: false,
      type: 'alan',
      alan_turu: area.tur,
      il: il,
      ilce: ilce,
      bolge: bolge,
      coordinates: {
        lat: area.koordinat?.lat || 0,
        lon: area.koordinat?.lon || 0
      },
      ziyaret: {
        en_iyi_donem: ziyaret.en_iyi_donem,
        zorluk: ziyaret.zorluk,
        tahmini_sure: ziyaret.tahmini_sure
      },
      aktiviteler: ziyaret.aktiviteler || [],
      images: {
        hero: heroImage,
        gallery: gallery
      },
      kaynaklar: area.olasi_kaynaklar?.filter(Boolean).map(url => ({
        title: new URL(url).hostname,
        url: url,
        tip: url.includes('gov.tr') ? 'resmi' : 'genel'
      })) || [],
      description: metadata.description,
      keywords: metadata.keywords,
      schema_type: 'TouristAttraction',
      wikidata_id: area.wikidata_id || ''
    };

    // YAML serialization helper
    function serializeYAML(obj, indent = 0) {
      const lines = [];
      for (const [key, value] of Object.entries(obj)) {
        const prefix = '  '.repeat(indent);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          lines.push(`${prefix}${key}:`);
          lines.push(serializeYAML(value, indent + 1));
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            lines.push(`${prefix}${key}: []`);
          } else if (typeof value[0] === 'object') {
            lines.push(`${prefix}${key}:`);
            value.forEach(item => {
              const entries = Object.entries(item);
              entries.forEach(([k, v], idx) => {
                const dash = idx === 0 ? '-' : ' ';
                const val = typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v;
                lines.push(`${prefix}  ${dash} ${k}: ${val}`);
              });
            });
          } else {
            lines.push(`${prefix}${key}:`);
            value.forEach(v => {
              lines.push(`${prefix}  - ${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`);
            });
          }
        } else {
          const val = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
          lines.push(`${prefix}${key}: ${val}`);
        }
      }
      return lines.join('\n');
    }

    // İlginç bilgiler formatla
    const ilgincBilgilerList = (ilgincBilgiler.bilgiler || [])
      .map(bilgi => `- ${bilgi}`)
      .join('\n');

    // Markdown content (Ulaşım bölümü ve son güncelleme kaldırıldı)
    const markdown = `---
${serializeYAML(frontMatter)}
---

# ${area.ad}

${genelBakis}

## Tarihçe

${tarihce}

## Coğrafya

${cografya}

## Flora ve Fauna

${floraFauna}

## Ziyaret Bilgileri

${ziyaret.metin}

## İlginç Bilgiler

${ilgincBilgilerList}
`;

    // Dosyayı yaz
    const filePath = path.join(CONTENT_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, markdown, 'utf-8');

    console.log(`  ✅ Oluşturuldu: ${slug}.md`);

    return true;

  } catch (error) {
    console.error(`  ❌ Hata: ${error.message}`);
    return false;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 İçerik Üretimi v3 Başlatıldı');
  console.log('============================================================');
  console.log(`📊 Her sayfa için 7 API call`);
  console.log(`📏 Adaptive içerik: Ünlü yerler detaylı, az bilinen dürüst kısa`);
  console.log('============================================================\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const mergedFiles = isTestMode
    ? ['test-merged.json']
    : fs.readdirSync(MASTER_LISTS_DIR).filter(f => f.endsWith('-merged.json'));

  let totalProcessed = 0;
  let totalSuccess = 0;

  for (const file of mergedFiles) {
    if (totalProcessed >= limit) break;

    console.log(`\n📋 Liste: ${file}`);
    const data = JSON.parse(fs.readFileSync(path.join(MASTER_LISTS_DIR, file), 'utf-8'));

    console.log(`   Toplam alan sayısı: ${data.alanlar?.length || 0}`);

    for (const area of data.alanlar || []) {
      if (totalProcessed >= limit) break;

      // Görselleri çek
      console.log(`  📸 Görseller aranıyor...`);
      const images = await fetchWikimediaImages(area.ad, 5);
      console.log(`  📸 ${images.length} görsel bulundu`);

      // İçeriği oluştur
      const success = await generateFullContent(area, images);

      if (success) totalSuccess++;
      totalProcessed++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n============================================================');
  console.log('✅ İçerik üretimi tamamlandı!');
  console.log(`📊 İstatistikler:`);
  console.log(`   - İşlenen alan: ${totalProcessed}`);
  console.log(`   - Başarılı: ${totalSuccess}`);
  console.log(`   - Başarısız: ${totalProcessed - totalSuccess}`);
  console.log(`📁 Çıktı: ${CONTENT_DIR}`);
  console.log('============================================================\n');
}

main();
