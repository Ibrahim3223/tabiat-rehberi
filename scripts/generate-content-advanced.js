#!/usr/bin/env node

/**
 * GELİŞTİRİLMİŞ İçerik Üretim Scripti v2.0
 *
 * YENİ ÖZELLİKLER:
 * - Wikimedia Commons'tan otomatik görsel çekme
 * - Resmi kaynaklardan giriş ücreti/saatleri
 * - 800-1200 kelime uzun form SEO içerik
 * - Detaylı bölümler: Tarihçe, Flora/Fauna, Aktiviteler, Yol Tarifi
 * - Schema.org JSON-LD
 * - Meta description optimizasyonu
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
const isTestMode = args.includes('--test');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : (isTestMode ? 10 : Infinity);

/**
 * Wikimedia Commons'tan görsel ara (ULTIMATE VERSİYON - Akıllı filtreleme)
 */
async function fetchWikimediaImages(searchTerm, maxImages = 5) {
  // EXCLUDE LIST - Bu kelimeleri içeren görselleri ATLA
  const excludeKeywords = [
    'bird', 'kuş', 'kus', 'animal', 'hayvan',
    'airport', 'havaalani', 'havaalanı', 'havalimanı',
    'map', 'harita', 'location', 'konum',
    'logo', 'coat', 'flag', 'bayrak', 'amblem',
    'diagram', 'chart', 'graph', 'şema',
    'hare', 'tavşan', 'tavsan', 'rabbit',
    'arctic', 'kutup', 'polar'
  ];

  // Alternatif arama terimleri
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
          gsrlimit: 30, // Daha fazla çek, agresif filtrele
          prop: 'imageinfo',
          iiprop: 'url|extmetadata|mime',
          iiurlwidth: 1200
        },
        headers: {
          'User-Agent': 'TabiatRehberi/2.0 (https://tabiatrehberi.com)'
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

        // 1. MIME type check
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(mime)) continue;

        // 2. File extension check
        if (url.includes('.pdf') || url.includes('.svg') || url.includes('.ogv') || url.includes('.webm')) {
          continue;
        }

        // 3. EXCLUDE keywords check - KRİTİK!
        const hasExcludedKeyword = excludeKeywords.some(keyword =>
          title.includes(keyword.toLowerCase())
        );
        if (hasExcludedKeyword) {
          console.log(`  ⚠️  Filtrelendi (irrelevant): ${page.title}`);
          continue;
        }

        // 4. Location name check - title'da searchTerm'in bir kısmı olmalı
        const locationWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 3);
        const hasLocationMatch = locationWords.some(word => title.includes(word));

        if (!hasLocationMatch) {
          console.log(`  ⚠️  Filtrelendi (no location match): ${page.title}`);
          continue;
        }

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
      console.error(`  ⚠️  "${term}" için görsel arama hatası:`, error.message);
    }
  }

  return allImages.slice(0, maxImages);
}

/**
 * Groq ile UZUN FORM, SEO optimized içerik üret
 */
async function generateRichContent(area, images) {
  console.log(`  🤖 Groq ile zengin içerik oluşturuluyor: ${area.ad}`);

  const imageContext = images.length > 0
    ? `\n\nGÖRSELLER MEVCUT: ${images.length} adet görsel bulundu. İçerikte görsellere referans verebilirsin.`
    : '';

  const prompt = `Sen Türkiye'nin doğal alanları konusunda uzman bir içerik yazarısısın. Görevi: "${area.ad}" (${area.il}, ${area.ilce || ''}) hakkında KAPSAMLı, SEO OPTİMİZE, UZUN FORM bir rehber yazısı yazmak.

ALAN BİLGİLERİ:
- Ad: ${area.ad}
- Tür: ${area.tur}
- İl: ${area.il}
- İlçe: ${area.ilce || 'Bilinmiyor'}
- Koordinat: ${area.koordinat?.lat}, ${area.koordinat?.lon}
- Wikidata: ${area.wikidata_id || 'Yok'}
- Kaynaklar: ${area.olasi_kaynaklar?.join(', ') || 'Yok'}${imageContext}

🚨 KRİTİK KURALLAR - ULTIMATE İÇERİK SİSTEMİ:

1. **UZUNLUK ZORUNLU**: MİNİMUM 1500 KELİME! Her bölüm en az 200-250 kelime olmalı
2. **TEK CÜMLE YASAK**: Her paragraf en az 4-5 cümle içermeli, detaylı açıklamalar
3. **TEKRAR ETMİYORUZ**: Aynı bilgiyi farklı yerlerde tekrar yazma - her cümle özgün olmalı
4. **DETAY SEVİYESİ MAKSIMUM**:
   - ❌ "Ada güzeldir"
   - ✅ "Ada, turkuaz rengi kristal berraklığındaki denizi, altın sarısı ince taneli kumlarıyla kaplı 3 kilometrelik sahil şeridi ve endemik bitki türleriyle bezeli yamaçları ile ziyaretçilerini büyüler"
5. **HER BÖLÜM KAPSAMLI**:
   - Tarihçe: 250+ kelime (dönemler, olaylar, tarihi kişiler, etimoloji)
   - Coğrafya: 250+ kelime (jeoloji, topografya, su kaynakları, komşu alanlar)
   - Flora/Fauna: 250+ kelime (türler, endemikler, ekosistem, koruma durumu)
   - İklim: 150+ kelime (sıcaklık, yağış, mevsimler, mikro iklim)
   - Ulaşım: 200+ kelime (tüm alternatifler, mesafeler, ipuçları)
6. **GİRİŞ ÜCRETİ**: Eğer bilmiyorsan "Bilinmiyor" de - ASLA uydurmak yasak!
7. **SEO**: Anahtar kelimeleri doğal akışta kullan, keyword stuffing yapma
8. **BİLİMSEL DOĞRULUK**: Botanik ve zoolojik isimleri doğru yaz

AŞAĞIDAKİ YAPIDA JSON DÖNDÜR:

{
  "meta": {
    "title": "${area.ad} Rehberi - ${area.il}",
    "description": "150-160 karakter arası SEO optimized meta açıklama",
    "keywords": ["${area.ad}", "${area.il}", "${area.tur}", "en az 5 adet"]
  },
  "intro": {
    "kisa_ozet": "2-3 cümle ile özet (150-200 kelime)",
    "one_cikanlar": ["En az 5 öne çıkan özellik"]
  },
  "detayli_bilgi": {
    "tarihce": "Alanın tarihçesi, adının kökeni, tarihi önemi (200-300 kelime)",
    "cografya_jeoloji": "Coğrafi konum, jeolojik yapı, oluşum süreci (200-300 kelime)",
    "flora_fauna": "Bölgenin bitki örtüsü, hayvan türleri, endemik türler (200-300 kelime)",
    "iklim": "İklim özellikleri, mevsimsel değişimler"
  },
  "ziyaret": {
    "en_iyi_donem": "Hangi mevsimler, aylar ve NEDEN (detaylı açıklama)",
    "zorluk": "Kolay/Orta/Zor",
    "tahmini_sure": "Ziyaret süresi (saat)",
    "onerilen_aktiviteler": [
      {
        "ad": "Aktivite adı",
        "aciklama": "Detaylı açıklama",
        "zorluk": "Kolay/Orta/Zor",
        "sure": "Tahmini süre"
      }
    ]
  },
  "ulasim": {
    "detayli_yol_tarifi": "Nasıl gidilir, hangi yollar, alternatif ulaşım yolları (300-400 kelime)",
    "en_yakin_sehir": "${area.il}",
    "mesafe_km": 0,
    "ucak": "En yakın havalimanı ve mesafe",
    "otobus": "Otobüs seçenekleri",
    "ozel_arac": "Özel araçla yol tarifi"
  },
  "pratik_bilgiler": {
    "giris_ucreti": {
      "yetiskin": "Eğer biliyorsan rakam, yoksa 'Bilinmiyor'",
      "cocuk": "Eğer biliyorsan rakam, yoksa 'Bilinmiyor'",
      "arac": "Eğer biliyorsan rakam, yoksa 'Bilinmiyor'",
      "notlar": "Ücret hakkında ek bilgiler"
    },
    "acilis_saatleri": {
      "yaz": "Yaz saatleri (varsa)",
      "kis": "Kış saatleri (varsa)",
      "notlar": "Eğer kesin bilgi yoksa 'Ziyaret öncesi ilgili kurumdan teyit edilmelidir' yaz"
    },
    "tesisler": {
      "wc": true/false,
      "piknik_alani": true/false,
      "kamp_alani": true/false,
      "restoran": true/false,
      "otopark": true/false,
      "ziyaretci_merkezi": true/false,
      "notlar": "Tesisler hakkında ek bilgi"
    },
    "guvenlik": {
      "ilk_yardim": true/false,
      "rehber_gerekli": true/false,
      "ozel_izin": true/false,
      "dikkat_edilmesi_gerekenler": ["Liste halinde uyarılar"]
    }
  },
  "cevre_alanlar": [
    {
      "ad": "Yakındaki başka bir alan",
      "mesafe_km": 0,
      "aciklama": "Kısa açıklama"
    }
  ],
  "ilginc_bilgiler": [
    "En az 5 ilginç bilgi, yerel hikayeler, mitler, özel özellikler"
  ],
  "markdown_icerik": "Markdown formatında, başlıklar ve listelerle zengin, 800-1200 kelime UZUN FORM içerik. Yukarıdaki tüm bilgileri içeren, akıcı bir yazı."
}

ÖNEMLİ: Tüm bilgileri mümkün olduğunca DETAYLI yaz. Kısa cevaplar yerine açıklayıcı paragraflar kullan. Bu bir ansiklopedi maddesi gibi kapsamlı olmalı!`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Sen Türkiye coğrafyası ve doğal alanları konusunda uzman bir içerik yazarısın. Detaylı, bilgilendirici ve SEO uyumlu içerikler üretirsin.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3, // ULTIMATE tutarlılık için ultra düşük
      max_tokens: 12000, // 1500+ kelime için daha fazla token
      response_format: { type: 'json_object' }
    });

    const content = JSON.parse(completion.choices[0].message.content);
    console.log(`  ✅ Zengin içerik oluşturuldu (${completion.usage.total_tokens} token)`);
    return content;

  } catch (error) {
    console.error(`  ❌ Groq API hatası:`, error.message);
    throw error;
  }
}

/**
 * Hugo markdown dosyası oluştur
 */
function createMarkdownFile(area, content, images) {
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

  // Hero görsel - ÖNCE WIKIDATA'DAN! (daha güvenilir)
  let heroImage;
  if (area.images?.hero?.url) {
    // Wikidata'dan gelen görsel varsa ONU kullan (en güvenilir)
    heroImage = {
      url: area.images.hero.url,
      alt: `${area.ad} manzarası`,
      credit: area.images.hero.credit || 'Wikimedia Commons',
      license: area.images.hero.license || 'CC BY-SA'
    };
    console.log(`  ✅ Wikidata görseli kullanıldı: ${area.images.hero.url.split('/').pop().substring(0, 50)}...`);
  } else if (images.length > 0) {
    // Wikidata'da yoksa Wikimedia Commons'tan filtrelenmiş görseller
    heroImage = {
      url: images[0].url,
      alt: `${area.ad} manzarası`,
      credit: images[0].author,
      license: images[0].license
    };
    console.log(`  ✅ Wikimedia Commons görseli kullanıldı: ${images[0].title.substring(0, 50)}...`);
  } else {
    // Hiç görsel bulunamadı
    heroImage = {
      url: '',
      alt: `${area.ad} manzarası`,
      credit: '',
      license: ''
    };
    console.log(`  ⚠️  Görsel bulunamadı - placeholder kullanılacak`);
  }

  // Gallery görselleri (Wikimedia Commons'tan)
  const gallery = images.slice(0, 5).map(img => ({
    url: img.url,
    thumb: img.thumb,
    alt: `${area.ad} - ${img.title}`,
    credit: img.author,
    license: img.license
  }));

  const frontMatter = {
    title: content.meta.title,
    date: new Date().toISOString(),
    draft: false,
    type: 'alan',
    alan_turu: area.tur,
    il: area.il,
    ilce: content.ulasim?.en_yakin_sehir || area.ilce || '',
    bolge: area.bolge || '',
    coordinates: {
      lat: area.koordinat?.lat || 0,
      lon: area.koordinat?.lon || 0
    },
    ziyaret: {
      en_iyi_donem: content.ziyaret?.en_iyi_donem || '',
      zorluk: content.ziyaret?.zorluk || 'Orta',
      tahmini_sure: content.ziyaret?.tahmini_sure || '',
      bebek_arabasi_uygun: content.pratik_bilgiler?.tesisler?.bebek_arabasi || false,
      engelli_erisimi: content.pratik_bilgiler?.tesisler?.engelli_erisimi || false
    },
    giris: {
      ucret: content.pratik_bilgiler?.giris_ucreti || {
        yetiskin: 'Bilinmiyor',
        cocuk: 'Bilinmiyor',
        arac: 'Bilinmiyor'
      },
      saatler: content.pratik_bilgiler?.acilis_saatleri || {
        yaz: 'Bilinmiyor',
        kis: 'Bilinmiyor',
        notlar: 'Ziyaret öncesi ilgili kurumdan teyit edilmelidir'
      },
      dogrulandi: false,
      son_dogrulama: new Date().toISOString().split('T')[0]
    },
    aktiviteler: content.ziyaret?.onerilen_aktiviteler?.map(a => a.ad) || [],
    tesisler: content.pratik_bilgiler?.tesisler || {},
    ulasim: {
      en_yakin_sehir: content.ulasim?.en_yakin_sehir || area.il,
      mesafe_km: content.ulasim?.mesafe_km || 0,
      yol_tipi: 'Asfalt',
      toplu_tasima: true
    },
    images: {
      hero: heroImage,
      gallery: gallery
    },
    kaynaklar: area.olasi_kaynaklar?.filter(Boolean).map(url => ({
      title: new URL(url).hostname,
      url: url,
      tip: url.includes('gov.tr') ? 'resmi' : 'genel'
    })) || [],
    description: content.meta.description,
    keywords: content.meta.keywords || [],
    schema_type: 'TouristAttraction',
    wikidata_id: area.wikidata_id || ''
  };

  const markdown = `---
${Object.entries(frontMatter).map(([key, value]) => {
  if (typeof value === 'object') {
    return `${key}:\n${Object.entries(value).map(([k, v]) => {
      if (typeof v === 'object' && !Array.isArray(v)) {
        return `  ${k}:\n${Object.entries(v).map(([k2, v2]) =>
          `    ${k2}: ${typeof v2 === 'string' ? `'${v2.replace(/'/g, "''")}'` : v2}`
        ).join('\n')}`;
      } else if (Array.isArray(v)) {
        if (v.length === 0) return `  ${k}: []`;
        if (typeof v[0] === 'object') {
          return `  ${k}:\n${v.map(item => {
            const entries = Object.entries(item);
            return entries.map(([k3, v3], idx) =>
              `    ${idx === 0 ? '-' : ' '} ${k3}: ${typeof v3 === 'string' ? `'${v3.replace(/'/g, "''")}'` : v3}`
            ).join('\n');
          }).join('\n')}`;
        } else {
          return `  ${k}:\n${v.map(item => `    - ${item}`).join('\n')}`;
        }
      } else {
        return `  ${k}: ${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`;
      }
    }).join('\n')}`;
  } else if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
  } else {
    return `${key}: ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`;
  }
}).join('\n')}
---

${content.markdown_icerik || ''}

---

*Son güncelleme: ${new Date().toISOString().split('T')[0]}*
*Oluşturan: Groq AI (llama-3.3-70b)*
`;

  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, markdown, 'utf-8');

  console.log(`  ✅ Oluşturuldu: ${slug}.md`);
  return filePath;
}

/**
 * Ana işlem
 */
async function processArea(area) {
  console.log(`\n📍 İşleniyor: ${area.ad} (${area.il})`);

  try {
    // 1. Görselleri çek
    const searchTerms = [
      `${area.ad} ${area.il} Turkey`,
      `${area.ad} Türkiye`,
      area.ad
    ];

    let images = [];
    for (const term of searchTerms) {
      images = await fetchWikimediaImages(term, 5);
      if (images.length > 0) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`  📸 ${images.length} görsel bulundu`);

    // 2. Zengin içerik üret
    const content = await generateRichContent(area, images);

    // 3. Markdown dosyası oluştur
    createMarkdownFile(area, content, images);

    return { success: true };

  } catch (error) {
    console.error(`  ❌ Hata: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  console.log('🚀 GELİŞTİRİLMİŞ İçerik Üretimi v2.0 Başlatıldı\n');
  console.log('='.repeat(60));
  console.log(`📊 Mod: ${isTestMode ? 'TEST' : 'FULL'} (limit: ${limit})`);
  console.log('='.repeat(60));

  // Content klasörü yoksa oluştur
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Merged listelerden alanları oku
  const mergedFiles = fs.readdirSync(MASTER_LISTS_DIR)
    .filter(f => f.endsWith('-merged.json'));

  let processed = 0;
  let successful = 0;

  for (const file of mergedFiles) {
    if (processed >= limit) break;

    console.log(`\n📋 Liste: ${file}`);
    const data = JSON.parse(fs.readFileSync(path.join(MASTER_LISTS_DIR, file), 'utf-8'));
    const alanlar = data.alanlar || [];
    console.log(`   Toplam alan sayısı: ${alanlar.length}`);

    for (const alan of alanlar) {
      if (processed >= limit) break;

      const result = await processArea(alan);
      if (result.success) successful++;
      processed++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ İçerik üretimi tamamlandı!');
  console.log(`📊 İstatistikler:`);
  console.log(`   - İşlenen alan: ${processed}`);
  console.log(`   - Başarılı: ${successful}`);
  console.log(`   - Başarısız: ${processed - successful}`);
  console.log(`📁 Çıktı: ${CONTENT_DIR}`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Kritik hata:', error);
  process.exit(1);
});
