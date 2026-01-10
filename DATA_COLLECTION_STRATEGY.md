# 🎯 Veri Toplama Stratejisi - Google Maps'te Bile Olmayan Yerler

## Hedef: Türkiye'nin EN KAPSAMLI Tabiat Rehberi

**Vizyon:** Google'da aratıldığında sadece Wikipedia ve bizim sitemiz çıkan yerler!

---

## 📊 Mevcut Durum Analizi

### ❌ Sorunlar (İlk Denemeler)
```
Wikipedia API:
- Milli Parklar: 0
- Tabiat Parkları: 0
- Kanyonlar: 0
- Yaylalar: 0

Wikidata SPARQL (İlk Versiyon):
- Milli Parklar: 0
- Tabiat Parkları: 0
- Plajlar: 32 (çok az)
- Tabiat Anıtları: 2 (çok az)
```

### ✅ İyi Çıkanlar
```
- Dağlar: 2861
- Tepeler: 3292
- Mağaralar: 282
- Göller: 230
- Şelaleler: 111
```

**SONUÇ:** Online veritabanları yetersiz! Manuel toplama + crowd-sourcing gerekli.

---

## 🚀 Çok Katmanlı Veri Toplama Stratejisi

### **Katman 1: Resmi Kaynaklar** (EN GÜVEN trusted)

1. **DKMP (Doğa Koruma ve Milli Parklar)**
   - ✅ Script: `fetch-dkmp-official.js`
   - 26 Milli Park (manuel eklendi)
   - Tabiat Parkları listesi eklenecek (200+)
   - Tabiat Anıtları listesi eklenecek (100+)

2. **Belediye Web Siteleri**
   - İl bazlı tarama
   - Turizm bölümleri
   - Piknik alanları, mesire yerleri

3. **Kültür ve Turizm Bakanlığı**
   - Turizm envanteri
   - Kültürel değerler

### **Katman 2: Online Veritabanları**

1. **Wikidata SPARQL** (Genişletilmiş)
   - ✅ Multiple QID desteği eklendi
   - ✅ Alt tip araması eklendi
   - ✅ UNION sorguları eklendi
   - Beklenen artış: %300-500

2. **Wikipedia API**
   - Türkçe kategoriler
   - İngilizce kategoriler (çevirili)
   - Alternatif kategori isimleri

3. **OpenStreetMap API**
   - `tourism=viewpoint`
   - `natural=peak`
   - `natural=waterfall`
   - `natural=cave_entrance`
   - vs.

### **Katman 3: Crowd-Sourcing** (SEO GÜCÜ!)

1. **Yerel Bilgi Toplama**
   - İl bazlı Facebook grupları
   - Dağcılık kulüpleri
   - Doğa sporları toplulukları
   - Fotoğrafçı grupları

2. **Google Maps Tarama** (Manuel)
   - "şelale" araması → 81 il
   - "kanyon" araması → 81 il
   - "mağara" araması → 81 il
   - "yayla" araması → 81 il
   - Google Maps'te var ama başka yerde yok = ALTIN!

3. **Saha Çalışması Verileri**
   - Dağcılar, kampçılar
   - Tur rehberleri
   - Yerel halk bilgisi

### **Katman 4: AI ile Veri Zenginleştirme**

1. **Groq AI**
   - Mevcut verileri zenginleştir
   - Eksik koordinatları tahmin et (sonra doğrula)
   - İçerik üret

2. **Görsel AI**
   - Google Images scraping
   - Unsplash, Pexels
   - Wikimedia Commons

---

## 📝 Pratik Uygulama Planı

### **Faz 1: Hızlı Başlangıç** (1-2 gün)

```bash
# 1. Resmi DKMP verisi
npm run fetch-dkmp
# → 26 Milli Park garantili

# 2. Genişletilmiş Wikidata
npm run fetch-wikidata
# → 5000-8000 alan (genişletilmiş sorgu ile)

# 3. Wikipedia
npm run fetch-wikipedia
# → 1000-2000 alan

# 4. Birleştir
npm run merge-sources
# → ~10.000 benzersiz alan
```

### **Faz 2: Manuel Zenginleştirme** (1 hafta)

**Her İl İçin Google Maps Taraması:**

```csv
# selaleler-google-maps.csv
ad,il,ilce,lat,lon,kaynak1,kaynak2,notlar
Saklıkent Şelalesi,Antalya,Serik,36.9876,31.0123,https://goo.gl/maps/xxx,,Google Maps'te var
Düden Şelalesi,Antalya,Merkez,36.9567,30.9876,https://goo.gl/maps/yyy,,Çok popüler
...
```

**Import:**
```bash
npm run import-csv selalesi selaleler-google-maps.csv
```

**Hedef:** Her kategoride +500 alan ekle = **+5000 alan**

### **Faz 3: Crowd-Sourcing** (Sürekli)

1. **Sitede "Yer Ekle" Formu**
   - Kullanıcılar katkıda bulunabilir
   - Admin onayı sonrası yayınla

2. **Facebook/Instagram Kampanyaları**
   - "Gizli cennetinizi paylaşın"
   - Fotoğraf yarışması

3. **Yerel Bilgi Toplayıcılar**
   - Her ilden 1 kişi
   - Aylık 10 yer ekleme görevi

---

## 🎯 Hedef Sayılar (3 Ay)

| Kategori | Şu An | Hedef | Stratej

i |
|----------|-------|-------|---------|
| Milli Parklar | 26 | 50 | DKMP + Wikipedia |
| Tabiat Parkları | 0 | 250 | DKMP + Wikidata |
| Tabiat Anıtları | 2 | 150 | DKMP + Manuel |
| Kanyonlar | 0 | 300 | Google Maps + Crowd |
| Şelaleler | 111 | 500 | Google Maps + Wikidata |
| Mağaralar | 282 | 400 | Wikidata + Manuel |
| Göller | 230 | 600 | Wikidata + OSM |
| Dağlar | 2861 | 3500 | Wikidata (iyi) |
| Plajlar | 32 | 400 | Google Maps + Turizm |
| Yaylalar | 0 | 800 | Manuel + Crowd |
| **TOPLAM** | **~3500** | **~7000** | **Çok katmanlı** |

**+ Gizli yerler:** 2000-3000 (Google Maps'te var ama online DB'de yok)

**GRAND TOTAL: 10.000+ alan** 🎉

---

## 💡 SEO Stratejisi

### **Long-tail Keywords**

Kimsenin yazmadığı yerler için:
- "Türkiye'deki bilinmeyen şelaleler"
- "Google Maps'te olmayan kanyonlar"
- "Gizli yaylalar listesi"

### **Coğrafi SEO**

Her il için:
- "/iller/antalya/selaleler/"
- "/iller/antalya/kanyonlar/"
- 81 il × 10 kategori = 810 hub sayfası

### **Yerel İsimler**

- "Köy halkının bildiği isimler"
- Alternatif isimler (altLabel)
- Eski isimler

---

## 🛠️ Araçlar

### **Otomatik**
```bash
npm run fetch-all       # Tüm online kaynaklar
npm run merge-sources   # Akıllı birleştirme
npm run generate        # Groq ile içerik
```

### **Manuel**
```bash
npm run add-manual      # Tek tek ekle
npm run import-csv      # CSV toplu ekle
```

### **Kalite Kontrol**
```bash
npm run validate        # Veri doğrulama
npm run review-queue    # Manuel kontrol listesi
```

---

## 📈 Başarı Metrikleri

1. **Miktar:** 10.000+ sayfa
2. **Kalite:** Her sayfada en az 2 kaynak
3. **Benzersizlik:** %30+ sayfa sadece bizde var
4. **SEO:** Google'da ilk 3'te
5. **Kullanıcı:** Ayda 100K+ ziyaret

---

**Sonraki Adım:**

1. Genişletilmiş Wikidata'yı tekrar çalıştır
2. Her il için Google Maps taraması başlat
3. Crowd-sourcing sistemi kur

Hazır mısın? 🚀
