# 🌲 Tabiat Rehberi - Türkiye Doğal Alanlar Ansiklopedisi

Türkiye'deki **10.000+ milli park, tabiat parkı, kanyon, şelale ve doğal alan** için kapsamlı rehber ve ansiklopedi.

## 🎯 Proje Özeti

- **Amaç:** Türkiye'deki tüm doğal alanları keşfedilebilir ve SEO uyumlu bir platformda toplamak
- **Teknoloji:** Hugo (Static Site Generator) + Cloudflare Pages
- **İçerik Üretimi:** Groq API ile otomatik (doğruluk odaklı)
- **Hedef:** 10.000+ kaliteli sayfa

## 🚀 Hızlı Başlangıç

### Gereksinimler

- [Hugo Extended](https://gohugo.io/installation/) (v0.110.0+)
- Node.js 18+ (içerik üretim scriptleri için)
- Groq API Key

### Kurulum

```bash
# Repo'yu klonla
git clone https://github.com/Ibrahim3223/tabiat-rehberi.git
cd tabiat-rehberi

# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle ve GROQ_API_KEY'i ekle

# Script bağımlılıklarını yükle
cd scripts
npm install
cd ..

# Hugo'yu çalıştır (development)
hugo server -D
```

Site şu adreste açılacak: http://localhost:1313

## 📁 Proje Yapısı

```
tabiat-rehberi/
├── content/                  # Hugo içerik
│   ├── alanlar/             # Doğal alan sayfaları (otomatik üretilir)
│   ├── iller/               # İl sayfaları
│   ├── turler/              # Tür sayfaları (milli park, kanyon vs.)
│   ├── aktiviteler/         # Aktivite sayfaları (kamp, yürüyüş vs.)
│   └── *.md                 # Statik sayfalar (hakkında, iletişim vs.)
│
├── data/
│   ├── master-lists/        # Master veri listeleri (Wikipedia'dan çekilir)
│   │   ├── milli-parklar.json
│   │   ├── tabiat-parklari.json
│   │   └── ...
│   └── review-queue/        # Manuel doğrulama bekleyen alanlar
│
├── scripts/                 # İçerik üretim scriptleri
│   ├── fetch-master-lists.js    # Wikipedia'dan liste çeker
│   ├── generate-content.js      # Groq ile içerik üretir
│   ├── validate-content.js      # Kalite kontrol
│   └── show-review-queue.js     # Review queue listesi
│
├── themes/tabiat/           # Özel Hugo teması
│   └── layouts/             # Tema layout'ları
│
├── static/                  # Statik dosyalar (CSS, görseller)
│
├── hugo.toml                # Hugo config
├── .env                     # API keys (GİTHUB'A GİTMEZ!)
└── .gitignore
```

## 🔧 İçerik Üretim Süreci

### 1️⃣ Master Liste Çekme (Wikipedia)

```bash
cd scripts
npm run fetch-lists
```

Bu script:
- Wikipedia'dan Türkiye'deki milli parklar, tabiat parkları vs. listesini çeker
- `data/master-lists/` klasörüne JSON formatında kaydeder
- Her alan için temel bilgileri (ad, konum, koordinat) toplar

### 2️⃣ İçerik Üretme (Groq API)

```bash
# Test modu (ilk 10 alan)
npm run generate:test

# Tam üretim
npm run generate

# Belirli sayıda alan
node generate-content.js --limit=100
```

Bu script:
1. Master listeden alanları okur
2. Her alan için Groq API kullanarak detaylı bilgi toplar
3. **Kaynak doğrulaması yapar** (kritik bilgiler için)
4. Hugo markdown dosyası oluşturur
5. Kalite kontrol yapar
6. Sorunlu alanları review queue'ya ekler

### 3️⃣ Kalite Kontrol

```bash
# İçerikleri doğrula
npm run validate

# Review queue'yu göster
npm run review-queue
```

## 📊 Veri Politikası (KRİTİK!)

Bu projede **doğruluk birinci önceliktir**. Özellikle:

### ✅ Asla Tahmin Yapılmaz

Aşağıdaki bilgilerde emin olmadıkça **"Bilinmiyor"** yazılır:
- Giriş ücreti
- Açılış/kapanış saatleri
- Kapalı günler
- Sezonluk değişiklikler

### 📚 Kaynak Gereksinimleri

- Her sayfa için **en az 2 güvenilir kaynak** hedeflenir
- Kaynak önceliği:
  1. Resmi kurum sayfaları (DKMP, belediyeler)
  2. Akademik yayınlar
  3. Güvenilir medya kaynakları

### 🔍 Kalite Kontrol

Script otomatik olarak şunları kontrol eder:
- Koordinat Türkiye sınırları içinde mi?
- En az 2 kaynak var mı?
- Giriş bilgileri doğrulanmış mı?
- Zorunlu alanlar dolu mu?

**Sorunlu alanlar** otomatik olarak **review queue'ya** eklenir.

## 🎨 Tema ve SEO

### SEO Özellikleri

- Benzersiz title ve meta description
- Open Graph ve Twitter Cards
- Schema.org (TouristAttraction, Place, Park)
- Canonical URL'ler
- Sitemap (otomatik bölünmüş, 10K+ sayfa için)

### İç Link Stratejisi

Her alan sayfası otomatik olarak şunlara link verir:
- İl sayfası
- Tür sayfası (milli park, kanyon vs.)
- Aktivite sayfaları
- Yakınındaki diğer alanlar

## 🚢 Deployment (Cloudflare Pages)

### GitHub'a Push

```bash
git add .
git commit -m "İçerik güncelleme"
git push origin main
```

### Cloudflare Pages Ayarları

1. Cloudflare Dashboard → Pages → Create Project
2. GitHub repo'yu bağla: `Ibrahim3223/tabiat-rehberi`
3. Build settings:
   - **Build command:** `hugo --minify`
   - **Build output directory:** `public`
   - **Root directory:** `/`
4. Environment variables:
   - (Groq API key Cloudflare'de GEREKLİ DEĞİL, sadece local'de içerik üretimi için)

### Her Push'ta Otomatik Deploy

Cloudflare Pages her `git push` sonrası otomatik olarak:
- Hugo build çalıştırır
- Static site'i deploy eder
- Global CDN'de yayınlar

## 📈 Performans

- **Statik site** = Çok hızlı yüklenme
- **Cloudflare CDN** = Düşük gecikme
- **SEO** = Yüksek ranking potansiyeli
- **Maliyet** = $0 (Cloudflare Pages free tier)

## 🛠️ Geliştirme İpuçları

### Yeni Alan Türü Eklemek

1. `archetypes/` klasörüne yeni template ekle
2. `hugo.toml` dosyasında taxonomy güncelle
3. Master liste JSON dosyası oluştur
4. `generate-content.js`'de yeni tür için mantık ekle

### Görsel Sistemi

- Görseller **repo'da değil**
- Wikimedia Commons veya güvenilir kaynaklardan **URL olarak** kullanılır
- Her görselde: alt text + kaynak + lisans

### Review Queue Workflow

1. `npm run review-queue` ile listeyi gör
2. Sorunlu alanları manuel kontrol et
3. Markdown dosyasını düzenle
4. `npm run validate` ile doğrula
5. Review queue'dan çıkar

## 🔐 Güvenlik

- ✅ `.env` dosyası `.gitignore`'da
- ✅ API key asla GitHub'a gitmez
- ✅ `.env.example` kullanıcılar için rehber

## 📞 Katkı ve İletişim

- **GitHub Issues:** Hata bildirimi ve öneriler
- **Pull Requests:** Katkılarınızı bekliyoruz!
- **E-posta:** info@tabiatrehberi.com

## 📄 Lisans

MIT

---

**Yapımcı:** İbrahim
**Site:** [tabiatrehberi.com](https://tabiatrehberi.com)
**Repo:** [github.com/Ibrahim3223/tabiat-rehberi](https://github.com/Ibrahim3223/tabiat-rehberi)
