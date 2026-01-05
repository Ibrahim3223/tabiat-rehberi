# Master Lists (Seed Data)

Bu klasör, içerik üretimi için kullanılacak temel veri listelerini içerir.

## Dosya Yapısı

- `milli-parklar.json` - Türkiye'deki tüm milli parklar
- `tabiat-parklari.json` - Türkiye'deki tüm tabiat parkları
- `tabiat-anıtları.json` - Türkiye'deki tüm tabiat anıtları
- `kanyonlar.json` - Kanyonlar
- `selaleler.json` - Şelaleler
- `magaralar.json` - Mağaralar
- `goller.json` - Göller
- `plajlar.json` - Doğal plajlar
- `yaylalar.json` - Yaylalar
- `ormanlik-alanlar.json` - Ormanlık rekreasyon alanları
- `sulak-alanlar.json` - Sulak alanlar ve kuş gözlem alanları
- `kamp-alanlari.json` - Resmi kamp alanları

## Veri Formatı

Her JSON dosyası şu formatta olmalı:

```json
{
  "meta": {
    "kaynak": "Kaynak bilgisi",
    "guncelleme_tarihi": "2024-01-01",
    "toplam_sayi": 100
  },
  "alanlar": [
    {
      "id": "unique-slug",
      "ad": "Alan Adı",
      "tur": "milli-park",
      "il": "İl Adı",
      "ilce": "İlçe Adı",
      "bolge": "marmara",
      "koordinat": {
        "lat": 40.123,
        "lon": 29.456
      },
      "olasi_kaynaklar": [
        "https://resmi-kaynak.gov.tr",
        "https://wikipedia.org/wiki/..."
      ],
      "notlar": "Ek notlar"
    }
  ]
}
```

## Veri Toplama Kaynakları

1. **Resmi Kaynaklar:**
   - DKMP (Doğa Koruma ve Milli Parklar): https://www.tarimorman.gov.tr/DKMP
   - Kültür ve Turizm Bakanlığı

2. **Wikipedia/Wikidata:**
   - Türkiye'deki milli parklar listesi
   - Tabiat parkları listesi
   - Coğrafi veriler

3. **Akademik Kaynaklar:**
   - Üniversite araştırmaları
   - Jeoloji ve coğrafya makaleleri

## Kullanım

Bu listeler, `scripts/generate-content.js` tarafından okunarak otomatik içerik üretimi için kullanılır.
