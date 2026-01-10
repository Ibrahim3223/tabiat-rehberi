---
title: "Veri Kaynakları - Tabiat Rehberi"
description: "Tabiat Rehberi'nde kullanılan veri kaynakları, metodoloji ve referanslar. Güvenilir ve doğrulanmış bilgi için resmi kaynakları nasıl kullandığımızı öğrenin."
keywords: ["tabiat rehberi kaynaklar", "doğal alan verileri", "türkiye milli parklar veri", "wikidata türkiye"]
date: 2024-01-01
draft: false
type: "page"
---

## Veri Kaynakları ve Metodoloji

Tabiat Rehberi, **güvenilirlik ve şeffaflık** ilkeleri üzerine kurulmuştur. Sunduğumuz tüm bilgilerin kaynağını açıkça belirtir ve düzenli olarak güncelleriz.

---

## Birincil Veri Kaynakları

### 1. T.C. Tarım ve Orman Bakanlığı

**Doğa Koruma ve Milli Parklar Genel Müdürlüğü (DKMP)**

Türkiye'deki tüm korunan alanların resmi kaynağı:

- **Milli Parklar**: 47 adet milli park
- **Tabiat Parkları**: 250+ tabiat parkı
- **Tabiat Anıtları**: 100+ tabiat anıtı
- **Yaban Hayatı Geliştirme Sahaları**: Koruma alanları
- **Sulak Alanlar**: Ramsar sözleşmesi kapsamındaki alanlar

**Kaynak URL**: [milliparklar.gov.tr](https://www.milliparklar.gov.tr)

**Kullanılan Veriler**:
- Alan adları ve resmi sınıflandırmalar
- Kuruluş tarihleri ve yasal statüler
- Toplam alan büyüklükleri
- Koruma amaçları ve hedefleri

### 2. Wikidata

**Yapılandırılmış Açık Veri Kaynağı**

Wikidata, Wikipedia'nın yapılandırılmış veri deposudur ve küresel bir topluluk tarafından sürekli güncellenir:

- **QID Tanımlayıcıları**: Her alan için benzersiz tanımlayıcı
- **Koordinat Verileri**: GPS enlem ve boylam bilgileri
- **Sınıflandırma**: Alan türü ve kategorileri
- **Bağlantılı Veriler**: Wikipedia, OpenStreetMap ve diğer kaynaklar

**Kaynak URL**: [wikidata.org](https://www.wikidata.org)

**SPARQL Sorguları**: Otomatik veri çekimi için SPARQL endpoint kullanıyoruz.

### 3. Wikipedia

**Türkçe ve İngilizce Wikipedia**

Detaylı açıklamalar ve tarihsel bilgiler için Wikipedia makalelerinden yararlanıyoruz:

- Alanların tarihçesi
- Jeolojik ve coğrafi özellikler
- Flora ve fauna bilgileri
- Kültürel ve tarihi önem

**Lisans**: Creative Commons Attribution-ShareAlike (CC BY-SA)

### 4. Wikimedia Commons

**Görsel Kaynağı**

Tüm görseller Wikimedia Commons'tan alınmaktadır:

- Yüksek çözünürlüklü fotoğraflar
- Creative Commons lisanslı görseller
- Fotoğrafçı kredileri

**Kaynak URL**: [commons.wikimedia.org](https://commons.wikimedia.org)

---

## İkincil Veri Kaynakları

### T.C. Kültür ve Turizm Bakanlığı

- Turistik bilgiler ve ziyaret rehberleri
- Konaklama ve ulaşım bilgileri
- Kültürel miras alanları

### Yerel Yönetimler

- İl ve ilçe bazlı detaylı bilgiler
- Güncel giriş ücretleri ve çalışma saatleri
- Yerel etkinlikler ve festivaller

### Akademik Yayınlar

- Jeoloji ve ekoloji araştırmaları
- Biyoçeşitlilik envanterleri
- Çevresel etki değerlendirmeleri

### OpenStreetMap

- Harita verileri ve rotalar
- Yol ve patika bilgileri
- Tesis konumları

---

## Veri Toplama Metodolojisi

### Otomatik Veri Çekimi

1. **Wikidata SPARQL Sorguları**: Türkiye'deki doğal alanların yapılandırılmış verilerini çekiyoruz
2. **Wikipedia API**: Alan açıklamaları ve ek bilgiler
3. **Wikimedia Commons API**: İlgili görseller ve fotoğraflar

### Veri Doğrulama

Her veri noktası aşağıdaki kontrollere tabi tutulur:

- **Kaynak doğrulama**: Birden fazla kaynaktan çapraz kontrol
- **Güncellik kontrolü**: Son güncelleme tarihi takibi
- **Tutarlılık kontrolü**: Koordinat ve konum bilgilerinin doğruluğu
- **Kalite kontrolü**: İçerik kalitesi ve doğruluk değerlendirmesi

### Veri Güncelleme Döngüsü

| Veri Türü | Güncelleme Sıklığı |
|-----------|-------------------|
| Temel alan bilgileri | Aylık |
| Koordinat verileri | 3 ayda bir |
| Giriş ücretleri | Sezon başında |
| Görseller | Sürekli |
| İçerik güncellemeleri | Haftalık |

---

## Veri Kalitesi Standartları

### Doğruluk

- Her bilgi en az iki bağımsız kaynaktan doğrulanır
- Çelişkili bilgilerde resmi kaynak önceliklidir
- Belirsiz bilgiler "tahmini" veya "yaklaşık" olarak işaretlenir

### Güncellik

- Mevsimsel bilgiler (ücret, saat) yılda en az iki kez güncellenir
- Kullanıcı bildirimleri 48 saat içinde değerlendirilir
- Önemli değişiklikler (kapanış, yenileme) acil olarak güncellenir

### Tamlık

- Her alan için minimum veri seti tanımlanmıştır
- Eksik veriler açıkça belirtilir
- Veri tamamlama öncelik sırasına göre yapılır

### Tutarlılık

- Tüm alanlarda standart format kullanılır
- Terimler ve kategoriler tutarlı şekilde uygulanır
- Ölçü birimleri standartlaştırılmıştır

---

## API ve Veri Erişimi

### Açık Veri Politikası

Tabiat Rehberi verileri, uygun atıf yapılması koşuluyla kullanıma açıktır:

**Atıf Formatı**:
```
Kaynak: Tabiat Rehberi (tabiatrehberi.com), [Erişim Tarihi]
```

### Veri İndirme

*(Yakında aktif olacak özellikler)*

- JSON formatında alan verileri
- CSV formatında liste verileri
- GeoJSON formatında koordinat verileri

---

## Katkı ve Düzeltme

### Kullanıcı Katkıları

Bilgi güncellemeleri ve düzeltmeler için:

1. Hata veya eksikliği tespit edin
2. Doğru bilgiyi kaynak göstererek bildirin
3. Ekibimiz bilgiyi doğrular ve günceller
4. Katkınız sayfa tarihçesinde kaydedilir

### Kurumsal Katkılar

Resmi kurumlar ve STK'lar için özel veri güncelleme kanalları mevcuttur. İşbirliği için [İletişim](/iletisim/) sayfasını ziyaret edin.

---

## Lisans ve Telif

### Site İçeriği

- **Metin içerikler**: CC BY-SA 4.0 lisansı altında
- **Görseller**: Kaynak lisanslarına tabidir (genellikle CC BY-SA)
- **Veriler**: Açık veri politikası kapsamında

### Kaynak Atıfları

Her alan sayfasında kullanılan kaynaklar "Kaynaklar" bölümünde listelenir:

- Wikipedia makaleleri
- Resmi kurum web siteleri
- Akademik yayınlar
- Diğer referanslar

---

## Sorumluluk Reddi

Tabiat Rehberi, sunulan bilgilerin doğruluğu için azami özeni gösterir, ancak:

- Bilgiler zaman içinde değişebilir
- Resmi bilgiler için ilgili kurumlarla teyit önerilir
- Giriş ücretleri ve saatler değişiklik gösterebilir
- Ulaşım koşulları mevsime göre farklılık gösterebilir

Güncel ve resmi bilgi için her zaman ilgili kurumları kontrol etmenizi öneririz.

---

## Referanslar ve Bağlantılar

### Resmi Kurumlar

- [Doğa Koruma ve Milli Parklar Genel Müdürlüğü](https://www.milliparklar.gov.tr)
- [T.C. Kültür ve Turizm Bakanlığı](https://www.ktb.gov.tr)
- [Çevre, Şehircilik ve İklim Değişikliği Bakanlığı](https://csb.gov.tr)

### Açık Veri Kaynakları

- [Wikidata](https://www.wikidata.org)
- [Wikipedia Türkçe](https://tr.wikipedia.org)
- [Wikimedia Commons](https://commons.wikimedia.org)
- [OpenStreetMap](https://www.openstreetmap.org)

### Araştırma Kaynakları

- TÜBİTAK araştırma projeleri
- Üniversite yayınları
- Uluslararası koruma kuruluşları (IUCN, WWF, vb.)

---

*Son güncelleme: 2024*
