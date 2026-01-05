# 🚀 Hızlı Başlangıç Kılavuzu

Bu belge, projeyi sıfırdan başlatmanız için adım adım rehber.

## ✅ Ön Gereksinimler

### 1. Hugo Kurulumu

**Windows:**
```powershell
# Chocolatey ile
choco install hugo-extended

# Veya Scoop ile
scoop install hugo-extended
```

**Mac:**
```bash
brew install hugo
```

**Linux:**
```bash
snap install hugo
```

Hugo versiyonunu kontrol edin:
```bash
hugo version
# En az v0.110.0 olmalı
```

### 2. Node.js Kurulumu

Node.js 18 veya üzeri gerekli: https://nodejs.org/

```bash
node --version  # v18 veya üzeri
npm --version
```

### 3. Groq API Key Alma

1. https://console.groq.com/ adresine git
2. Hesap oluştur (ücretsiz)
3. API Keys bölümünden yeni key oluştur
4. Key'i kopyala (sadece bir kez gösterilir!)

## 📥 Projeyi Kurma

### Adım 1: Repo'yu Klonla

```bash
git clone https://github.com/Ibrahim3223/tabiat-rehberi.git
cd tabiat-rehberi
```

### Adım 2: Groq API Key'i Ayarla

`.env` dosyası zaten oluşturulmuş ve API key'i içeriyor. Eğer değiştirmek isterseniz:

```bash
# .env dosyasını düzenle
notepad .env  # Windows
nano .env     # Mac/Linux
```

`.env` içeriği:
```env
GROQ_API_KEY=your_api_key_here
```

**ÖNEMLİ:** `.env` dosyası `.gitignore`'da olduğu için GitHub'a gitmez!

### Adım 3: Script Bağımlılıklarını Yükle

```bash
cd scripts
npm install
cd ..
```

## 🎬 İçerik Üretimi

### Adım 1: Master Liste Çek (Wikipedia'dan)

```bash
cd scripts
npm run fetch-lists
```

Bu işlem:
- Wikipedia'dan Türkiye'deki milli parklar ve tabiat parklarını çeker
- `data/master-lists/` klasörüne JSON dosyaları oluşturur
- Koordinat ve temel bilgileri toplar
- **Süre:** ~5-10 dakika

Çıktı:
```
📚 Wikipedia kategorisi çekiliyor: Türkiye'deki_milli_parklar
  ✅ 45 madde bulundu
  📄 İşleniyor: Köprülü Kanyon Milli Parkı
  ...
✅ 45 milli park kaydedildi
```

### Adım 2: Test İçerik Üret (İlk 10 Alan)

```bash
npm run generate:test
```

Bu işlem:
- İlk 10 alanı işler (test için)
- Groq API ile detaylı bilgi çeker
- Kaynak doğrulaması yapar
- `content/alanlar/` klasörüne markdown dosyaları oluşturur
- **Süre:** ~5-10 dakika (10 alan için)

Çıktı:
```
📍 İşleniyor: Köprülü Kanyon Milli Parkı (Antalya)
  🤖 Groq API ile detay çekiliyor...
  ✅ Detaylar alındı
  ✅ Oluşturuldu: koprulu-kanyon-milli-parki.md
```

### Adım 3: Kalite Kontrol

```bash
npm run validate
```

Oluşturulan içerikleri kontrol eder:
- Koordinat geçerliliği
- Kaynak sayısı
- Zorunlu alanlar

```bash
npm run review-queue
```

Manuel doğrulama gereken alanları gösterir.

## 🌐 Hugo Sitesini Çalıştırma

### Development Server

```bash
# Proje root'unda
hugo server -D

# Veya sadece yayınlanmış içerikler için
hugo server
```

Tarayıcıda aç: http://localhost:1313

**Hot reload aktif:** Dosyalarda değişiklik yaptıkça sayfa otomatik yenilenir.

### Production Build

```bash
hugo --minify
```

Statik site `public/` klasörüne oluşturulur.

## 📊 İçerik Durumunu Kontrol Etme

### Kaç sayfa oluşturuldu?

```bash
# Windows
dir content\alanlar\*.md | Measure-Object | Select-Object -ExpandProperty Count

# Mac/Linux
ls -1 content/alanlar/*.md | wc -l
```

### İller ve türlere göre dağılım

Hugo server çalışırken:
- http://localhost:1313/iller/
- http://localhost:1313/turler/

## 🐛 Sık Karşılaşılan Sorunlar

### "Hugo command not found"

Hugo yüklü değil. Yukarıdaki kurulum adımlarını takip edin.

### "GROQ_API_KEY not found"

`.env` dosyası eksik veya API key girilmemiş.

```bash
cp .env.example .env
# Sonra .env dosyasını düzenle
```

### "Module not found" hatası

Script bağımlılıkları yüklenmemiş:

```bash
cd scripts
npm install
```

### Groq API rate limit

Groq API ücretsiz katmanında rate limit var. Script'te 2 saniye bekleme var, ancak çok fazla alan üretiyorsanız beklemek gerekebilir.

### İçerik üretildi ama Hugo'da görünmüyor

`draft: true` olabilir. Hugo server'ı `-D` flagiyle çalıştırın:

```bash
hugo server -D
```

## 📈 Üretimi Ölçeklendirme

### Tüm alanları üret (10.000+)

```bash
cd scripts

# 100'er 100'er üret (API limit için)
node generate-content.js --limit=100

# 2-3 dakika bekle, sonra devam et
node generate-content.js --limit=200
# ...ve böyle devam et
```

### Paralel üretim (gelişmiş)

Birden fazla terminal açıp farklı master listeleri işleyebilirsiniz. Ancak Groq API rate limit'i göz önünde bulundurun.

## 🚀 Cloudflare Pages'e Deploy

### Adım 1: GitHub'a Push

```bash
git add .
git commit -m "İçerik eklendi"
git push origin main
```

### Adım 2: Cloudflare Pages'i Bağla

1. https://dash.cloudflare.com/ → Pages → Create Project
2. "Connect to Git" → GitHub'ı seç
3. Repo seç: `Ibrahim3223/tabiat-rehberi`
4. Build ayarları:
   - **Framework preset:** Hugo
   - **Build command:** `hugo --minify`
   - **Build output directory:** `public`
   - **Environment variables:** (Boş bırakılabilir, script'ler local'de çalışır)

5. "Save and Deploy"

### Adım 3: Domain Ayarla (Opsiyonel)

Cloudflare Pages → Custom Domains → Add Custom Domain

## 📚 Sonraki Adımlar

1. **İçerik Zenginleştirme:** Review queue'daki alanları manuel düzelt
2. **Görsel Ekleme:** Wikimedia Commons'tan uygun görseller bul
3. **İç Link Optimizasyonu:** İl ve tür sayfalarını zenginleştir
4. **Blog İçerikleri:** Kullanıcı için ipuçları, rehberler yaz
5. **Harita Entegrasyonu:** OpenStreetMap veya Google Maps ekle

## 💡 İpuçları

- Her `generate` sonrası `validate` çalıştır
- Review queue'yu düzenli kontrol et
- GitHub'a sık sık commit yap
- Cloudflare Pages otomatik deploy yapıyor, manuel build gerekmez

---

Sorularınız için: [README.md](README.md) | [GitHub Issues](https://github.com/Ibrahim3223/tabiat-rehberi/issues)
