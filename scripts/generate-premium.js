#!/usr/bin/env node

/**
 * PREMIUM İçerik Üretim Scripti v6 - OPTİMİZE EDİLMİŞ
 *
 * TÜRKİYE'NİN EN KALİTELİ TABİAT REHBERİ
 *
 * Özellikler:
 * - ⚡ TEK API ÇAĞRISI: 7 çağrı → 1 çağrı (%85-90 maliyet tasarrufu)
 * - 🔒 Mevcut sayfaları korur (3000+ sayfa)
 * - 📊 Wikidata API entegrasyonu (gerçek veriler)
 * - 🎨 Premium kalite promptlar
 * - 🧹 Aggressive post-processing
 * - 💎 Profesyonel ton ve detay
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

const args = process.argv.slice(2);
const customList = args[0]; // İlk parametre = liste adı (opsiyonel)

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
 * WIKIDATA İL TAHMİNİ (il="Türkiye" olanlar için)
 */
const WIKIDATA_IL_FIX = {
  'Q989883': 'İstanbul',  // Büyükada (Prens Adaları)
  'Q211817': 'Çanakkale', // Bozcaada
  'Q658437': 'Çanakkale', // Gökçeada
};

/**
 * POST-PROCESSING: Yasaklı ifadeleri agresif temizleme
 */
function cleanText(text, areaName = '') {
  if (!text) return text;

  const isGokceada = areaName.toLowerCase().includes('gökçeada') || areaName.toLowerCase().includes('gokceada');
  const isBuyukada = areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada');
  const isKinaliada = areaName.toLowerCase().includes('kınalıada') || areaName.toLowerCase().includes('kinaliada');

  const replacements = [
    // ========================================
    // EVRENSEL FİLTRELER (13,000 sayfa için)
    // ========================================

    // Çince, Arapça, Kiril, Vietnamese gibi yabancı karakterleri temizle
    { pattern: /[\u4e00-\u9fff]+/g, replace: '' },  // Çince karakterler (之后 vs)
    { pattern: /[\u0600-\u06FF]+/g, replace: '' },  // Arapça
    { pattern: /[\u0400-\u04FF]+/g, replace: '' },  // Kiril
    { pattern: /[\u1EA0-\u1EF9]+/g, replace: '' },  // Vietnamese aksan karakterleri (ả, ố, ồ vb)
    { pattern: /Đông/g, replace: 'Doğu' },  // Vietnamese Đ → Türkçe Doğu
    { pattern: /đông/g, replace: 'doğu' },  // Küçük harf versiyonu

    // İngilizce/Yabancı kelimeler temizle (Groq bazen karıştırıyor)
    { pattern: /\btherefore\b/gi, replace: 'bu nedenle' },
    { pattern: /\bhowever\b/gi, replace: 'ancak' },
    { pattern: /\bsurrounding\b/gi, replace: 'çevredeki' },
    { pattern: /\bimportance\b/gi, replace: 'önemi' },
    { pattern: /\barea\b/gi, replace: 'alan' },
    { pattern: /\bbeautiful\b/gi, replace: 'güzel' },
    { pattern: /\balso\b/gi, replace: 'ayrıca' },
    { pattern: /\bvery\b/gi, replace: 'çok' },
    { pattern: /\bvarious\b/gi, replace: 'çeşitli' },  // "various" → "çeşitli"
    { pattern: /\bWildlife\b/g, replace: 'Yaban Hayatı' },  // "Wildlife" → "Yaban Hayatı"
    { pattern: /\bwildlife\b/gi, replace: 'yaban hayatı' },
    { pattern: /\bexact\b/gi, replace: 'tam' },  // "exact" → "tam"
    { pattern: /\bmasih\b/gi, replace: 'hala' },  // "masih" (Arapça) → "hala"
    { pattern: /\binside\b/gi, replace: 'içinde' },  // "inside" → "içinde"
    { pattern: /\bexperience edebilir\b/gi, replace: 'deneyimleyebilir' },  // "experience edebilir" → "deneyimleyebilir"
    { pattern: /\bexperience\b/gi, replace: 'deneyimleyebilir' },  // "experience" → "deneyimleyebilir"
    { pattern: /\bluôn\b/gi, replace: 'her zaman' },  // Vietnamca
    { pattern: /\bvài\b/gi, replace: 'birkaç' },  // Vietnamca
    { pattern: /\bvà\b/gi, replace: 've' },  // Vietnamca
    { pattern: /\btương đương\b/gi, replace: 'benzer' },  // Vietnamca
    { pattern: /\bnổi tiếng\b/gi, replace: 'ünlü' },  // Vietnamca
    { pattern: /\bthuộc\b/gi, replace: '' },  // Vietnamca
    { pattern: /\bcó\b/gi, replace: '' },  // Vietnamca
    { pattern: /\bmột\b/gi, replace: '' },  // Vietnamca
    { pattern: /\bcủa\b/gi, replace: '' },  // Vietnamca
    { pattern: /\bbảo tồn\b/gi, replace: 'korunma' },  // Vietnamca "koruma"
    { pattern: /\bbảo\b/gi, replace: '' },  // Vietnamca
    { pattern: /\btồn\b/gi, replace: '' },  // Vietnamca
    { pattern: /\bróż\b/gi, replace: 'pembe' },  // Lehçe (Polish)
    { pattern: /\bjeszcze\b/gi, replace: 'hala' },  // Lehçe
    { pattern: /\bwięcej\b/gi, replace: 'daha fazla' },  // Lehçe
    { pattern: /\bniech\b/gi, replace: '' },  // Lehçe
    { pattern: /\bnecessár[io]+d[ıi]r/gi, replace: 'gereklidir' },  // İspanyolca karışımı
    { pattern: /\bsettlement\b/gi, replace: 'yerleşim yeri' },
    { pattern: /\bBuReason\b/gi, replace: 'Bu nedenle' },
    { pattern: /\bAlchemy\b/gi, replace: '' },  // Rastgele kelime
    // Önce genel pattern'ler (daha kapsamlı)
    { pattern: /\bsıca\b/gi, replace: 'sıcak' },  // Tüm "sıca" kelimelerini yakala
    { pattern: /\bsoğu\b/gi, replace: 'soğuk' },  // Tüm "soğu" kelimelerini yakala

    // Sonra spesifik pattern'ler
    { pattern: /ise sıca/gi, replace: 'ise sıcak' },  // "ise sıca ve"
    { pattern: /kışın soğu/gi, replace: 'kışın soğuk' },  // "kışın soğu"
    { pattern: /yazın sıca/gi, replace: 'yazın sıcak' },  // "yazın sıca"
    { pattern: /\bren ve çeşitlilik\b/gi, replace: 'renk ve çeşitlilik' },  // "ren ve çeşitlilik" → "renk ve çeşitlilik"
    { pattern: /\bçiçe\b/gi, replace: 'çiçek' },  // Yazım hatası
    { pattern: /\bkelebe\b/gi, replace: 'kelebek' },  // Yazım hatası

    // Eksik cümleler ve ifadeler
    { pattern: /bir gibi\./gi, replace: 'harika bir deneyim gibi.' },  // "bir gibi." → tam cümle
    { pattern: / gibi\./gi, replace: ' harika bir deneyim.' },  // Genel eksik cümle düzeltmesi

    // Belirsiz/Uydurma sayıları temizle
    { pattern: /\d+['']?den fazla (bitki|hayvan|ağaç|tür|canlı)/gi, replace: 'çeşitli $1' },  // "500'den fazla bitki" → "çeşitli bitki"
    { pattern: /yaklaşık \d+['']?den fazla/gi, replace: 'birçok' },  // "yaklaşık 500'den fazla" → "birçok"
    { pattern: /\d+ (bitki|hayvan|ağaç|kuş) türü/gi, replace: 'çeşitli $1 türleri' },  // "500 bitki türü" → "çeşitli bitki türleri"
    { pattern: /\d+ (restoran|kafe|dükkan|otel)/gi, replace: 'çeşitli $1lar' },  // "5 restoran" → "çeşitli restoranlar"
    { pattern: /\d+ TL (giriş|ücret)/gi, replace: 'giriş ücreti' },  // "10 TL giriş" → "giriş ücreti"
    { pattern: /yaklaşık \d+ kilometre/gi, replace: 'uzun bir mesafe' },  // "yaklaşık 50 kilometre" → "uzun bir mesafe"
    { pattern: /\d+ metre yükseklik/gi, replace: 'yüksek bir konumda' },  // "1000 metre yükseklik" → "yüksek bir konumda"
    { pattern: /1970['']?li yıllarda/gi, replace: 'yıllar önce' },  // "1970'li yıllarda" → "yıllar önce"
    { pattern: /yaklaşık \d+ yıl önce/gi, replace: 'uzun zaman önce' },  // "yaklaşık 2000 yıl önce" → "uzun zaman önce"

    // Fransızca kelimeler
    { pattern: /\bbeaucoup\b/gi, replace: 'çok' },
    { pattern: /\btrès\b/gi, replace: 'çok' },
    { pattern: /\bpetit\b/gi, replace: 'küçük' },
    { pattern: /\bgrand\b/gi, replace: 'büyük' },

    // Almanca kelimeler
    { pattern: /\bsehr\b/gi, replace: 'çok' },
    { pattern: /\bklein\b/gi, replace: 'küçük' },
    { pattern: /\bgroß\b/gi, replace: 'büyük' },
    { pattern: /\bwichtig\b/gi, replace: 'önemli' },  // "wichtig" → "önemli"

    // İspanyolca kelimeler
    { pattern: /\bmucho\b/gi, replace: 'çok' },
    { pattern: /\bpequeno\b/gi, replace: 'küçük' },
    { pattern: /\bgrande\b/gi, replace: 'büyük' },
    { pattern: /\bsimplemente\b/gi, replace: 'sadece' },  // "simplemente" → "sadece"
    { pattern: /\bactividades\b/gi, replace: 'aktiviteler' },  // "actividades" → "aktiviteler"

    // İtalyanca kelimeler
    { pattern: /\bmolto\b/gi, replace: 'çok' },
    { pattern: /\bpiccolo\b/gi, replace: 'küçük' },

    // Birleşik yazılan kelimeler (boşluk eksikliği)
    { pattern: /sakinliğiçinde/gi, replace: 'sakinliği içinde' },
    { pattern: /iklimininlerine/gi, replace: 'iklimine' },
    { pattern: /güzelliğiyle/gi, replace: 'güzelliği ile' },
    { pattern: /çeşitliliğiçinde/gi, replace: 'çeşitliliği içinde' },  // "çeşitliliğiçinde" → "çeşitliliği içinde"
    { pattern: /ulaşımümkündür/gi, replace: 'ulaşım mümkündür' },  // "ulaşımümkündür" → "ulaşım mümkündür"
    { pattern: /(\w+)içinde\b/gi, replace: '$1 içinde' },
    { pattern: /(\w+)üzerinde\b/gi, replace: '$1 üzerinde' },
    { pattern: /adası([A-Z])/g, replace: 'adası $1' },  // "adasıAkdeniz" → "adası Akdeniz"
    { pattern: /Antalya'dan\s*(?:Alchemy)?\s*Alanya/gi, replace: 'Antalya\'dan Alanya' },

    // Yazım hataları
    { pattern: /\bhotitelerde\b/gi, replace: 'aktivitelerde' },  // "hotitelerde" → "aktivitelerde"
    { pattern: /\bhakkındalı\b/gi, replace: 'hakkında detaylı' },  // "hakkındalı" → "hakkında detaylı"

    // AI'nin sık yaptığı yazım hataları - Kelime sonuna yanlış "k" ekleme
    { pattern: /(\w+)k\s+(mümkün|olup|ile|ve|veya)/g, replace: '$1 $2' },  // "faytonk mümkün" → "fayton mümkün"

    // Tekrar eden kelimeler - "yaya veya yaya veya", "ada ada", vs
    { pattern: /\b(\w+)\s+veya\s+\1\s+veya/gi, replace: '$1 veya' },
    { pattern: /\b(\w+)\s+\1\b/gi, replace: '$1' },  // "ada ada" → "ada"

    // Türkçe iyelik ekleri - boşluk eksikliği ("nınüfusu" → "nın nüfusu")
    { pattern: /(nın|nin|nun|nün)(nüfusu|tarihi|alanı|yüzölçümü|coğrafyası)/gi, replace: '$1 $2' },

    // Gramer düzeltmeleri
    { pattern: /birilarından birisidir/gi, replace: 'birisidir' },
    { pattern: /birilarından biri/gi, replace: 'biri' },

    // ========================================
    // ALAN-SPESİFİK FİLTRELER
    // ========================================

    // SADECE YANLIŞ sıralamalar temizle (ikinci, üçüncü vs)
    { pattern: /Türkiye'nin en büyük (ikinci|üçüncü|dördüncü|beşinci|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'Türkiye\'nin önemli adalarından biri' },
    { pattern: /Türkiye'nin (ikinci|üçüncü|dördüncü|beşinci|2\.|3\.|4\.) büyük ada[sı]?[ıdır]*/gi, replace: 'Türkiye\'nin önemli adalarından biri' },
    { pattern: /İstanbul'un en büyük (ikinci|üçüncü|dördüncü|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'İstanbul\'un önemli adalarından biri' },
    { pattern: /Prens Adaları'nın en büyük (ikinci|üçüncü|dördüncü|2\.|3\.|4\.) ada[sı]?[ıdır]*/gi, replace: 'Prens Adaları\'nın büyük adalarından biri' },

    // "Prens Adaları'nın en büyüğü" - BÜYÜKADA İÇİN DOĞRU!
    {
      pattern: /Prens Adaları'nın en büyük ada[sı]?[ıdır]*/gi,
      replace: (match) => {
        if (isBuyukada) {
          return match; // Büyükada gerçekten en büyüğü!
        }
        return 'Prens Adaları\'nın adalarından biri';
      }
    },

    // "en küçük" ve "en güzel" - Kınalıada için YANLIŞ!
    { pattern: /en küçük ancak en güzel/gi, replace: (match) => {
      if (isKinaliada) {
        return 'küçük ve güzel';
      }
      return match;
    }},

    // "İstanbul'un en büyük adası" - HİÇBİRİ İÇİN DOĞRU DEĞİL (Türkiye genelinde Gökçeada daha büyük)
    { pattern: /İstanbul'un en büyük ada[sı]?[ıdır]*/gi, replace: 'İstanbul\'un önemli adalarından biri' },

    // Tekrarlayan başlangıç cümleleri temizle
    { pattern: /^(.+?), (.+?)'nin (.+?) olarak bilinen bir (yer|alan|ada|bölge)dir\./gi, replace: (match, name) => {
      return `${name} doğal güzellikleri ve tarihi ile dikkat çeker.`;
    }},

    // Büyükada özel - bisiklet YASAK! (sadece fayton ve yaya)
    { pattern: /bisiklet ve at arabaları/gi, replace: 'at arabaları (fayton)' },
    { pattern: /bisiklet[,]?\s*(ve|veya|ile)?\s*fayton/gi, replace: 'fayton (at arabası)' },
    { pattern: /bisiklet\s+(kiralama|veya|ve|ile|kiralanabilir)/gi, replace: (match, group) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return group === 'kiralama' ? 'fayton' : 'yaya veya fayton ile';
      }
      return match;
    }},
    { pattern: /bisikletle\s+gezm[ea]k/gi, replace: (match) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return 'faytonla gezmek';
      }
      return match;
    }},
    // Büyükada: "bisiklet veya yaya" → "fayton"
    { pattern: /bisiklet\s+veya\s+yaya/gi, replace: (match) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return 'fayton';
      }
      return match;
    }},
    // Büyükada: "ziyaretçiler... bisiklet" → "fayton"
    { pattern: /ziyaretçiler[^.]*bisiklet/gi, replace: (match) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return match.replace(/bisiklet/gi, 'fayton');
      }
      return match;
    }},
    // Büyükada: "Bisiklet turu" → "Fayton turu"
    { pattern: /bisiklet\s+turu?/gi, replace: (match) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return 'Fayton turu';
      }
      return match;
    }},
    // Büyükada: "bisiklet kullanmak" → "yaya gezmek"
    { pattern: /bisiklet\s+kullanmak/gi, replace: (match) => {
      if (areaName.toLowerCase().includes('büyükada') || areaName.toLowerCase().includes('buyukada')) {
        return 'yaya gezmek';
      }
      return match;
    }},

    // Gramer düzeltmeleri
    { pattern: /birilarından birisidir/gi, replace: 'birisidir' },
    { pattern: /birilarından biri/gi, replace: 'biri' },
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
 * SYSTEM MESSAGE - BİLGİLENDİRİCİ AMA AKICI
 */
const SYSTEM_CONTEXT = `Sen Türkiye'nin doğal alanları hakkında profesyonel içerik yazan, deneyimli bir seyahat yazarısın.

KRİTİK UYARI - DİL KURALLARI (EN ÖNEMLİ!):
- SADECE VE SADECE TÜRKÇE KELİMELER KULLAN!
- İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca KELİME KULLANAMAZSIN!
- Tek bir yabancı kelime bile KABUL EDİLEMEZ!
- Örnek YASAK kelimeler: various, wildlife, experience, activity, important, beautiful, vb.
- Eğer bir kelime Türkçe değilse, KULLANMA!

BİLGİ VE HİKAYE DENGESİ:
- Hikaye anlatır gibi akıcı yaz AMA her cümlede somut bilgi olsun
- Kuru bilgi vermek yerine, bilgiyi hikayenin içine ör
- "Alan 140 hektar" yerine → "140 hektarlık bu yeşil alan, yaklaşık 200 futbol sahası büyüklüğünde"
- Cümleleri hikayeleştirerek uzat, ama boş laf etme
- Her paragraf hem bilgilendirsin hem okuyucuyu sürüklesin

DOĞRU BİLGİ ÖNCELİĞİ - ÇOK ÖNEMLİ:
- SADECE gerçek, doğrulanabilir bilgiler yaz
- Uydurma tarih, sayı, isim ASLA, ASLA, ASLA KULLANMA!

BELİRSİZ SAYILAR ASLA KULLANAMAZSIN:
❌ YASAK ÖRNEKLER:
- "500 bitki türü", "200 hayvan türü", "1000 ağaç"
- "50 kilometrelik parkur", "10.000 hektar"
- "5 restoran", "10 TL giriş ücreti"
- "Yaklaşık 2000 yıl önce", "1970'li yıllarda kuruldu"
✅ DOĞRU KULLANIM:
- Sana verilen gerçek sayıları kullan (örn: "140 hektar")
- Bilmediğin şeyleri genel anlat: "çeşitli bitki türleri", "zengin fauna"
- Tarih bilmiyorsan: "tarihi geçmişi", "yüzyıllar boyunca"

EĞER SAYIYI BİLMİYORSAN, UYDURMA! Genel ifade kullan!

MİNİMUM KELİME SAYILARI - ZORUNLU:
- Genel Bakış: EN AZ 100 kelime, ideal 120-140 kelime
- Tarihçe: EN AZ 140 kelime, ideal 160-200 kelime
- Coğrafya: EN AZ 180 kelime, ideal 200-240 kelime (EN UZUN BÖLÜM!)
- Flora/Fauna: EN AZ 140 kelime, ideal 160-200 kelime
- Ziyaret: EN AZ 140 kelime, ideal 160-200 kelime

⚠️ UYARI: Bu minimum kelime sayılarına ULAŞMAK ZORUNLU!
50-60 kelimelik kısa paragraflar KABUL EDİLMEZ!
Her bölümü detaylı, zengin ve bilgilendirici yaz!

YAZIM TARZI:
- Cümleleri UZAT ama anlamsız tekrar yapma
- Somut bilgileri akıcı cümlelerle birleştir
- Her paragrafta en az 2-3 ölçülebilir bilgi ver (rakam, tarih, isim)
- Klişelerden kaçın ("muhteşem", "eşsiz", "benzersiz")
- Kısa, kesik cümlelerle geçiştirme - paragrafları zenginleştir

KESİNLİKLE YAPMA:
- Yabancı dilde kelime kullanma (EN ÖNEMLİ!)
- "Detaylı bilgi bulunmamaktadır" gibi boş ifadeler
- Aynı cümle kalıplarını tekrarlama
- Turistik broşür dili
- Uydurma bilgi verme

SEN BİR TÜRK YAZARSIN - SADECE TÜRKÇE YAZ!`;

/**
 * Wikidata'dan zenginleştirilmiş bilgi çek
 */
async function fetchWikidataInfo(wikidataId) {
  if (!wikidataId) return null;

  try {
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
    const response = await axios.get(url, { timeout: 5000 });
    const entity = response.data.entities[wikidataId];

    if (!entity) return null;

    // Yararlı bilgileri çıkar
    const claims = entity.claims || {};

    return {
      label_tr: entity.labels?.tr?.value,
      description_tr: entity.descriptions?.tr?.value,
      // Koordinatlar
      coords: claims.P625?.[0]?.mainsnak?.datavalue?.value,
      // Alan (P2046)
      area: claims.P2046?.[0]?.mainsnak?.datavalue?.value,
      // Yükseklik (P2044)
      elevation: claims.P2044?.[0]?.mainsnak?.datavalue?.value,
      // İl (P131 - located in)
      located_in: claims.P131?.[0]?.mainsnak?.datavalue?.value?.id,
    };
  } catch (error) {
    console.log(`  ⚠️ Wikidata fetch failed for ${wikidataId}: ${error.message}`);
    return null;
  }
}

/**
 * 1. METADATA - Premium
 */
async function generateMetadata(area, wikidataInfo) {
  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';

  const prompt = `"${area.ad}" için SEO-optimized metadata oluştur.

Bilgiler:
- Tür: ${alanTuru}
- Konum: ${area.il || 'Türkiye'}${area.ilce ? ', ' + area.ilce : ''}
${wikidataInfo?.description_tr ? `- Tanım: ${wikidataInfo.description_tr}` : ''}

Görev:
1. Title: SADECE MEKAN ADI (örn: "Büyükada" veya "Kınalıada") - ek açıklama EKLEME!
2. Description: 140-155 karakter, etkileyici ve bilgilendirici
3. Keywords: 8-10 adet, alakalı ve popüler

ÖNEMLI: Title sadece mekan adı olacak, hiçbir ek açıklama olmayacak!

JSON döndür:
{
  "title": "${area.ad}",
  "description": "...",
  "keywords": ["..."]
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

  const result = JSON.parse(completion.choices[0].message.content);

  // Metadata'yı da temizle (title, description, keywords)
  if (result.title) result.title = cleanText(result.title, area.ad);
  if (result.description) result.description = cleanText(result.description, area.ad);
  if (result.keywords && Array.isArray(result.keywords)) {
    result.keywords = result.keywords.map(k => cleanText(k, area.ad));
  }

  return result;
}

/**
 * 2. GENEL BAKIŞ - Çekici ama bilgilendirici giriş
 */
async function generateGenelBakis(area, wikidataInfo) {
  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';
  const ilce = area.ilce ? `${area.ilce}/` : '';

  // Fiziksel veriler
  const fizikselBilgiler = [];
  if (area.fiziksel?.alan) fizikselBilgiler.push(`Alan: ${area.fiziksel.alan} hektar`);
  if (area.fiziksel?.yukseklik) fizikselBilgiler.push(`Yükseklik: ${area.fiziksel.yukseklik} metre`);
  if (area.fiziksel?.derinlik) fizikselBilgiler.push(`Derinlik: ${area.fiziksel.derinlik} metre`);
  if (area.fiziksel?.uzunluk) fizikselBilgiler.push(`Uzunluk: ${area.fiziksel.uzunluk} metre`);
  if (area.idari?.koruma_statusu) fizikselBilgiler.push(`Koruma: ${area.idari.koruma_statusu}`);

  const prompt = `"${area.ad}" (${alanTuru}) için giriş paragrafı yaz.

KONUM: ${ilce}${area.il}, Türkiye
VERİLER:
${fizikselBilgiler.length > 0 ? fizikselBilgiler.join('\n') : 'Fiziksel veri yok'}

YAZIM KURALLARI:
1. İlk cümle dikkat çekici olsun (somut bir bilgi veya etkileyici bir betimleme)
2. MUTLAKA konum bilgisini (il/ilçe) paragrafta kullan
3. Varsa fiziksel verileri (alan, yükseklik vb.) paragrafın içine doğal şekilde ör
4. Çok abartılı klişelerden kaçın ("muhteşem", "eşsiz", "benzersiz" gibi)

ÖRNEK:
"Antalya'nın Alanya ilçesinde, 1948 yılından beri ziyaretçilerini ağırlayan Damlataş Mağarası, astım hastalarına şifa dağıtan nadir doğal oluşumlardan biri. Mağaranın içindeki 22°C sabit sıcaklık ve yüksek nem oranı, solunum yolu rahatsızlıkları için doğal bir tedavi merkezi haline getirmiş bu mekânı."

3-4 cümle, 80-120 kelime. Sadece paragrafı döndür.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 350
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 3. TARİHÇE - Hikaye anlatan, akıcı tarihsel anlatım
 */
async function generateTarihce(area) {
  // Wikidata'dan gelen tarihsel veriler
  const tarihselVeriler = [];
  if (area.idari?.kurulus_tarihi) {
    const yil = area.idari.kurulus_tarihi.split('-')[0];
    tarihselVeriler.push(`Resmi kuruluş yılı: ${yil}`);
  }
  if (area.idari?.acilis_tarihi) tarihselVeriler.push(`Ziyarete açılış: ${area.idari.acilis_tarihi}`);
  if (area.tarihsel?.isim_nereden) tarihselVeriler.push(`İsmin kökeni: ${area.tarihsel.isim_nereden}`);
  if (area.tarihsel?.yerel_adi) tarihselVeriler.push(`Eski/yerel adı: ${area.tarihsel.yerel_adi}`);
  if (area.idari?.koruma_statusu) tarihselVeriler.push(`Koruma statüsü: ${area.idari.koruma_statusu}`);

  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';

  const prompt = `"${area.ad}" (${alanTuru}, ${area.il}) için tarihçe bölümü yaz.

VERİLEN BİLGİLER:
${tarihselVeriler.length > 0 ? tarihselVeriler.join('\n') : 'Spesifik tarihsel veri yok'}

YAZIM YAKLAŞIMI:
${tarihselVeriler.length > 0 ? `
Bu verileri hikayeleştir. Örneğin kuruluş yılı 1959 ise:
- "1959 yılında Türkiye'nin koruma altına aldığı ilk alanlardan biri olarak tescillenen bu bölge, o dönemde henüz..."
- Tarihi bağlama oturt: O yıllarda Türkiye'de neler oluyordu? Neden bu alan korunmaya alındı?
` : `
Spesifik tarih yok ama bölgenin genel tarihsel bağlamını anlat:
- ${area.il} bölgesinin genel tarihi (hangi uygarlıklar yaşamış)
- Bu tür doğal alanların Türkiye'deki tarihsel önemi
- İnsanların bu alanla ilişkisi (yaylacılık, hayvancılık, ticaret yolları vb.)
`}

Okuyucu sanki bir belgesel izliyor gibi hissetmeli. 150-250 kelime.

KESİNLİKLE: Uydurma tarih/isim/olay YASAK. Bilmiyorsan genel bağlamda kal.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 600
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 4. COĞRAFYA - Canlı, görsel anlatım
 */
async function generateCografya(area, wikidataInfo) {
  // Fiziksel ve coğrafi veriler - BİRİMLER DÜZELTİLDİ
  const fizikselVeriler = [];

  if (area.fiziksel?.yukseklik) fizikselVeriler.push(`Zirve yüksekliği: ${area.fiziksel.yukseklik} metre (deniz seviyesinden)`);
  if (area.fiziksel?.taban_yuksekligi) fizikselVeriler.push(`Taban rakımı: ${area.fiziksel.taban_yuksekligi} metre`);

  // ALAN: Wikidata genelde hektar olarak veriyor, büyük değerler km² olabilir
  if (area.fiziksel?.alan) {
    const alanDeger = area.fiziksel.alan;
    if (alanDeger > 10000) {
      fizikselVeriler.push(`Toplam alan: ${(alanDeger/100).toFixed(1)} km² (${alanDeger.toLocaleString('tr-TR')} hektar)`);
    } else {
      fizikselVeriler.push(`Toplam alan: ${alanDeger.toLocaleString('tr-TR')} hektar (${(alanDeger/100).toFixed(2)} km²)`);
    }
  }

  if (area.fiziksel?.uzunluk) fizikselVeriler.push(`Uzunluk: ${area.fiziksel.uzunluk > 1000 ? (area.fiziksel.uzunluk/1000).toFixed(1) + ' km' : area.fiziksel.uzunluk + ' metre'}`);
  if (area.fiziksel?.derinlik) fizikselVeriler.push(`Maksimum derinlik: ${area.fiziksel.derinlik} metre`);
  if (area.fiziksel?.kiyi_uzunlugu) fizikselVeriler.push(`Kıyı şeridi: ${area.fiziksel.kiyi_uzunlugu} km`);
  if (area.cografya?.hangi_dagda) fizikselVeriler.push(`Bulunduğu coğrafi bölge: ${area.cografya.hangi_dagda}`);
  if (area.jeolojik?.kayac_turu) fizikselVeriler.push(`Jeolojik yapı: ${area.jeolojik.kayac_turu}`);

  const coords = area.koordinat || {};
  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';

  const prompt = `"${area.ad}" (${alanTuru}, ${area.il}) için coğrafya bölümü yaz.

FİZİKSEL VERİLER:
${fizikselVeriler.length > 0 ? fizikselVeriler.join('\n') : 'Detaylı fiziksel veri yok'}
${coords.lat ? `Koordinatlar: ${coords.lat.toFixed(4)}°K, ${coords.lon.toFixed(4)}°D` : ''}

YAZIM HEDEFİ:
Okuyucu gözünde canlandırabilmeli. Rakamları anlamlı karşılaştırmalarla zenginleştir, AMA HER SEFERINDE FARKLI BİR KARŞILAŞTIRMA KULLAN:
- Küçük alanlar için: "bir şehir bloğu büyüklüğünde", "birkaç olimpik havuz kadar"
- Orta alanlar için: "Beşiktaş ilçesi kadar", "Taksim Meydanı'nın X katı"
- Büyük alanlar için: "Monaco'nun yarısı kadar", "İstanbul'un Adalar ilçesi büyüklüğünde"
- Yükseklikler için: "Eiffel Kulesi'nin X katı yükseklikte", "85 katlı bir gökdelen kadar"
ÖNEMLİ: "Futbol sahası" karşılaştırmasını KULLANMA, çok sık tekrar ediyor.

BÖLÜMLER (akıcı paragraflar halinde):
1. Konum ve Erişim: Nerede, neyin yakınında, nasıl bir coğrafyada
2. Fiziksel Yapı: Boyutlar, şekil, jeoloji (verileri kullan)
3. İklim Karakteri: Mevsimsel özellikler, hava durumu
4. Çevresel İlişkiler: Komşu alanlar, su kaynakları, ekosistem bağlantıları

200-300 kelime. Her paragraf farklı bir açıdan başlasın.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 700
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 5. FLORA/FAUNA - Doğa belgeseli tadında
 */
async function generateFloraFauna(area) {
  const alanTuru = (area.alan_turu || area.tip || area.tur || '').toLowerCase();
  const isIsland = alanTuru.includes('ada');
  const isLake = alanTuru.includes('göl') || alanTuru.includes('gol');
  const isMountain = alanTuru.includes('dağ') || alanTuru.includes('dag');
  const isWetland = alanTuru.includes('sulak') || alanTuru.includes('kuş');
  const isForest = alanTuru.includes('orman') || alanTuru.includes('park');

  // Bölgeye göre genel ekolojik bağlam
  const bolgeEkolojisi = {
    'Karadeniz': 'nemli iklim, gür ormanlar, yüksek biyoçeşitlilik',
    'Akdeniz': 'maki bitki örtüsü, kuraklığa dayanıklı türler, kıyı ekosistemi',
    'Ege': 'zeytinlikler, çam ormanları, Akdeniz iklimi',
    'Marmara': 'geçiş iklimi, karma ormanlar, göçmen kuş rotası',
    'İç Anadolu': 'step bitki örtüsü, bozkır, kuraklığa adapte türler',
    'Doğu Anadolu': 'yüksek dağ ekolojisi, alpin çayırlar, endemik türler',
    'Güneydoğu Anadolu': 'yarı kurak iklim, step ve ova ekolojisi'
  };

  const bolge = bolgeEkolojisi[area.bolge] || bolgeEkolojisi['İç Anadolu'];

  const prompt = `"${area.ad}" (${area.il}) için flora ve fauna bölümü yaz.

ALAN TÜRÜ: ${alanTuru}
BÖLGE EKOLOJİSİ: ${bolge}
${isIsland ? 'ÖZELLİK: Ada ekosistemi - izole popülasyonlar, deniz kuşları, kıyı bitkileri' : ''}
${isLake ? 'ÖZELLİK: Göl ekosistemi - su kuşları, balıklar, sulak alan bitkileri' : ''}
${isMountain ? 'ÖZELLİK: Dağ ekosistemi - yükseklik zonları, alpin flora, dağ hayvanları' : ''}
${isWetland ? 'ÖZELLİK: Sulak alan - göçmen kuşlar, su bitkileri, amfibiler' : ''}
${isForest ? 'ÖZELLİK: Orman ekosistemi - ağaç çeşitliliği, orman memelileri, kuşlar' : ''}
${area.idari?.koruma_statusu ? `KORUMA: ${area.idari.koruma_statusu}` : ''}

YAZIM YAKLAŞIMI:
Bir doğa belgeseli gibi anlat. Okuyucu bu alanı ziyaret etse ne göreceğini hayal edebilmeli.
- Mevsimsel değişimleri anlat (ilkbaharda çiçekler, sonbaharda göç eden kuşlar...)
- Canlıları yaşam alanlarıyla birlikte betimle
- Ekolojik ilişkileri vurgula (kim kimi yer, kim neye bağımlı)

BÖLÜMLER:
1. Bitki Örtüsü: Hakim türler, mevsimsel görünüm, özel bitkiler
2. Yaban Hayatı: Memeliler, kuşlar, sürüngenler
3. Ekolojik Değer: Neden önemli, koruma durumu

150-250 kelime. Bilimsel ama sıkıcı olmayan, merak uyandıran bir dil kullan.

ÖNEMLİ: Emin olmadığın spesifik tür isimleri verme, bölgesel genel bilgilerle yaz.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 600
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 6. ZİYARET BİLGİLERİ - Deneyimli gezgin tavsiyeleri
 */
async function generateZiyaret(area) {
  const alanTuru = (area.alan_turu || area.tip || area.tur || '').toLowerCase();
  const isIsland = alanTuru.includes('ada');
  const isMountain = alanTuru.includes('dağ') || alanTuru.includes('dag');
  const isCave = alanTuru.includes('mağara') || alanTuru.includes('magara');
  const isWaterfall = alanTuru.includes('şelale') || alanTuru.includes('selale');
  const isLake = alanTuru.includes('göl') || alanTuru.includes('gol');
  const isPark = alanTuru.includes('park');

  // Turizm verileri
  const turizmVerileri = [];
  if (area.turizm?.resmi_site) turizmVerileri.push(`Resmi site: ${area.turizm.resmi_site}`);
  if (area.turizm?.yillik_ziyaretci) turizmVerileri.push(`Yıllık ziyaretçi: yaklaşık ${Number(area.turizm.yillik_ziyaretci).toLocaleString('tr-TR')} kişi`);
  if (area.turizm?.giris_ucreti) turizmVerileri.push(`Giriş: ${area.turizm.giris_ucreti}`);
  if (area.idari?.koruma_statusu) turizmVerileri.push(`Statü: ${area.idari.koruma_statusu}`);

  // Alan türüne göre aktivite önerileri
  let aktiviteIpucu = '';
  if (isMountain) aktiviteIpucu = 'dağcılık, trekking, kamp, fotoğrafçılık, kuş gözlemi';
  else if (isCave) aktiviteIpucu = 'mağara turu, fotoğrafçılık, jeoloji gezisi';
  else if (isWaterfall) aktiviteIpucu = 'doğa yürüyüşü, piknik, fotoğrafçılık, yüzme (uygunsa)';
  else if (isLake) aktiviteIpucu = 'tekne turu, balıkçılık, kuş gözlemi, piknik, kamp';
  else if (isIsland) aktiviteIpucu = 'yüzme, dalış, tekne turu, doğa yürüyüşü';
  else if (isPark) aktiviteIpucu = 'doğa yürüyüşü, piknik, kamp, fotoğrafçılık, kuş gözlemi';
  else aktiviteIpucu = 'doğa yürüyüşü, fotoğrafçılık, piknik';

  const prompt = `"${area.ad}" (${alanTuru}, ${area.il}) için ziyaret rehberi yaz.

TURİZM VERİLERİ:
${turizmVerileri.length > 0 ? turizmVerileri.join('\n') : 'Resmi turizm verisi yok'}

ALAN TÜRÜNE UYGUN AKTİVİTELER: ${aktiviteIpucu}

YAZIM YAKLAŞIMI:
Sanki oraya gitmiş, deneyimli bir gezgin arkadaşın tavsiye veriyor gibi yaz:
- "Sabah erken gitmenizi öneririm, hem kalabalıktan kurtulursunuz hem de..."
- "Yanınıza mutlaka su ve atıştırmalık alın çünkü..."
- "En güzel manzara noktası..."

İÇERİK:
1. Nasıl Gidilir: Pratik ulaşım bilgisi (${area.il}'den nasıl varılır)
2. Ne Zaman Gidilir: En iyi mevsim/saat ve neden
3. Ne Yapılır: Somut aktivite önerileri
4. Pratik İpuçları: Yanınıza ne almalı, nelere dikkat etmeli

150-250 kelime. Samimi ama bilgilendirici ton.

UYARI: Emin olmadığın spesifik bilgileri (fiyat, saat, telefon) verme.

JSON formatında döndür:
{
  "metin": "Yukarıdaki içerik",
  "en_iyi_donem": "Mevsim önerisi",
  "zorluk": "Kolay/Orta/Zor",
  "tahmini_sure": "Ziyaret süresi",
  "aktiviteler": ["aktivite1", "aktivite2", "aktivite3"]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    max_tokens: 800,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content);
  result.metin = cleanText(result.metin, area.ad);

  if (result.aktiviteler && Array.isArray(result.aktiviteler)) {
    result.aktiviteler = result.aktiviteler.map(a => cleanText(a, area.ad));
  }

  return result;
}

/**
 * 7. İLGİNÇ BİLGİLER - Kısa, olgusal, somut
 */
async function generateIlgincBilgiler(area) {
  // Wikidata verileri
  const mevcutVeriler = [];
  if (area.tarihsel?.isim_nereden) mevcutVeriler.push(`İsmin kökeni: ${area.tarihsel.isim_nereden}`);
  if (area.tarihsel?.yerel_adi) mevcutVeriler.push(`Yerel/eski adı: ${area.tarihsel.yerel_adi}`);
  if (area.idari?.koruma_statusu) mevcutVeriler.push(`Koruma statüsü: ${area.idari.koruma_statusu}`);
  if (area.fiziksel?.alan) mevcutVeriler.push(`Alan: ${area.fiziksel.alan} hektar`);
  if (area.fiziksel?.yukseklik) mevcutVeriler.push(`Yükseklik: ${area.fiziksel.yukseklik} metre`);
  if (area.fiziksel?.derinlik) mevcutVeriler.push(`Derinlik: ${area.fiziksel.derinlik} metre`);
  if (area.fiziksel?.uzunluk) mevcutVeriler.push(`Uzunluk: ${area.fiziksel.uzunluk} metre`);
  if (area.turizm?.yillik_ziyaretci) mevcutVeriler.push(`Yıllık ziyaretçi: ${area.turizm.yillik_ziyaretci}`);
  if (area.idari?.kurulus_tarihi) {
    const yil = area.idari.kurulus_tarihi.split('-')[0];
    mevcutVeriler.push(`Tescil/kuruluş yılı: ${yil}`);
  }

  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';
  const ilce = area.ilce ? `${area.ilce}/` : '';

  const prompt = `"${area.ad}" (${alanTuru}, ${ilce}${area.il}) için KISA ve SOMUT ilginç bilgiler listesi yaz.

VERİLEN VERİLER:
${mevcutVeriler.length > 0 ? mevcutVeriler.join('\n') : 'Spesifik veri yok'}

FORMAT KURALLARI:
- Her madde EN FAZLA 1-2 cümle olsun
- Somut rakamlar, tarihler, ölçüler ver
- Hikaye anlatma, sadece OLGU ver!

DOĞRU ÖRNEKLER:
- "Yüksekliği 5.137 metre ile Türkiye'nin en yüksek noktasıdır."
- "Mağara içi sıcaklık yaz-kış 22°C sabittir, astım hastaları için şifalı kabul edilir."
- "1948 yılında milli park ilan edilmiştir."
- "Yılda yaklaşık 500.000 turist ziyaret eder."
- "Adı Rumca 'batık şehir' anlamına gelir."
- "Toplam uzunluğu 40 metre, genişliği 15 metredir."

YANLIŞ ÖRNEKLER (BUNLARI YAPMA):
- "Bu muhteşem doğa harikası ziyaretçilerini büyülüyor..." (hikaye, somut bilgi yok)
- "Burası kesinlikle görülmesi gereken yerlerden..." (öznel yorum)

5-6 kısa madde yaz.

KESİNLİKLE: Uydurma rakam/tarih/bilgi YASAK!

JSON:
{
  "bilgiler": ["Kısa somut bilgi 1", "Kısa somut bilgi 2", ...]
}`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 600,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content);
  if (result.bilgiler) {
    result.bilgiler = result.bilgiler.map(b => cleanText(b, area.ad));
  }
  return result;
}

/**
 * 8. FOTOĞRAFÇILIK REHBERİ - Sosyal medya ve fotoğraf meraklıları için
 */
async function generateFotografcilik(area) {
  const alanTuru = (area.alan_turu || area.tip || area.tur || '').toLowerCase();
  const isIsland = alanTuru.includes('ada');
  const isMountain = alanTuru.includes('dağ') || alanTuru.includes('dag');
  const isCave = alanTuru.includes('mağara') || alanTuru.includes('magara');
  const isWaterfall = alanTuru.includes('şelale') || alanTuru.includes('selale');
  const isLake = alanTuru.includes('göl') || alanTuru.includes('gol');
  const isBeach = alanTuru.includes('plaj') || alanTuru.includes('koy');
  const isCanyon = alanTuru.includes('kanyon');

  const prompt = `"${area.ad}" (${alanTuru}) için fotoğrafçılık rehberi yaz.

ALAN TÜRÜ: ${alanTuru}
${isIsland ? 'ÖZELLİK: Ada manzaraları - deniz, kıyı, tepe noktaları' : ''}
${isMountain ? 'ÖZELLİK: Dağ fotoğrafçılığı - zirveler, vadiler, panoramalar' : ''}
${isCave ? 'ÖZELLİK: Mağara fotoğrafçılığı - düşük ışık, formasyonlar, dramatik gölgeler' : ''}
${isWaterfall ? 'ÖZELLİK: Şelale fotoğrafçılığı - uzun pozlama, su hareketi' : ''}
${isLake ? 'ÖZELLİK: Göl fotoğrafçılığı - yansımalar, gün doğumu/batımı' : ''}
${isBeach ? 'ÖZELLİK: Kıyı fotoğrafçılığı - dalgalar, kumsal, deniz renkleri' : ''}
${isCanyon ? 'ÖZELLİK: Kanyon fotoğrafçılığı - kaya formasyonları, ışık oyunları' : ''}

YAZIM YAKLAŞIMI:
Deneyimli bir fotoğraf ustası gibi, bu ALAN TÜRÜ için genel geçer pratik tavsiyeler ver.

KRİTİK KURAL: SPESİFİK YER İSİMLERİ, MEKAN İSİMLERİ, NOKTA İSİMLERİ VERME!
Bunun yerine genel terimler kullan: "giriş bölgesi", "yüksek noktalar", "kıyı kesimi", "ana patika", "zirve yakını" gibi.

BÖLÜMLER:
1. Çekim Açıları: Hangi tür açılar iyi çalışır? (örn: "Yüksek noktalardan panorama", "Kıyıdan gün batımı", "Giriş bölgesinden detay çekimler")
2. Işık ve Zaman: Gün doğumu/batımı, altın saat, mevsimsel özellikler (GENERİK - hep aynı)
3. Ekipman: Lens önerileri (geniş açı, tele, makro), filtre ihtiyacı, tripod
4. Kompozisyon: Kural of thirds, ön plan-arka plan dengesi, leading lines
5. Pratik İpuçları: Hava koşulları, güvenlik, uygun kıyafet

180-250 kelime. Teknik terimler kullan ama açıkla.

ÖRNEK DOĞRU:
"Gün batımında kıyı kesiminden çekim yapmak, denizin üzerinde turuncu-kırmızı tonları yakalamanızı sağlar. Geniş açı lens (16-35mm) kullanarak hem gökyüzünü hem sahili karenize alabilirsiniz."

ÖRNEK YANLIŞ (BUNLARI YAPMA):
"Karagöl Yaylası'nın doğusundaki Fatih Tepesi'nden..." (SPESİFİK İSİMLER YASAK!)
"Karadeniz Restaurant yakınındaki..." (YER İSMİ YASAK!)`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: 800
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * 9. YEREL DENEYİMLER - Kültür, mutfak, efsaneler, otantik deneyimler
 */
async function generateYerelDeneyimler(area) {
  const il = area.il || 'Türkiye';
  const ilce = area.ilce || '';
  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';

  // Bölgeye göre kültürel bağlam
  const bolgeKultur = {
    'Karadeniz': 'Kemençe müziği, horon, hamsi kültürü, laz böreği, mısır ekmeği',
    'Akdeniz': 'Yörük kültürü, zeybek, tahini, bumbar, tantuni, acılı ezme',
    'Ege': 'Zeytinyağlı yemekler, zeybek dansı, deniz mahsulleri, kumru',
    'Marmara': 'Osmanlı mutfağı, halk oyunları, deniz ürünleri, midye dolma',
    'İç Anadolu': 'Sivas katmer, testi kebabı, çörek, halk müziği',
    'Doğu Anadolu': 'Aşık müziği, boran çorbası, otlu peynir, fıkıra',
    'Güneydoğu Anadolu': 'Sıra geceleri, çiğ köfte, içli köfte, mumbar, baklava'
  };

  const bolgeOzellik = bolgeKultur[area.bolge] || bolgeKultur['İç Anadolu'];

  const prompt = `${il} bölgesi için yerel deneyimler rehberi yaz. Alan adı: "${area.ad}".

BÖLGE: ${il}
KÜLTÜREL BAĞLAM: ${bolgeOzellik}

YAZIM YAKLAŞIMI:
${il} bölgesinin GENEL kültürel özellikleri hakkında yaz. Alan-spesifik uydurma bilgi VERME!

KRİTİK KURALLAR:
1. SPESİFİK RESTORAN, LOKANTA, DÜKKAN İSİMLERİ YASAK!
   - Doğru: "Bölgede geleneksel lokantalarda..."
   - Yanlış: "Mehmet Usta'nın Lokantası'nda..." (İSİM YASAK!)

2. ALAN-SPESİFİK EFSANE/HİKAYE UYDURMA!
   - Doğru: "${il} bölgesinde genel olarak..."
   - Yanlış: "Bu alanla ilgili şöyle bir efsane var..." (UYDURMA!)

3. SADECE DOĞRULANAB İLİR GENEL BİLGİLER VER!
   - Wikipedia'da ${il} hakkında bulunabilecek bilgiler
   - Genel kültürel özellikler, yöresel yemekler (bölge bazında)

BÖLÜMLER:
1. Bölge Mutfağı: ${il} bölgesine ait bilinen yemekler (3-4 tane)
2. Kültürel Özellikler: Bölge halkının yaşam tarzı, festivaller, müzik
3. Yerel Üretim: Bölgede üretilen ürünler (bal, zeytinyağı, el sanatları vb - GENEL)
4. Pratik Bilgiler: Ulaşım, konaklama tipleri (GENEL tavsiyeler)

200-280 kelime. Bölge odaklı, doğrulanabilir bilgiler ver.

ÖRNEK DOĞRU:
"${il} bölgesi, Akdeniz mutfağının zengin lezzetleriyle ünlüdür. Yöresel çömlekte pişirilen kebaplar ve taze deniz ürünleri bölgenin vazgeçilmez tatlarındandır."

ÖRNEK YANLIŞ (BUNLARI YAPMA):
"${area.ad}'nın hemen yanındaki Hasan Usta'nın..." (SPESİFİK İSİM YASAK!)
"Rivayete göre burada bir ejderha yaşarmış..." (UYDURMA EFSANE YASAK!)`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.6,  // Düşürüldü: Daha az yaratıcı/uydurma, daha çok gerçek bilgi
    max_tokens: 750    // Biraz kısıldı: 200-280 kelime hedefi için yeterli
  });

  return cleanText(completion.choices[0].message.content.trim(), area.ad);
}

/**
 * Kelime sayısını hesapla
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Kelime sayılarını doğrula (Hikayeleştirme için yüksek hedefler)
 */
function validateWordCounts(content) {
  const requirements = {
    genel_bakis: { min: 90, name: 'Genel Bakış' },
    tarihce: { min: 130, name: 'Tarihçe' },
    cografya: { min: 160, name: 'Coğrafya' },
    flora_fauna: { min: 130, name: 'Flora/Fauna' },
    'ziyaret.metin': { min: 130, name: 'Ziyaret' }
  };

  const errors = [];

  Object.entries(requirements).forEach(([key, req]) => {
    let text;
    if (key === 'ziyaret.metin') {
      text = content.ziyaret?.metin;
    } else {
      text = content[key];
    }

    const wordCount = countWords(text);
    if (wordCount < req.min) {
      errors.push(`${req.name}: ${wordCount} kelime (minimum: ${req.min})`);
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * ⚡ OPTİMİZE: TEK API ÇAĞRISI İLE TÜM İÇERİK ÜRETİMİ
 * Maliyet: %85-90 azalma (7 çağrı → 1 çağrı)
 * Validasyon: Kısa içerikleri otomatik tespit edip genişletme
 */
async function generateAllContentInOne(area, wikidataInfo) {
  const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal alan';
  const ilce = area.ilce ? `${area.ilce}/` : '';

  // Fiziksel veriler
  const fizikselBilgiler = [];
  if (area.fiziksel?.alan) fizikselBilgiler.push(`Alan: ${area.fiziksel.alan} hektar`);
  if (area.fiziksel?.yukseklik) fizikselBilgiler.push(`Yükseklik: ${area.fiziksel.yukseklik} metre`);
  if (area.fiziksel?.derinlik) fizikselBilgiler.push(`Derinlik: ${area.fiziksel.derinlik} metre`);
  if (area.fiziksel?.uzunluk) fizikselBilgiler.push(`Uzunluk: ${area.fiziksel.uzunluk} metre`);

  // Tarihsel veriler
  const tarihselVeriler = [];
  if (area.idari?.kurulus_tarihi) {
    const yil = area.idari.kurulus_tarihi.split('-')[0];
    tarihselVeriler.push(`Resmi kuruluş yılı: ${yil}`);
  }
  if (area.idari?.acilis_tarihi) tarihselVeriler.push(`Ziyarete açılış: ${area.idari.acilis_tarihi}`);
  if (area.tarihsel?.isim_nereden) tarihselVeriler.push(`İsmin kökeni: ${area.tarihsel.isim_nereden}`);
  if (area.idari?.koruma_statusu) tarihselVeriler.push(`Koruma statüsü: ${area.idari.koruma_statusu}`);

  const coords = area.koordinat || {};
  const bolge = area.bolge || IL_BOLGE_MAP[area.il] || 'İç Anadolu';

  const prompt = `"${area.ad}" (${alanTuru}) için KOMPLE içerik üret.

KONUM: ${ilce}${area.il}, ${bolge} Bölgesi
${fizikselBilgiler.length > 0 ? 'FİZİKSEL VERİLER:\n' + fizikselBilgiler.join('\n') : ''}
${tarihselVeriler.length > 0 ? 'TARİHSEL VERİLER:\n' + tarihselVeriler.join('\n') : ''}
${wikidataInfo?.description_tr ? 'TANIM: ' + wikidataInfo.description_tr : ''}

Aşağıdaki JSON formatında KOMPLE içerik üret:

{
  "metadata": {
    "title": "${area.ad}",
    "description": "140-155 karakter, etkileyici SEO açıklaması",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
  },
  "genel_bakis": "⚠️ ZORUNLU: EN AZ 100 KELİME YAZ! Dikkat çekici giriş paragrafı. Konum, fiziksel veriler, hikaye - hepsini ör. 70-80 kelimelik kısa paragraf KABUL EDİLMEZ! Detaylı ve zengin yaz!",
  "tarihce": "⚠️ ZORUNLU: EN AZ 140 KELİME YAZ! Hikaye anlatımı. Tarihi varsa detaylı anlat, yoksa genel geçmişi anlat. 70-80 kelimelik kısa içerik KABUL EDİLMEZ! Uzun ve akıcı paragraf yaz!",
  "cografya": "⚠️ ZORUNLU: EN AZ 180 KELİME YAZ! Görsel coğrafya anlatımı. Konum, yapı, iklim, çevre - hepsini detaylı anlat. EN UZUN BÖLÜM BU OLMALI! 100-120 kelimelik kısa paragraf KABUL EDİLMEZ!",
  "flora_fauna": "⚠️ ZORUNLU: EN AZ 140 KELİME YAZ! Doğa belgeseli tarzı. Mevsimsel değişimler, canlılar, ekoloji - detaylı anlat. 90-100 kelimelik kısa paragraf KABUL EDİLMEZ! Zengin içerik yaz!",
  "ziyaret": {
    "metin": "⚠️ ZORUNLU: EN AZ 140 KELİME YAZ! Gezgin tavsiyesi. Nasıl gidilir, ne zaman, ne yapılır - hepsini detaylı anlat. 70-90 kelimelik kısa paragraf KABUL EDİLMEZ! Pratik ve zengin içerik!",
    "en_iyi_donem": "En iyi mevsim/dönem",
    "zorluk": "Kolay/Orta/Zor",
    "tahmini_sure": "Ziyaret süresi",
    "aktiviteler": ["aktivite1", "aktivite2", "aktivite3", "aktivite4"]
  },
  "ilginc_bilgiler": ["Kısa somut bilgi 1", "Kısa somut bilgi 2", "Kısa somut bilgi 3", "Kısa somut bilgi 4", "Kısa somut bilgi 5"]
}

KRİTİK UYARI - YABANCI KELİME KULLANAMAZSIN!
❌ ASLA KULLANMA: various, wildlife, experience, activity, important, beautiful, also, very, however, therefore, vb.
✅ SADECE TÜRKÇE: çeşitli, yaban hayatı, deneyimlemek, etkinlik, önemli, güzel, ayrıca, çok, ancak, bu nedenle
- Tek bir İngilizce/Almanca/Fransızca/İspanyolca kelime bile KABUL EDİLMEZ!
- Eğer kelime Türkçe değilse, KULLANMA!

YAZIM TARZI - HİKAYE VE BİLGİ DENGESİ:
- Hikaye gibi akıcı yaz AMA her cümlede somut bilgi olsun
- Cümleleri UZAT, zenginleştir, detaylandır (ama boş laf etme!)
- Bilgileri karşılaştırmalarla zenginleştir: "140 hektar" değil → "140 hektarlık alan, yaklaşık 200 futbol sahası büyüklüğünde"
- Klişelerden kaçın ("muhteşem", "eşsiz", "benzersiz")
- Paragraflarda tekrar yapma, farklı cümle yapıları kullan

⛔ ASLA, ASLA, ASLA YAPMA:
1. Yabancı kelime kullanma (EN ÖNEMLİ!)
2. UYDURMA SAYI/TARİH/İSTATİSTİK KULLANMA:
   ❌ "500 bitki türü", "200 hayvan", "1000 ağaç", "50 km parkur"
   ❌ "10.000 hektar", "5 restoran", "10 TL giriş"
   ❌ "1970'li yıllarda", "2000 yıl önce"
   ✅ Sadece verilen gerçek sayıları kullan veya genel anlat
3. "Detaylı bilgi bulunmamaktadır" gibi boş ifadeler
4. Spesifik restoran/dükkan isimleri

UYDURMA SAYI YAZARSAN İÇERİK REDDEDILIR! SADECE GERÇEK VERİLERİ KULLAN!

BİLGİ + HİKAYE = MÜKEMMEL İÇERİK! Hem bilgilendir, hem sürükle!

ÖNEMLİ: Title SADECE mekan adı olacak, ek açıklama ekleme!`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_CONTEXT },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.65,  // Yüksel: Daha uzun ve akıcı içerik için
    max_tokens: 6000,  // Maksimum: Uzun paragraflar için bol bol token
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(completion.choices[0].message.content);

  // Post-processing: Tüm metinleri temizle
  if (result.metadata?.title) result.metadata.title = cleanText(result.metadata.title, area.ad);
  if (result.metadata?.description) result.metadata.description = cleanText(result.metadata.description, area.ad);
  if (result.metadata?.keywords) result.metadata.keywords = result.metadata.keywords.map(k => cleanText(k, area.ad));
  if (result.genel_bakis) result.genel_bakis = cleanText(result.genel_bakis, area.ad);
  if (result.tarihce) result.tarihce = cleanText(result.tarihce, area.ad);
  if (result.cografya) result.cografya = cleanText(result.cografya, area.ad);
  if (result.flora_fauna) result.flora_fauna = cleanText(result.flora_fauna, area.ad);
  if (result.ziyaret?.metin) result.ziyaret.metin = cleanText(result.ziyaret.metin, area.ad);
  if (result.ziyaret?.aktiviteler) result.ziyaret.aktiviteler = result.ziyaret.aktiviteler.map(a => cleanText(a, area.ad));
  if (result.ilginc_bilgiler) result.ilginc_bilgiler = result.ilginc_bilgiler.map(b => cleanText(b, area.ad));

  // Validasyon: Sadece bilgi amaçlı kelime sayılarını logla (genişletme yapma!)
  const validation = validateWordCounts(result);

  if (!validation.valid) {
    console.log(`  📊 Kelime sayıları:`);
    validation.errors.forEach(err => console.log(`      ${err}`));
    console.log(`  ℹ️  Not: Doğru bilgi önceliği - otomatik genişletme kapalı`);
  } else {
    console.log(`  ✅ Tüm bölümler kelime sayısı gereksinimlerini karşılıyor`);
  }

  return result;
}

/**
 * FULL CONTENT GENERATION - OPTİMİZE EDİLMİŞ VERSİYON
 */
async function generateFullContent(area, images) {
  console.log(`\n📍 İşleniyor: ${area.ad} (${area.il || 'Unknown'})`);

  try {
    // Wikidata bilgilerini çek
    console.log(`  📡 Wikidata bilgileri çekiliyor...`);
    const wikidataInfo = await fetchWikidataInfo(area.wikidata_id || area.wikidata_qid);

    // İl düzeltmesi (Türkiye olanlar için)
    let il = area.il;

    // Eğer il boş veya "Türkiye" ise, isimden parse et
    if (!il || il === 'Türkiye') {
      // İsimde tire varsa, ilk kelimeyi al (örn: "Kastamonu-Arac-Dereyayla" → "Kastamonu")
      let firstWord = area.ad.split('-')[0].trim();

      // Türkçe karakter düzeltmeleri (İngilizce yazılmış il adlarını Türkçeye çevir)
      const ilNameFixes = {
        'Istanbul': 'İstanbul',
        'Izmir': 'İzmir',
        'Canakkale': 'Çanakkale',
        'Agri': 'Ağrı',
        'Sirnak': 'Şırnak',
        'Sanliurfa': 'Şanlıurfa',
        'Mugla': 'Muğla',
        'Usak': 'Uşak',
        'Corum': 'Çorum',
        'Kirsehir': 'Kırşehir',
        'Kirikkale': 'Kırıkkale',
        'Kirklareli': 'Kırklareli',
        'Nevsehir': 'Nevşehir',
        'Nigde': 'Niğde',
        'Gumushane': 'Gümüşhane',
        'Duzce': 'Düzce'
      };

      firstWord = ilNameFixes[firstWord] || firstWord;

      // IL_BOLGE_MAP'te varsa kullan
      if (IL_BOLGE_MAP[firstWord]) {
        il = firstWord;
        console.log(`  🔧 İl isimden parse edildi: "${area.ad}" → ${il}`);
      } else if (WIKIDATA_IL_FIX[area.wikidata_id]) {
        il = WIKIDATA_IL_FIX[area.wikidata_id];
        console.log(`  🔧 İl düzeltildi: ${area.il || 'boş'} → ${il}`);
      }
    }

    console.log(`  ⚡ TEK API ÇAĞRISI ile tüm içerik üretiliyor...`);

    // ⚡ YENİ: Tek API çağrısı ile tüm içeriği üret
    const allContent = await generateAllContentInOne({ ...area, il }, wikidataInfo);

    const metadata = allContent.metadata;
    const genelBakis = allContent.genel_bakis;
    const tarihce = allContent.tarihce;
    const cografya = allContent.cografya;
    const floraFauna = allContent.flora_fauna;
    const ziyaret = allContent.ziyaret;
    const ilgincBilgiler = { bilgiler: allContent.ilginc_bilgiler };

    // 8. Fotoğrafçılık Rehberi - DEVRE DIŞI (Kalitesiz içerik üretiyor)
    // console.log(`  8/9 Fotoğrafçılık Rehberi...`);
    // const fotografcilik = await generateFotografcilik({ ...area, il });

    // 9. Yerel Deneyimler - DEVRE DIŞI (Hatalı bilgiler üretiyor, örn: Sivas katmeri Antalya için)
    // console.log(`  9/9 Yerel Deneyimler...`);
    // const yerelDeneyimler = await generateYerelDeneyimler({ ...area, il });

    // Frontmatter oluştur
    const coords = wikidataInfo?.coords || area.koordinat || area.koordinatlar || area.coordinates || {};
    const alanTuru = area.alan_turu || area.tip || area.tur || 'doğal_alan';
    // Bölge: Coğrafi bölge (Marmara, Ege, Akdeniz, vs.)
    const cografiBolge = area.bolge || IL_BOLGE_MAP[il] || 'Türkiye';

    // Kaynakları hazırla
    const kaynaklar = area.kaynaklar || [
      {
        title: 'tr.wikipedia.org',
        url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(area.ad)}`,
        tip: 'genel'
      },
      {
        title: 'www.wikidata.org',
        url: `http://www.wikidata.org/entity/${area.wikidata_id || area.wikidata_qid}`,
        tip: 'genel'
      }
    ];

    // Koordinatlar - hem coordinates hem koordinat ekle (iki sistem de çalışsın)
    const coordsObj = (coords.latitude || coords.lat) ? {
      lat: coords.latitude || coords.lat,
      lon: coords.longitude || coords.lon
    } : undefined;

    const frontmatter = {
      title: metadata.title,
      date: new Date().toISOString(),
      draft: false,
      type: 'alan',
      alan_turu: alanTuru.toLowerCase().replace(/\s+/g, '_'),
      il: il || 'Türkiye',
      ilce: area.ilce || '',
      bolge: cografiBolge,
      coordinates: coordsObj,  // For maps/weather widgets
      koordinat: coordsObj,     // Backup for legacy support
      ziyaret: {
        en_iyi_donem: ziyaret.en_iyi_donem,
        zorluk: ziyaret.zorluk,
        tahmini_sure: ziyaret.tahmini_sure
      },
      aktiviteler: ziyaret.aktiviteler || [],
      images: formatImages(images, area),
      kaynaklar: kaynaklar,
      description: metadata.description,
      keywords: metadata.keywords,
      schema_type: 'TouristAttraction',
      wikidata_id: area.wikidata_id || area.wikidata_qid || ''
    };

    // Markdown içerik
    const content = `---
${Object.entries(frontmatter).filter(([_, v]) => v !== undefined && v !== '').map(([k, v]) => {
  if (typeof v === 'object' && !Array.isArray(v)) {
    return `${k}:\n${Object.entries(v).map(([k2, v2]) => `  ${k2}: ${JSON.stringify(v2)}`).join('\n')}`;
  }
  return `${k}: ${JSON.stringify(v)}`;
}).join('\n')}
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

${ilgincBilgiler.bilgiler.map(b => `- ${b}`).join('\n')}
`;

    // Dosya yaz
    const filename = (area.id || area.ad.toLowerCase())
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const filepath = path.join(CONTENT_DIR, `${filename}.md`);
    fs.writeFileSync(filepath, content, 'utf-8');

    const imageInfo = images && images.length > 0 ? '✅ Görselli' : '📷 Görselsiz';
    console.log(`  ✅ Oluşturuldu: ${filename}.md ${imageInfo}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Hata: ${error.message}`);
    return false;
  }
}

function formatImages(images, area) {
  if (!images || images.length === 0) {
    // Placeholder görsel ekle
    return {
      hero: {
        url: `https://placehold.co/1200x600/e3f2fd/1565c0?text=${encodeURIComponent(area.ad)}`,
        alt: area.ad,
        caption: area.ad
      }
    };
  }

  const validImages = images.filter(img => img && img.url);
  if (validImages.length === 0) {
    // Placeholder görsel ekle
    return {
      hero: {
        url: `https://placehold.co/1200x600/e3f2fd/1565c0?text=${encodeURIComponent(area.ad)}`,
        alt: area.ad,
        caption: area.ad
      }
    };
  }

  return {
    hero: {
      url: validImages[0].url,
      alt: `${area.ad} manzarası`,
      credit: validImages[0].credit || 'Wikimedia Commons',
      license: validImages[0].license || 'CC BY-SA'
    },
    gallery: validImages.slice(1, 6).map(img => ({
      url: img.url,
      thumb: img.thumb || img.url,
      alt: `${area.ad}${img.title ? ' - ' + img.title : ''}`,
      credit: img.credit || 'Wikimedia Commons',
      license: img.license || 'CC BY-SA'
    }))
  };
}

async function fetchWikimediaImages(searchTerm, limit = 5, il = '') {
  const allImages = [];
  const seenUrls = new Set();

  // Farklı arama stratejileri
  const searchTerms = [
    searchTerm,
    `${searchTerm} Turkey`,
    `${searchTerm} Türkiye`,
    il ? `${searchTerm} ${il}` : null
  ].filter(Boolean);

  for (const term of searchTerms) {
    if (allImages.length >= limit) break;

    try {
      const response = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: `${term} filetype:bitmap`,
          gsrlimit: limit * 2, // Daha fazla çek, sonra filtreleyeceğiz
          gsrnamespace: 6, // File namespace
          prop: 'imageinfo',
          iiprop: 'url|extmetadata|mime|size', // size ekledik - width/height için
          iiurlwidth: 1200
        },
        headers: {
          'User-Agent': 'TabiatRehberi/1.0 (https://tabiatrehberi.com; info@tabiatrehberi.com)'
        },
        timeout: 10000
      });

      if (!response.data.query) continue;

      const images = Object.values(response.data.query.pages)
        .filter(page => {
          if (!page.imageinfo || !page.imageinfo[0]) return false;
          const imageinfo = page.imageinfo[0];
          const mime = imageinfo.mime || '';
          const width = imageinfo.width || 0;
          const height = imageinfo.height || 0;

          // Sadece görsel dosyaları al (jpg, png, webp) ve minimum çözünürlük kontrolü
          return mime.includes('image/') && !mime.includes('svg') && width >= 800 && height >= 600;
        })
        .map(page => {
          const imageinfo = page.imageinfo[0];
          return {
            url: imageinfo.url || '',
            thumb: imageinfo.thumburl || imageinfo.url || '',
            title: page.title?.replace('File:', '').replace(/\.[^/.]+$/, ''),
            credit: imageinfo.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || 'Wikimedia Commons',
            license: imageinfo.extmetadata?.License?.value || 'CC BY-SA',
            width: imageinfo.width || 0,
            height: imageinfo.height || 0,
            resolution: (imageinfo.width || 0) * (imageinfo.height || 0) // Toplam piksel sayısı
          };
        })
        .sort((a, b) => b.resolution - a.resolution); // En yüksek çözünürlükten başla

      // Benzersiz görselleri ekle
      for (const img of images) {
        if (!seenUrls.has(img.url) && allImages.length < limit) {
          seenUrls.add(img.url);
          allImages.push(img);
        }
      }
    } catch (error) {
      // Sessizce devam et
    }
  }

  return allImages;
}

/**
 * MAIN
 */
async function main() {
  console.log('\n🚀 PREMIUM İçerik Üretimi v6 - OPTİMİZE EDİLMİŞ VERSİYON');
  console.log('============================================================');
  console.log('⚡ TEK API ÇAĞRISI ile %85-90 maliyet tasarrufu');
  console.log('📊 Wikidata entegrasyonu + Premium içerik kalitesi');
  console.log('🔒 Mevcut 3000+ sayfa korunuyor, sadece yeniler üretiliyor');
  console.log('============================================================\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Liste seçimi: Parametre verilmişse o dosyayı, yoksa tüm merged dosyalarını kullan
  const mergedFiles = customList
    ? [customList.endsWith('.json') ? customList : `${customList}.json`]
    : fs.readdirSync(MASTER_LISTS_DIR).filter(f => f.endsWith('-merged.json'));

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;

  for (const file of mergedFiles) {
    console.log(`\n📋 Liste: ${file}`);
    const data = JSON.parse(fs.readFileSync(path.join(MASTER_LISTS_DIR, file), 'utf-8'));

    console.log(`   Toplam alan sayısı: ${data.alanlar?.length || 0}`);

    for (const area of data.alanlar || []) {
      // 🔒 MEVCUT DOSYALARI ATLA (3000+ sayfa korunacak)
      const filename = (area.id || area.ad.toLowerCase())
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      const filepath = path.join(CONTENT_DIR, `${filename}.md`);

      if (fs.existsSync(filepath)) {
        console.log(`\n📍 Atlanıyor (Zaten var): ${area.ad}`);
        totalSkipped++;
        continue;
      }

      let images = [];

      // ÖNCE: Mevcut görselleri kullan (eğer varsa)
      if (area.images && area.images.hero && area.images.hero.url) {
        console.log(`  📸 Mevcut görsel kullanılıyor...`);
        images = [{
          url: area.images.hero.url,
          title: area.ad,
          credit: 'Wikimedia Commons',
          license: 'CC BY-SA'
        }];

        // Ek görseller için de arama yap (galeri için)
        console.log(`  📸 Galeri için ek görseller aranıyor...`);
        const extraImages = await fetchWikimediaImages(area.ad, 6, area.il);
        // Mevcut hero görselini tekrar eklememek için filtrele
        const heroUrl = area.images.hero.url;
        const uniqueExtras = extraImages.filter(img => img.url !== heroUrl);
        images = [...images, ...uniqueExtras.slice(0, 5)];
        console.log(`  📸 Toplam ${images.length} görsel (1 hero + ${images.length - 1} galeri)`);
      } else {
        // Mevcut görsel yoksa Wikimedia API'den çek
        console.log(`  📸 Görseller aranıyor...`);
        images = await fetchWikimediaImages(area.ad, 6, area.il);
        console.log(`  📸 ${images.length} görsel bulundu`);
      }

      const success = await generateFullContent(area, images);

      if (success) totalSuccess++;
      totalProcessed++;

      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
    }
  }

  console.log('\n============================================================');
  console.log('✅ İçerik üretimi tamamlandı!');
  console.log(`📊 İstatistikler:`);
  console.log(`   - 🔒 Atlanan (Mevcut): ${totalSkipped}`);
  console.log(`   - 🆕 Yeni oluşturulan: ${totalProcessed}`);
  console.log(`   - ✅ Başarılı: ${totalSuccess}`);
  console.log(`   - ❌ Başarısız: ${totalProcessed - totalSuccess}`);
  console.log(`   - 📊 TOPLAM: ${totalSkipped + totalProcessed} sayfa`);
  console.log(`📁 Çıktı: ${CONTENT_DIR}`);
  console.log('============================================================\n');
}

main();
