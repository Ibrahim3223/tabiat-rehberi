#!/usr/bin/env node

/**
 * OPTIMAL İçerik Üretim Scripti v4
 *
 * Prensip: KISS (Keep It Simple, Stupid)
 * - Temiz, net promptlar
 * - Post-processing filter
 * - Data-driven (gerçek bilgiler kullan)
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

// CLI args
const args = process.argv.slice(2);
const isTestMode = args.includes('test');

// İl -> Bölge mapping
const IL_BOLGE_MAP = {
  'İstanbul': 'Marmara', 'Edirne': 'Marmara', 'Kırklareli': 'Marmara', 'Tekirdağ': 'Marmara',
  'Çanakkale': 'Marmara', 'Balıkesir': 'Marmara', 'Bursa': 'Marmara', 'Kocaeli': 'Marmara',
  'Sakarya': 'Marmara', 'Bilecik': 'Marmara', 'Yalova': 'Marmara',
  'İzmir': 'Ege', 'Aydın': 'Ege', 'Muğla': 'Ege', 'Denizli': 'Ege', 'Manisa': 'Ege',
  'Uşak': 'Ege', 'Afyonkarahisar': 'Ege', 'Kütahya': 'Ege',
  'Antalya': 'Akdeniz', 'Mersin': 'Akdeniz', 'Adana': 'Akdeniz', 'Hatay': 'Akdeniz',
  'Kahramanmaraş': 'Akdeniz', 'Osmaniye': 'Akdeniz', 'Isparta': 'Akdeniz', 'Burdur': 'Akdeniz',
  'Ankara': 'İç Anadolu', 'Konya': 'İç Anadolu', 'Eskişehir': 'İç Anadolu', 'Kayseri': 'İç Anadolu',
  'Sivas': 'İç Anadolu', 'Yozgat': 'İç Anadolu', 'Kırşehir': 'İç Anadolu', 'Nevşehir': 'İç Anadolu',
  'Aksaray': 'İç Anadolu', 'Niğde': 'İç Anadolu', 'Kırıkkale': 'İç Anadolu', 'Karaman': 'İç Anadolu', 'Çankırı': 'İç Anadolu',
  'Trabzon': 'Karadeniz', 'Samsun': 'Karadeniz', 'Ordu': 'Karadeniz', 'Giresun': 'Karadeniz',
  'Rize': 'Karadeniz', 'Artvin': 'Karadeniz', 'Gümüşhane': 'Karadeniz', 'Bayburt': 'Karadeniz',
  'Amasya': 'Karadeniz', 'Tokat': 'Karadeniz', 'Çorum': 'Karadeniz', 'Sinop': 'Karadeniz',
  'Kastamonu': 'Karadeniz', 'Bartın': 'Karadeniz', 'Karabük': 'Karadeniz', 'Zonguldak': 'Karadeniz', 'Düzce': 'Karadeniz', 'Bolu': 'Karadeniz',
  'Erzurum': 'Doğu Anadolu', 'Erzincan': 'Doğu Anadolu', 'Kars': 'Doğu Anadolu', 'Ağrı': 'Doğu Anadolu',
  'Iğdır': 'Doğu Anadolu', 'Ardahan': 'Doğu Anadolu', 'Muş': 'Doğu Anadolu', 'Bingöl': 'Doğu Anadolu',
  'Tunceli': 'Doğu Anadolu', 'Elazığ': 'Doğu Anadolu', 'Malatya': 'Doğu Anadolu', 'Van': 'Doğu Anadolu', 'Bitlis': 'Doğu Anadolu', 'Hakkari': 'Doğu Anadolu',
  'Gaziantep': 'Güneydoğu Anadolu', 'Şanlıurfa': 'Güneydoğu Anadolu', 'Diyarbakır': 'Güneydoğu Anadolu',
  'Mardin': 'Güneydoğu Anadolu', 'Batman': 'Güneydoğu Anadolu', 'Şırnak': 'Güneydoğu Anadolu',
  'Siirt': 'Güneydoğu Anadolu', 'Kilis': 'Güneydoğu Anadolu', 'Adıyaman': 'Güneydoğu Anadolu'
};

/**
 * POST-PROCESSING: Yasaklı ifadeleri temizle
 *
 * İzin verilen SADECE:
 * - "Türkiye'nin en büyük adasıdır" Gökçeada için
 */
function cleanText(text, areaName = '') {
  if (!text) return text;

  const isGokceada = areaName.toLowerCase().includes('gökçeada') || areaName.toLowerCase().includes('gokceada');

  // AGGRESSIVE cleaning - tüm sıralama ifadelerini temizle
  const replacements = [
    // "en büyük X'inci" patterns
    { pattern: /Türkiye'nin en büyük (ikinci|üçüncü|dördüncü|beşinci|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'Türkiye\'nin önemli adalarından biri' },
    { pattern: /İstanbul'un en büyük (ikinci|üçüncü|dördüncü|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'İstanbul\'un önemli adalarından biri' },
    { pattern: /Prens Adaları'nın en büyük (ikinci|üçüncü|dördüncü|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'Prens Adaları\'nın büyük adalarından biri' },

    // "en büyük ada" (sadece Gökçeada için izin ver)
    {
      pattern: /(?:Türkiye'nin|İstanbul'un|Prens Adaları'nın|grubun|takımının) en büyük ada[sı]?[ıdır]*/gi,
      replace: (match) => {
        if (isGokceada && match.includes("Türkiye'nin")) {
          return match; // Gökçeada için "Türkiye'nin en büyük adasıdır" OK
        }
        return match.replace(/en büyük ada[sı]?[ıdır]*/, 'büyük adalarından biri');
      }
    },

    // Genel "en X" patterns
    { pattern: /en eski ada[sı]?[ıdır]*/gi, replace: 'tarihi adalardan biri' },
    { pattern: /en yüksek ada[sı]?[ıdır]*/gi, replace: 'yüksek adalardan biri' },
    { pattern: /en küçük ada[sı]?[ıdır]*/gi, replace: 'küçük adalardan biri' },
  ];

  let cleaned = text;

  for (const { pattern, replace } of replacements) {
    if (typeof replace === 'function') {
      cleaned = cleaned.replace(pattern, replace);
    } else {
      cleaned = cleaned.replace(pattern, replace);
    }
  }

  return cleaned;
}

/**
 * SYSTEM MESSAGE: Model'e kimliğini söyle
 */
const SYSTEM_CONTEXT = `Sen Türkiye'nin doğal alanları hakkında ansiklopedik bilgi yazan bir uzmansın.

TEMEL KURALLARI:
1. Sadece kesin bildiğin bilgileri yaz
2. Sıralama/karşılaştırma yapma (en büyük ikinci, üçüncü vb.)
3. Ulaşım araçları uydurma (tramvay, teleferik vb.)
4. Emin değilsen genel ifadeler kullan

Ton: Objektif, bilgilendirici, mütevazı`;

/**
 * 1. METADATA - Basit ve temiz
 */
async function generateMetadata(area) {
  const isIsland = area.alan_turu === 'ada' || area.tip === 'ada';

  const prompt = `"${area.ad}" (${area.il}) için metadata oluştur.

Bilinen bilgiler:
- Tür: ${area.alan_turu || area.tip || 'doğal alan'}
- Konum: ${area.il}${area.ilce ? ', ' + area.ilce : ''}

Görev: title, description, keywords oluştur.
- Description: 1 cümle, 120-150 karakter
- Keywords: 6-8 adet
- Sıralama/karşılaştırma kullanma

JSON:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    max_tokens: 400,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * 2. GENEL BAKIŞ - Basit giriş
 */
async function generateGenelBakis(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında 2-3 cümlelik giriş paragrafı yaz.

İçerik:
- Ne olduğu (${area.alan_turu || 'doğal alan'})
- Nerede olduğu
- Genel özelliği (varsa)

YAZMA:
- Sıralama (en büyük ikinci vb.)
- Ulaşım detayları
- Emin olmadığın bilgiler

Sadece paragrafı döndür.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 200
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 3. TARİHÇE - Konservatif
 */
async function generateTarihce(area) {
  const prompt = `"${area.ad}" (${area.il}) hakkında tarihçe yaz.

Kurallar:
- Sadece "${area.ad}" hakkında yaz
- Emin olmadığın tarihi bilgi yazma
- Başka yerle karıştırma
- Kısa tut (100-200 kelime)

Metin döndür.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 600
  });

  return completion.choices[0].message.content.trim();
}

/**
 * 4. COĞRAFYA - Objektif
 */
async function generateCografya(area) {
  const coords = area.koordinatlar || area.coordinates || {};

  const prompt = `"${area.ad}" (${area.il}) coğrafyası hakkında yaz.

Bilinen:
- Konum: ${area.il}${area.ilce ? ', ' + area.ilce : ''}
${coords.lat ? `- Koordinat: ${coords.lat}, ${coords.lon}` : ''}

İçerik: Konum, alan, yükseklik, jeoloji, iklim (varsa)

150-200 kelime. Metin döndür.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 600
  });

  return completion.choices[0].message.content.trim();
}

/**
 * 5. FLORA/FAUNA - Konservatif
 */
async function generateFloraFauna(area) {
  const isIsland = area.alan_turu === 'ada' || area.tip === 'ada';

  const prompt = `"${area.ad}" flora ve fauna hakkında yaz.

${isIsland ? 'DİKKAT: Bu bir ada - büyük memeliler yok, kuş/küçük hayvanlar var.' : ''}

İçerik: Bitki örtüsü, hayvan türleri (varsa bilinen)
Emin değilsen: "Detaylı bilgi bulunmamaktadır" de

150-200 kelime. Metin döndür.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 600
  });

  return completion.choices[0].message.content.trim();
}

/**
 * 6. ZİYARET BİLGİLERİ - Dürüst
 */
async function generateZiyaret(area) {
  const prompt = `"${area.ad}" ziyaret bilgileri.

Kurallar:
- Ulaşım/tesis/ücret bilmiyorsan "Yerel kaynaklara danışınız" de
- Kesin olmayan bilgi verme

JSON:
{
  "metin": "Ziyaret bilgileri (varsa ulaşım, aktiviteler)",
  "en_iyi_donem": "İlkbahar ve sonbahar",
  "zorluk": "Kolay",
  "tahmini_sure": "2-3 saat",
  "aktiviteler": ["..."]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * 7. İLGİNÇ BİLGİLER - Minimal
 */
async function generateIlgincBilgiler(area) {
  const prompt = `"${area.ad}" hakkında 3-5 ilginç bilgi.

YASAK:
- Sıralama (en büyük ikinci, Türkiye'nin en X'i)
- Ulaşım uydurma
- Kesin olmayan tarih/kişi

JSON:
{
  "bilgiler": ["Bilgi 1", "Bilgi 2", ...]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content);
  // Post-process her bilgiyi temizle
  if (result.bilgiler) {
    result.bilgiler = result.bilgiler.map(b => cleanText(b, area.ad));
  }
  return result;
}

/**
 * FULL CONTENT GENERATION
 */
async function generateFullContent(area, images) {
  console.log(`\n📍 İşleniyor: ${area.ad} (${area.il})`);
  console.log(`  🔄 7 bölüm için API call yapılacak...`);

  try {
    // 1. Metadata
    console.log(`  1/7 Metadata...`);
    const metadata = await generateMetadata(area);

    // 2. Genel Bakış
    console.log(`  2/7 Genel Bakış...`);
    const genelBakis = await generateGenelBakis(area);

    // 3. Tarihçe
    console.log(`  3/7 Tarihçe...`);
    const tarihce = await generateTarihce(area);

    // 4. Coğrafya
    console.log(`  4/7 Coğrafya...`);
    const cografya = await generateCografya(area);

    // 5. Flora/Fauna
    console.log(`  5/7 Flora & Fauna...`);
    const floraFauna = await generateFloraFauna(area);

    // 6. Ziyaret
    console.log(`  6/7 Ziyaret...`);
    const ziyaret = await generateZiyaret(area);

    // 7. İlginç Bilgiler
    console.log(`  7/7 İlginç Bilgiler...`);
    const ilgincBilgiler = await generateIlgincBilgiler(area);

    // Frontmatter oluştur
    const coords = area.koordinatlar || area.coordinates || {};
    const il = area.il && area.il !== 'Türkiye' ? area.il : (area.ilce && IL_BOLGE_MAP[area.ilce] ? area.ilce : 'Türkiye');
    const bolge = IL_BOLGE_MAP[il] || 'Türkiye';

    const frontmatter = {
      title: metadata.title,
      date: new Date().toISOString(),
      draft: false,
      type: 'alan',
      alan_turu: area.alan_turu || area.tip || 'doğal_alan',
      il: il,
      ilce: area.ilce || '',
      bolge: bolge,
      coordinates: coords.lat ? { lat: coords.lat, lon: coords.lon } : undefined,
      ziyaret: {
        en_iyi_donem: ziyaret.en_iyi_donem,
        zorluk: ziyaret.zorluk,
        tahmini_sure: ziyaret.tahmini_sure
      },
      aktiviteler: ziyaret.aktiviteler || [],
      images: formatImages(images, area),
      kaynaklar: area.kaynaklar || [],
      description: metadata.description,
      keywords: metadata.keywords,
      schema_type: 'TouristAttraction',
      wikidata_id: area.wikidata_id || area.wikidata_qid || ''
    };

    // Markdown içerik
    const content = `---
${Object.entries(frontmatter).filter(([_, v]) => v !== undefined).map(([k, v]) =>
  `${k}: ${typeof v === 'object' ? JSON.stringify(v, null, 2).split('\n').join('\n  ') : JSON.stringify(v)}`
).join('\n')}
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

${cleanText(ziyaret.metin, area.ad)}

## İlginç Bilgiler

${ilgincBilgiler.bilgiler.map(b => `- ${b}`).join('\n')}
`;

    // Dosya yaz
    const filename = area.id || area.ad.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const filepath = path.join(CONTENT_DIR, `${filename}.md`);
    fs.writeFileSync(filepath, content, 'utf-8');

    console.log(`  ✅ Oluşturuldu: ${filename}.md`);
    return true;

  } catch (error) {
    console.error(`  ❌ Hata: ${error.message}`);
    return false;
  }
}

function formatImages(images, area) {
  if (!images || images.length === 0) return {};

  return {
    hero: {
      url: images[0].url,
      alt: `${area.ad} manzarası`,
      credit: 'Wikimedia Commons',
      license: images[0].license || 'CC BY-SA'
    },
    gallery: images.slice(1, 6).map(img => ({
      url: img.url,
      thumb: img.thumb || img.url,
      alt: `${area.ad} - ${img.title || ''}`,
      credit: img.credit || 'Wikimedia Commons',
      license: img.license || 'CC BY-SA'
    }))
  };
}

async function fetchWikimediaImages(searchTerm, limit = 5) {
  try {
    const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: `${searchTerm}`,
        gsrlimit: limit,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: 1200
      }
    });

    if (!response.data.query) return [];

    return Object.values(response.data.query.pages).map(page => ({
      url: page.imageinfo?.[0]?.url || '',
      thumb: page.imageinfo?.[0]?.thumburl || '',
      title: page.title,
      license: page.imageinfo?.[0]?.extmetadata?.License?.value || 'CC BY-SA'
    }));
  } catch {
    return [];
  }
}

/**
 * MAIN
 */
async function main() {
  console.log('🚀 İçerik Üretimi v4 - OPTIMAL');
  console.log('============================================================');
  console.log('📊 Temiz promptlar + Post-processing filter');
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
    console.log(`\n📋 Liste: ${file}`);
    const data = JSON.parse(fs.readFileSync(path.join(MASTER_LISTS_DIR, file), 'utf-8'));

    console.log(`   Toplam alan sayısı: ${data.alanlar?.length || 0}`);

    for (const area of data.alanlar || []) {
      console.log(`  📸 Görseller aranıyor...`);
      const images = await fetchWikimediaImages(area.ad, 5);
      console.log(`  📸 ${images.length} görsel bulundu`);

      const success = await generateFullContent(area, images);

      if (success) totalSuccess++;
      totalProcessed++;

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
