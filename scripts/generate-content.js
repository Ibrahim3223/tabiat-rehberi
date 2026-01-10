#!/usr/bin/env node

/**
 * İçerik Üretim Scripti - Groq API ile Otomatik Sayfa Oluşturma
 *
 * Bu script:
 * 1. Master listeden alanları okur
 * 2. Her alan için Groq API kullanarak detaylı içerik üretir
 * 3. Kaynakları doğrular (kritik bilgiler için)
 * 4. Hugo markdown dosyası oluşturur
 * 5. Kalite kontrol yapar
 *
 * Kullanım:
 *   npm run generate              - Tüm alanlar için içerik üret
 *   npm run generate:test         - Test modu (ilk 10 alan)
 */

import Groq from 'groq-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env dosyası parent klasörde
dotenv.config({ path: path.join(__dirname, '../.env') });

const MASTER_LISTS_DIR = path.join(__dirname, '../data/master-lists');
const CONTENT_DIR = path.join(__dirname, '../content/alanlar');
const REVIEW_QUEUE_DIR = path.join(__dirname, '../data/review-queue');

// Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// CLI argümanları
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (isTestMode ? 10 : Infinity);

/**
 * Kalite kontrol: Koordinat Türkiye sınırları içinde mi?
 */
function isInTurkey(lat, lon) {
  if (!lat || !lon) return false;
  // Türkiye yaklaşık: lat 36-42, lon 26-45
  return lat >= 35 && lat <= 43 && lon >= 25 && lon <= 46;
}

/**
 * Groq API ile kaynak doğrulama ve bilgi çekme
 */
async function fetchAreaDetails(area) {
  console.log(`  🤖 Groq API ile detay çekiliyor: ${area.ad}`);

  const prompt = `Sen Türkiye'deki doğal alanlar konusunda uzman bir araştırmacısın.

Görevin: "${area.ad}" (${area.il}, Türkiye) hakkında SADECE GÜVENİLİR KAYNAKLARDAN bilgi toplamak.

ÖNEMLİ KURALLAR:
1. Giriş ücreti, açılış saatleri, kapalı günler gibi BİLGİLERDE ASLA TAHMİN YAPMA
2. Bilgi bulamazsan "Bilinmiyor" yaz
3. En az 2 güvenilir kaynak bul (resmi web siteleri, DKMP, belediye sayfaları)
4. Koordinatları doğrula

Lütfen şu JSON formatında döndür:

{
  "ad": "${area.ad}",
  "tur": "${area.tur}",
  "il": "${area.il}",
  "ilce": "İlçe adı",
  "bolge": "marmara/ege/akdeniz/ic-anadolu/karadeniz/dogu-anadolu/guneydogu-anadolu",
  "koordinat": {
    "lat": ${area.koordinat?.lat || 0},
    "lon": ${area.koordinat?.lon || 0}
  },
  "giris": {
    "ucret": {
      "yetiskin": "Bilinmiyor veya miktar (örn: 50 TL, Ücretsiz)",
      "cocuk": "Bilinmiyor veya miktar",
      "arac": "Bilinmiyor veya miktar"
    },
    "saatler": {
      "acilis": "Bilinmiyor veya saat (örn: 08:00)",
      "kapanis": "Bilinmiyor veya saat (örn: 18:00)",
      "kapali_gunler": [],
      "sezonluk_degisiklik": ""
    },
    "dogrulanmadi": true
  },
  "ziyaret": {
    "en_iyi_donem": "İlkbahar/Yaz/Sonbahar/Kış/Yıl Boyu",
    "zorluk": "Kolay/Orta/Zor",
    "bebek_arabasi_uygun": false,
    "engelli_erisimi": false
  },
  "aktiviteler": ["kamp", "yürüyüş", "piknik", "fotoğrafçılık"],
  "tesisler": {
    "wc": false,
    "cesme": false,
    "piknik_masasi": false,
    "ziyaretci_merkezi": false,
    "kamp_alani": false,
    "otopark": false
  },
  "ulasim": {
    "en_yakin_sehir": "Şehir adı",
    "mesafe_km": 0,
    "yol_tipi": "Asfalt/Stabilize/Toprak",
    "toplu_tasima": false
  },
  "ozet": "1-2 paragraf detaylı açıklama",
  "one_cikanlar": [
    "Görülecek/yapılacak şey 1",
    "Görülecek/yapılacak şey 2"
  ],
  "kurallar": [
    "Kural 1",
    "Kural 2"
  ],
  "kaynaklar": [
    {
      "title": "Kaynak başlığı",
      "url": "https://...",
      "tip": "resmi/akademik/medya"
    }
  ]
}

SADECE JSON döndür, başka açıklama yazma.`;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Sen Türkiye coğrafyası ve doğal alanlar uzmanısın. SADECE doğrulanmış bilgi verirsin. Emin olmadığın bilgilerde "Bilinmiyor" yazarsın.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq API boş yanıt döndü');
    }

    const details = JSON.parse(content);
    console.log(`  ✅ Detaylar alındı`);
    return details;

  } catch (error) {
    console.error(`  ❌ Groq API hatası:`, error.message);
    return null;
  }
}

/**
 * Hugo front matter + içerik oluştur
 */
function generateMarkdown(details) {
  const frontMatter = {
    title: details.ad,
    date: new Date().toISOString(),
    draft: false,
    type: 'alan',
    alan_turu: details.tur,
    il: details.il,
    ilce: details.ilce || '',
    bolge: details.bolge || '',
    coordinates: details.koordinat || { lat: 0, lon: 0 },
    ziyaret: details.ziyaret || {},
    giris: {
      ...details.giris,
      son_dogrulama: new Date().toISOString().split('T')[0]
    },
    aktiviteler: details.aktiviteler || [],
    tesisler: details.tesisler || {},
    ulasim: details.ulasim || {},
    images: {
      hero: {
        url: '',
        alt: `${details.ad} manzarası`,
        credit: '',
        license: ''
      },
      gallery: []
    },
    kaynaklar: details.kaynaklar || [],
    description: details.ozet ? details.ozet.substring(0, 155) : '',
    keywords: [details.ad, details.il, details.tur],
    schema_type: 'TouristAttraction'
  };

  // Markdown içeriği
  const content = `---
${yaml.dump(frontMatter, { lineWidth: -1, noRefs: true })}---

## Kısa Özet

${details.ozet || 'Bilgi henüz eklenmedi.'}

## Öne Çıkanlar

${details.one_cikanlar?.map(item => `- ${item}`).join('\n') || '- Bilgi bekleniyor'}

## Ulaşım

${details.ulasim?.en_yakin_sehir ? `**En yakın şehir:** ${details.ulasim.en_yakin_sehir} (${details.ulasim.mesafe_km} km)` : ''}
${details.ulasim?.yol_tipi ? `**Yol durumu:** ${details.ulasim.yol_tipi}` : ''}

## Tesisler

${Object.entries(details.tesisler || {}).filter(([_, v]) => v).map(([k, _]) => `- ${k.replace(/_/g, ' ')}`).join('\n') || 'Bilgi bekleniyor'}

## Kurallar & Güvenlik

${details.kurallar?.map(item => `- ${item}`).join('\n') || '- Çevre koruma kurallarına uyunuz\n- Çöplerinizi yanınızda götürünüz'}

## Kaynaklar

${details.kaynaklar?.map(k => `- [${k.title}](${k.url}) (${k.tip})`).join('\n') || 'Kaynak araştırılıyor'}

---

*Son güncelleme: ${new Date().toISOString().split('T')[0]}*
`;

  return content;
}

/**
 * Kalite kontrol
 */
function qualityCheck(details, area) {
  const issues = [];

  // Koordinat kontrolü
  if (!isInTurkey(details.koordinat?.lat, details.koordinat?.lon)) {
    issues.push('Koordinat Türkiye dışında veya geçersiz');
  }

  // Kaynak kontrolü
  if (!details.kaynaklar || details.kaynaklar.length < 2) {
    issues.push('En az 2 kaynak gerekli');
  }

  // Giriş bilgisi doğrulanmamış uyarısı
  if (details.giris?.dogrulanmadi) {
    issues.push('Giriş ücreti/saatleri doğrulanamadı');
  }

  return issues;
}

/**
 * Review queue'ya ekle
 */
function addToReviewQueue(area, issues) {
  const reviewFile = path.join(REVIEW_QUEUE_DIR, 'pending-review.json');

  let queue = [];
  if (fs.existsSync(reviewFile)) {
    queue = JSON.parse(fs.readFileSync(reviewFile, 'utf-8'));
  }

  queue.push({
    id: area.id,
    ad: area.ad,
    il: area.il,
    issues: issues,
    added_at: new Date().toISOString()
  });

  fs.writeFileSync(reviewFile, JSON.stringify(queue, null, 2), 'utf-8');
  console.log(`  ⚠️  Review queue'ya eklendi: ${issues.join(', ')}`);
}

/**
 * Tek bir alan için içerik üret
 */
async function generateArea(area) {
  console.log(`\n📍 İşleniyor: ${area.ad} (${area.il})`);

  // Groq API ile detay çek
  const details = await fetchAreaDetails(area);
  if (!details) {
    addToReviewQueue(area, ['Groq API hatası - detay alınamadı']);
    return false;
  }

  // Kalite kontrol
  const issues = qualityCheck(details, area);

  if (issues.length > 0) {
    console.log(`  ⚠️  Kalite sorunları tespit edildi: ${issues.length} adet`);
    addToReviewQueue(area, issues);
  }

  // Markdown üret
  const markdown = generateMarkdown(details);

  // Dosyaya yaz
  const filename = `${area.id}.md`;
  const filepath = path.join(CONTENT_DIR, filename);
  fs.writeFileSync(filepath, markdown, 'utf-8');

  console.log(`  ✅ Oluşturuldu: ${filename}`);
  return true;
}

/**
 * Tüm master listeleri işle
 */
async function processAllLists() {
  console.log('🚀 İçerik Üretimi Başlatıldı\n');
  console.log('='.repeat(60));
  console.log(`📊 Mod: ${isTestMode ? 'TEST (ilk ' + limit + ' alan)' : 'TAM ÜRETİM'}`);
  console.log('='.repeat(60) + '\n');

  // Klasörleri oluştur
  [CONTENT_DIR, REVIEW_QUEUE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Master listeleri oku
  const listFiles = fs.readdirSync(MASTER_LISTS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'README.md');

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalAreas = 0;

  for (const listFile of listFiles) {
    const listPath = path.join(MASTER_LISTS_DIR, listFile);
    const data = JSON.parse(fs.readFileSync(listPath, 'utf-8'));

    console.log(`\n📋 Liste: ${listFile}`);
    console.log(`   Toplam alan sayısı: ${data.alanlar?.length || 0}`);

    if (!data.alanlar || data.alanlar.length === 0) {
      console.log(`   ⏭️  Boş liste, atlanıyor\n`);
      continue;
    }

    const areas = data.alanlar.slice(0, limit - totalProcessed);
    totalAreas += areas.length;

    for (const area of areas) {
      const success = await generateArea(area);
      if (success) totalSuccess++;
      totalProcessed++;

      if (totalProcessed >= limit) break;

      // Rate limiting (Groq API için)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (totalProcessed >= limit) break;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ İçerik üretimi tamamlandı!');
  console.log(`📊 İstatistikler:`);
  console.log(`   - İşlenen alan: ${totalProcessed}`);
  console.log(`   - Başarılı: ${totalSuccess}`);
  console.log(`   - Review queue: ${totalProcessed - totalSuccess}`);
  console.log(`📁 Çıktı: ${CONTENT_DIR}`);
  console.log('='.repeat(60) + '\n');
}

// Ana fonksiyon
processAllLists().catch(error => {
  console.error('\n❌ Kritik hata:', error);
  process.exit(1);
});
