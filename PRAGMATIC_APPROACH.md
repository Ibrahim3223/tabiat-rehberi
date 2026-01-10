# 🎯 Pragmatik Yaklaşım: Manuel Ama Etkili

## Gerçekler

**Wikidata/Wikipedia yetersiz:**
- Milli parklar: 0 ✗
- Tabiat parkları: 0 ✗
- Kanyonlar: 0 ✗
- Yaylalar: 0 ✗

**SONUÇ:** Online veritabanları Türkiye için çok eksik!

---

## ✅ YENİ STRATEJİ: Kalite > Miktar

### 1. **DKMP Resmi Liste** (Garantili 200-300 alan)

```bash
npm run fetch-dkmp
```

**Çıktı:**
- ✅ 26 Milli Park (manuel eklendi)
- 📝 TODO: 200+ Tabiat Parkı ekle
- 📝 TODO: 100+ Tabiat Anıtı ekle

### 2. **İl Bazlı Google Maps Taraması** (En Güçlü Yöntem!)

**Neden Google Maps?**
- ✅ Koordinatlar hazır
- ✅ Fotoğraflar var
- ✅ Kullanıcı yorumları var
- ✅ SEO için mükemmel (çoğu yerde yok)

**Nasıl Yapılır:**

#### Adım 1: İl Seç
Örnek: Antalya

#### Adım 2: Google Maps'te Ara
- "Antalya şelale"
- "Antalya kanyon"
- "Antalya mağara"
- "Antalya yayla"
- "Antalya plaj"

#### Adım 3: CSV Oluştur

`antalya-selaleler.csv`:
```csv
ad,il,ilce,lat,lon,kaynak1,notlar
Düden Şelalesi,Antalya,Merkez,36.9567,30.9876,https://goo.gl/maps/xxx,Çok popüler
Kurşunlu Şelalesi,Antalya,Aksu,36.8765,30.8543,https://goo.gl/maps/yyy,Tabiat parkı
Uçansu Şelalesi,Antalya,Serik,37.0123,31.1234,https://goo.gl/maps/zzz,Az bilinen
Manavgat Şelalesi,Antalya,Manavgat,36.7890,31.4567,https://goo.gl/maps/aaa,Turistik
```

#### Adım 4: Import Et
```bash
cd scripts
npm run import-csv selalesi antalya-selaleler.csv
```

#### Adım 5: Tekrarla
81 il × 10 kategori = **810 arama**
Her aramada 5-10 yer = **4000-8000 YER!**

### 3. **Crowd-Sourcing (İleriki Aşama)**

Site canlıya alındıktan sonra:
- "Yer Ekle" formu
- Kullanıcılar katkıda bulunur
- Admin onaylar

---

## 📝 Hazır CSV Template'leri

### Template 1: Şelaleler
```csv
ad,il,ilce,lat,lon,yukseklik_m,kaynak1,kaynak2,notlar
Düden Şelalesi,Antalya,Merkez,36.9567,30.9876,20,https://goo.gl/maps/xxx,https://tr.wikipedia.org/...,Çift şelale
```

### Template 2: Kanyonlar
```csv
ad,il,ilce,lat,lon,uzunluk_km,derinlik_m,kaynak1,notlar
Saklıkent Kanyonu,Muğla,Fethiye,36.5123,29.3456,18,300,https://goo.gl/maps/xxx,Rafting yapılır
```

### Template 3: Mağaralar
```csv
ad,il,ilce,lat,lon,uzunluk_m,ziyaret_edilebilir,kaynak1,notlar
Damlataş Mağarası,Antalya,Alanya,36.5432,32.0123,200,evet,https://goo.gl/maps/xxx,Astım hastaları için iyi
```

### Template 4: Yaylalar
```csv
ad,il,ilce,lat,lon,yukseklik_m,kaynak1,notlar
Ayder Yaylası,Rize,Çamlıhemşin,41.1234,40.9876,1350,https://goo.gl/maps/xxx,Kaplıcaları ünlü
```

---

## 🚀 Hızlı Başlangıç Planı

### Hafta 1: DKMP + Popüler İller (500 alan)

**Gün 1-2: DKMP Resmi**
```bash
npm run fetch-dkmp  # 26 milli park
```

Manuel ekle: Tabiat parkları (CSV ile)

**Gün 3-7: Top 10 İl**
1. İstanbul (şelale, plaj, park)
2. Antalya (şelale, kanyon, plaj, mağara)
3. Muğla (plaj, kanyon)
4. İzmir (plaj, yayla)
5. Bursa (yayla, şelale)
6. Trabzon (yayla, şelale)
7. Rize (yayla, göl)
8. Artvin (yayla, kanyon)
9. Bolu (göl, şelale)
10. Konya (göl, mağara)

**Beklenen:** ~500 alan

### Hafta 2-4: Kalan 71 İl (2000 alan)

Her gün 5-10 il × 5 kategori = 25-50 alan/gün
20 iş günü × 30 alan = **600-1000 alan**

**TOPLAM:** 2500-3000 alan

---

## 💡 Google Maps Veri Çekme Pratik Guide

### Manuel Yöntem (En Kolay)

1. **Google Maps Aç**
2. **"Antalya şelale" Ara**
3. **Her Sonuç İçin:**
   - İsmi kopyala
   - Koordinatları al (URL'den veya tıklayıp "Share" → koordinatlar)
   - Google Maps link'i kaydet
   - Excel/CSV'ye ekle

### Yarı-Otomatik (Chrome Extension)

**Google Maps Scraper** extension:
- Arama yap
- Extension ile export et
- CSV al
- Temizle ve import et

### Tam Otomatik (İleri Seviye)

Python script (miras-haritası'ndan adapte):
```python
# google_maps_scraper.py
# İl + kategori ver, otomatik CSV üret
```

---

## 📊 Gerçekçi Hedefler

| Zaman | Alan Sayısı | Kaynak |
|-------|-------------|--------|
| **1 Hafta** | 500 | DKMP + Top 10 İl |
| **1 Ay** | 2500 | 81 İl Google Maps |
| **3 Ay** | 5000 | + Crowd-sourcing |
| **6 Ay** | 10000 | + Detaylı araştırma |

---

## ✅ Şimdi Ne Yapmalısın?

### Option 1: DKMP ile Başla (5 dakika)
```bash
cd scripts
npm run fetch-dkmp
```
→ 26 milli park garantili!

### Option 2: İlk CSV Manuel Topla (30 dakika)
1. Google Maps aç
2. "Antalya şelale" ara
3. İlk 10 yeri CSV'ye ekle
4. Import et:
```bash
npm run import-csv selalesi antalya-selaleler.csv
```

### Option 3: Template'leri Kullan
1. `templates/selaleler-template.csv` kopyala
2. Doldur
3. Import et

---

## 🎯 Odak: Kalite

**10 mükemmel sayfa > 100 yarım yamalak sayfa**

Her sayfa:
- ✅ Doğru koordinat
- ✅ En az 1 fotoğraf (Wikimedia veya lisanslı)
- ✅ En az 2 kaynak
- ✅ Gerçek bilgi (tahmin yok!)

---

**Sonraki Adım:** Hangi option'ı seçmek istersin?
1. DKMP'den başla (kolay)
2. İlk CSV'ni topla (pratik)
3. Template sistemi kur (organize)
