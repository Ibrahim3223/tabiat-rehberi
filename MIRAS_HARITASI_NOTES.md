# Miras Haritası Projesinden Alınan İyi Pratikler

Bu belge, **miras-haritası** projesinden Tabiat Rehberi'ne taşınan iyi pratikleri açıklar.

## ✨ Alınan Özellikler

### 1. **Wikidata SPARQL Entegrasyonu**

**Neden önemli:**
- Wikipedia API'den çok daha yapılandırılmış veri
- Koordinatlar otomatik geliyor
- Görseller otomatik geliyor
- İl/İlçe bilgileri otomatik
- Wikipedia linkleri otomatik

**Nasıl kullanılıyor:**
```bash
npm run fetch-wikidata
```

**Avantajları:**
- Tek sorguda tüm bilgiler
- Duplicate kontrolü kolay
- QID (Wikidata ID) ile kesin referans
- Retry mekanizması built-in

### 2. **Hibrit Veri Toplama (Wikipedia + Wikidata)**

**Yaklaşım:**
1. Wikipedia API → Türkçe zengin içerik
2. Wikidata SPARQL → Yapılandırılmış veri (koordinat, görsel)
3. Merge Script → En iyi veriyi seç

**Örnek Flow:**
```
Wikipedia → 45 milli park (Türkçe açıklamalar zengin)
Wikidata → 52 milli park (Koordinatlar tam)
Merge    → 60 milli park (Her iki kaynaktan en iyi veri)
```

### 3. **Akıllı Birleştirme (Fuzzy Matching)**

**Sorun:**
- Wikipedia: "Köprülü Kanyon Milli Parkı"
- Wikidata: "Köprülü Kanyon"

**Çözüm:**
- İsim normalizasyonu
- Levenshtein distance
- %80+ benzerlik = eşleşme

**Sonuç:**
- Duplicate'ler otomatik birleşiyor
- En kaliteli veri seçiliyor

### 4. **Görsel URL Sistemi**

**Miras haritası yaklaşımı:**
- Wikimedia Commons URL'leri direkt kullanılıyor
- Repo'ya görsel yüklenmiyor
- Image filename saklanıyor (lazy loading için)

**Tabiat rehberi adaptasyonu:**
```javascript
images: {
  hero: {
    url: "http://commons.wikimedia.org/wiki/Special:FilePath/...",
    filename: "Koprulu_Kanyon.jpg",
    source: "wikimedia",
    credit: "...",
    license: "CC-BY-SA"
  }
}
```

### 5. **Retry ve Rate Limiting**

**Miras haritası:**
```python
retries = 3
for i in range(retries):
    try:
        response = requests.get(...)
        break
    except Exception as e:
        time.sleep(2)
```

**Tabiat rehberi:**
```javascript
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const response = await axios.get(...);
    return response.data;
  } catch (error) {
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}
```

### 6. **Progress Tracking**

**Miras haritası:**
- `generation_progress.json` - İlerleme kaydı
- `needs_review.json` - Manuel kontrol gerekli

**Tabiat rehberi:**
- `data/review-queue/pending-review.json` - Kalite sorunları
- Her script çıktısı timestamped

## 📊 Karşılaştırma

| Özellik | Miras Haritası | Tabiat Rehberi |
|---------|---------------|----------------|
| **Veri Kaynağı** | Wikidata (SPARQL) | Wikipedia API + Wikidata SPARQL |
| **Dil** | Python | Node.js |
| **Görsel Sistemi** | Wikimedia Commons | Wikimedia Commons |
| **İçerik Üretimi** | Template-based | Groq AI + Template |
| **Kalite Kontrol** | Manuel review queue | Otomatik + Review queue |
| **Koordinat** | Wikidata otomatik | Wikipedia API + Wikidata |

## 🎯 Avantajlarımız

### Miras Haritası'ndan İyi Aldıklarımız:
1. ✅ Wikidata SPARQL kullanımı
2. ✅ Retry mekanizması
3. ✅ User-Agent headers
4. ✅ Rate limiting
5. ✅ Progress tracking

### Bizim Ekstra Yaptıklarımız:
1. 🚀 **Groq AI ile zengin içerik** (miras haritası template-based)
2. 🔗 **Çift kaynak birleştirme** (Wikipedia + Wikidata)
3. 🎨 **Hugo static site** (daha hızlı)
4. 🔍 **Kaynak doğrulama sistemi** (critical data için)
5. 📝 **Review queue** (doğrulanamayan veriler için)

## 🛠️ Kullanım Örnekleri

### Tek Komutla Tüm Pipeline:
```bash
npm run full-pipeline
```

Bu komut:
1. Wikipedia'dan veri çeker
2. Wikidata'dan veri çeker
3. İkisini birleştirir
4. 10 test sayfası üretir (Groq AI ile)

### Manuel Kontrol:
```bash
# Sadece Wikidata
npm run fetch-wikidata

# Sadece Wikipedia
npm run fetch-wikipedia

# Birleştir
npm run merge-sources
```

## 💡 Öğrendiklerimiz

### 1. **SPARQL > REST API (doğal alanlar için)**
- Wikidata SPARQL tek sorguda her şeyi veriyor
- Wikipedia API sayfa sayfa gitmek gerekiyor

### 2. **Görsel = Wikimedia Commons**
- Repo şişirme
- Lisans sorunları yok
- Otomatik güncellenebilir

### 3. **Fuzzy Matching Önemli**
- İsimler her kaynakta farklı yazılıyor
- Normalizasyon şart
- Levenshtein distance işe yarıyor

### 4. **Review Queue Sistemi**
- Her veriyi otomatik üretme
- Kritik alanlar manuel onay
- Kalite > Miktar

## 🔮 Gelecek İyileştirmeler

Miras haritasından daha alınabilecekler:
- [ ] Multi-source image search (Google, Flickr, Unsplash)
- [ ] Image quality scoring
- [ ] Otomatik görsel seçimi
- [ ] PDF export özelliği

---

**Sonuç:** Miras haritası projesi, veri toplama konusunda harika bir referans oldu. Wikidata SPARQL kullanımı ve retry mekanizmaları bize çok şey kattı. 🙏
