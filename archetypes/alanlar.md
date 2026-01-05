---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: false

# Temel Bilgiler
type: "alan"
alan_turu: "" # milli-park, tabiat-parki, tabiat-aniti, kanyon, selalesi, magara, gol, plaj, yayla, ormanlik, kamp-alani, sulak-alan
il: ""
ilce: ""
bolge: "" # marmara, ege, akdeniz, ic-anadolu, karadeniz, dogu-anadolu, guneydogu-anadolu

# Konum
coordinates:
  lat: 0.0
  lon: 0.0

# Ziyaret Bilgileri
ziyaret:
  en_iyi_donem: "" # ilkbahar, yaz, sonbahar, kis, yil-boyu
  zorluk: "" # kolay, orta, zor
  bebek_arabasi_uygun: false
  engelli_erisimi: false

# Giriş Bilgileri (KRİTİK - sadece doğrulanmış bilgi!)
giris:
  ucret:
    yetiskin: "" # örn: "50 TL" veya "Ücretsiz" veya "Bilinmiyor"
    cocuk: ""
    arac: ""
    notlar: ""
  saatler:
    acilis: ""
    kapanis: ""
    kapali_gunler: []
    sezonluk_degisiklik: ""
  son_dogrulama: "" # YYYY-MM-DD formatında
  dogrulanmadi: false # Eğer bilgi bulunamadıysa true yap

# Aktiviteler
aktiviteler: [] # kamp, yuruyus, piknik, fotografcilik, kus-gozlemi, tirmanis, su-sporlari, kis-sporlari

# Tesisler
tesisler:
  wc: false
  cesme: false
  piknik_masasi: false
  ziyaretci_merkezi: false
  kamp_alani: false
  otopark: false
  restoran: false
  konaklama: false

# Ulaşım
ulasim:
  en_yakin_sehir: ""
  mesafe_km: 0
  yol_tipi: "" # asfalt, stabilize, toprak
  toplu_tasima: false
  kis_kosullari_uyari: ""

# Görseller (Wikimedia Commons veya güvenilir kaynaklardan)
images:
  hero:
    url: ""
    alt: ""
    credit: ""
    license: ""
  gallery: []
#    - url: ""
#      alt: ""
#      credit: ""
#      license: ""

# Kaynaklar (EN AZ 2 KAYNAK ZORUNLU!)
kaynaklar: []
#  - title: "Kaynak Başlığı"
#    url: "https://..."
#    tip: "resmi" # resmi, akademik, rehber, medya
#    erisim_tarihi: "2024-01-01"

# SEO
description: ""
keywords: []

# Şema
schema_type: "TouristAttraction" # TouristAttraction, Park, NaturalFeature

---

## Kısa Özet

[1-2 paragraf, net ve bilgi yoğun giriş]

## Öne Çıkanlar

- [Görülecek/yapılacak şey 1]
- [Görülecek/yapılacak şey 2]
- [Görülecek/yapılacak şey 3]

## Rotalar

### [Rota Adı]
- **Mesafe:** X km
- **Süre:** X saat
- **Zorluk:** Kolay/Orta/Zor
- **Başlangıç Noktası:**

## Kurallar & Güvenlik

-
-

## Yakınındaki Alanlar

[Otomatik olarak aynı il ve türdeki alanlardan linkler üretilecek]
