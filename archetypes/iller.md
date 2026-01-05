---
title: "{{ replace .Name "-" " " | title }} Doğal Alanları"
date: {{ .Date }}
draft: false

type: "il"
bolge: "" # marmara, ege, akdeniz, ic-anadolu, karadeniz, dogu-anadolu, guneydogu-anadolu
plaka_kodu: 0

# İstatistikler (otomatik hesaplanacak)
stats:
  toplam_alan_sayisi: 0
  milli_park_sayisi: 0
  tabiat_parki_sayisi: 0
  diger_alanlar: 0

# Coğrafi Bilgiler
cografya:
  yuzolcumu_km2: 0
  nufus: 0
  iklim: ""
  yukseklik_min: 0
  yukseklik_max: 0

# SEO
description: ""
keywords: []

---

## {{ .Title }} Hakkında

[İlin doğal güzellikleri, coğrafi özellikleri, genel tanıtım]

## Öne Çıkan Doğal Alanlar

[En popüler 5-10 alan için kısa tanıtımlar ve linkler - otomatik üretilecek]

## İlçelere Göre Alanlar

[İlçe bazlı gruplandırma - otomatik üretilecek]

## Aktivite Türlerine Göre

[Kamp, yürüyüş vs. gruplandırma - otomatik üretilecek]
