const fs = require('fs');
const path = require('path');

// 10 test alanı
const testAreas = [
    {
        id: 'pamukkale',
        title: 'Pamukkale',
        il: 'Denizli',
        ilce: 'Pamukkale',
        tur: 'tabiat-aniti',
        lat: 37.9204,
        lon: 29.1210,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Pamukkale%2C_Denizli.jpg/1280px-Pamukkale%2C_Denizli.jpg',
        description: 'Beyaz travertenleri ve termal suları ile ünlü doğal güzellik.'
    },
    {
        id: 'kapadokya',
        title: 'Kapadokya',
        il: 'Nevşehir',
        ilce: 'Göreme',
        tur: 'tabiat-parki',
        lat: 38.6431,
        lon: 34.8286,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/G%C3%B6reme_Panorama.jpg/1280px-G%C3%B6reme_Panorama.jpg',
        description: 'Peri bacaları ve yeraltı şehirleriyle dünyaca ünlü bölge.'
    },
    {
        id: 'olympos',
        title: 'Olympos Milli Parkı',
        il: 'Antalya',
        ilce: 'Kumluca',
        tur: 'milli-park',
        lat: 36.3989,
        lon: 30.4744,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Olympos_Beach.jpg/1280px-Olympos_Beach.jpg',
        description: 'Antik kent kalıntıları ve muhteşem doğası ile ünlü milli park.'
    },
    {
        id: 'sumela-manastiri',
        title: 'Sümela Manastırı',
        il: 'Trabzon',
        ilce: 'Maçka',
        tur: 'tabiat-parki',
        lat: 40.6903,
        lon: 39.6586,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Sumela_edit.jpg/1280px-Sumela_edit.jpg',
        description: 'Dağın yamacına inşa edilmiş tarihi manastır ve doğal güzellikler.'
    },
    {
        id: 'uzungol',
        title: 'Uzungöl',
        il: 'Trabzon',
        ilce: 'Çaykara',
        tur: 'gol',
        lat: 40.6186,
        lon: 40.2961,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Uzung%C3%B6l.jpg/1280px-Uzung%C3%B6l.jpg',
        description: 'Karadeniz\'in incisi, muhteşem doğal göl.'
    },
    {
        id: 'salda-golu',
        title: 'Salda Gölü',
        il: 'Burdur',
        ilce: 'Yeşilova',
        tur: 'gol',
        lat: 37.5456,
        lon: 29.6914,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Salda_G%C3%B6l%C3%BC_2.jpg/1280px-Salda_G%C3%B6l%C3%BC_2.jpg',
        description: 'Türkiye\'nin Maldivleri olarak bilinen beyaz kumlu göl.'
    },
    {
        id: 'safranbolu',
        title: 'Safranbolu',
        il: 'Karabük',
        ilce: 'Safranbolu',
        tur: 'tabiat-parki',
        lat: 41.2500,
        lon: 32.6667,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Safranbolu_old_town.jpg/1280px-Safranbolu_old_town.jpg',
        description: 'UNESCO Dünya Mirası listesindeki tarihi kasaba.'
    },
    {
        id: 'oludeniz',
        title: 'Ölüdeniz',
        il: 'Muğla',
        ilce: 'Fethiye',
        tur: 'plaj',
        lat: 36.5500,
        lon: 29.1167,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/%C3%96l%C3%BCdeniz%2C_T%C3%BCrkiye.jpg/1280px-%C3%96l%C3%BCdeniz%2C_T%C3%BCrkiye.jpg',
        description: 'Turkuvaz mavisi denizi ve kumu ile dünyaca ünlü plaj.'
    },
    {
        id: 'koprulu-kanyon',
        title: 'Köprülü Kanyon',
        il: 'Antalya',
        ilce: 'Manavgat',
        tur: 'kanyon',
        lat: 37.2167,
        lon: 31.1333,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/K%C3%B6pr%C3%BCl%C3%BC_Kanyon.jpg/1280px-K%C3%B6pr%C3%BCl%C3%BC_Kanyon.jpg',
        description: 'Rafting ve doğa yürüyüşü için ideal muhteşem kanyon.'
    },
    {
        id: 'nemrut-dagi',
        title: 'Nemrut Dağı',
        il: 'Adıyaman',
        ilce: 'Kahta',
        tur: 'milli-park',
        lat: 37.9800,
        lon: 38.7411,
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Mount_Nemrut.jpg/1280px-Mount_Nemrut.jpg',
        description: 'Dev heykelleri ve gün doğumu manzarasıyla ünlü tarihi dağ.'
    }
];

const outputDir = path.join(__dirname, '..', 'content', 'alanlar');

testAreas.forEach(area => {
    const content = \`---
title: "\${area.title}"
date: "\${new Date().toISOString()}"
draft: false
type: "alan"
alan_turu: "\${area.tur}"
il: "\${area.il}"
ilce: "\${area.ilce}"
bolge: "\${area.il}"
koordinat:
  lat: \${area.lat}
  lon: \${area.lon}
ziyaret:
  en_iyi_donem: "İlkbahar ve Sonbahar"
  zorluk: "Kolay"
  tahmini_sure: "Günlük"
aktiviteler: ["doğa yürüyüşü", "fotoğrafçılık", "piknik"]
images:
  hero:
    url: "\${area.image}"
    alt: "\${area.title} manzarası"
    credit: "Wikimedia Commons"
    license: "CC BY-SA"
description: "\${area.description}"
keywords: ["\${area.title}", "\${area.il}", "Türkiye", "doğa", "gezi"]
schema_type: "TouristAttraction"
---

# \${area.title}

\${area.description}

\${area.title}, \${area.il}'in \${area.ilce} ilçesinde yer alan muhteşem bir doğal güzelliktir. Türkiye'nin en çok ziyaret edilen yerlerinden biri olan \${area.title}, doğa severlerin ve fotoğraf tutkunlarının vazgeçilmez uğrak noktalarından biridir.

## Konum

\${area.title}, \${area.il} ili \${area.ilce} ilçesinde \${area.lat.toFixed(4)}°K, \${area.lon.toFixed(4)}°D koordinatlarında konumlanmaktadır.

## Ziyaret Bilgileri

**En İyi Ziyaret Dönemi:** İlkbahar ve Sonbahar ayları ideal ziyaret zamanıdır. Yaz aylarında da ziyaret edilebilir ancak sıcaklar yoğun olabilir.

**Aktiviteler:** Doğa yürüyüşü, fotoğrafçılık ve piknik yapabilirsiniz.

**Zorluk Seviyesi:** Kolay - Her yaştan ziyaretçi için uygundur.

## Nasıl Gidilir

\${area.title}'e \${area.il} şehir merkezinden \${area.ilce} yönüne giderek ulaşabilirsiniz. Özel araç veya toplu taşıma seçenekleri mevcuttur.

## Öneriler

- Rahat yürüyüş ayakkabıları giyin
- Bol su ve hafif atıştırmalıklar yanınızda bulundurun
- Fotoğraf makinenizi unutmayın
- Çevre temizliğine dikkat edin
\`;

    const filepath = path.join(outputDir, \`\${area.id}.md\`);
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(\`✅ \${area.title} oluşturuldu\`);
});

console.log(\`\n✨ \${testAreas.length} test alanı başarıyla oluşturuldu!\`);
