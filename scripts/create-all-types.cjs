const fs = require('fs');
const path = require('path');

// Tüm alan türleri
const types = [
    { name: 'Ada', slug: 'ada', icon: '🏝️', description: 'Türkiye\'nin güzel adaları' },
    { name: 'Dağ', slug: 'dag', icon: '⛰️', description: 'Dağcılık ve trekking için ideal zirveler' },
    { name: 'Göl', slug: 'gol', icon: '🏞️', description: 'Doğal ve suni göller' },
    { name: 'Kanyon', slug: 'kanyon', icon: '🏔️', description: 'Muhteşem kanyon ve vadiler' },
    { name: 'Mağara', slug: 'magara', icon: '🕳️', description: 'Doğal mağaralar ve yeraltı güzellikleri' },
    { name: 'Milli Park', slug: 'milli-park', icon: '🌲', description: 'Koruma altındaki milli parklar' },
    { name: 'Tabiat Parkı', slug: 'tabiat-parki', icon: '🌳', description: 'Tabiat parkları ve yeşil alanlar' },
    { name: 'Şelale', slug: 'selale', icon: '💧', description: 'Doğal şelaleler' },
    { name: 'Plaj', slug: 'plaj', icon: '🏖️', description: 'Deniz kıyıları ve plajlar' },
    { name: 'Sulak Alan', slug: 'sulak-alan', icon: '🦆', description: 'Sulak alanlar ve bataklıklar' },
    { name: 'Tabiat Anıtı', slug: 'tabiat-aniti', icon: '🗿', description: 'Korunan tabiat anıtları' },
    { name: 'Jeopark', slug: 'jeopark', icon: '⛏️', description: 'Jeolojik önemi olan alanlar' },
    { name: 'Botanik Bahçesi', slug: 'botanik-bahcesi', icon: '🌺', description: 'Botanik bahçeleri ve arboretumlar' },
    { name: 'Kayak Merkezi', slug: 'kayak-merkezi', icon: '⛷️', description: 'Kış sporları ve kayak merkezleri' },
    { name: 'Kuş Cenneti', slug: 'kus-cenneti', icon: '🦅', description: 'Kuş gözlem noktaları' },
    { name: 'Orman', slug: 'orman', icon: '🌲', description: 'Orman alanları ve yeşil kuşaklar' },
    { name: 'Tepe', slug: 'tepe', icon: '🏔️', description: 'Tepeler ve panoramik manzara noktaları' },
    { name: 'Termal Kaynak', slug: 'termal-kaynak', icon: '♨️', description: 'Şifalı termal kaynaklar' },
    { name: 'Vadi', slug: 'vadi', icon: '🏞️', description: 'Vadiler ve dağ geçitleri' },
    { name: 'Yayla', slug: 'yayla', icon: '🏔️', description: 'Yaylalar ve yayla turizmi' }
];

const outputDir = path.join(__dirname, '..', 'content', 'turler');

// Her tür için klasör ve _index.md oluştur
types.forEach(type => {
    const typeDir = path.join(outputDir, type.slug);

    // Klasör oluştur
    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }

    // _index.md dosyası oluştur
    const indexPath = path.join(typeDir, '_index.md');

    // Eğer dosya zaten varsa atla
    if (fs.existsSync(indexPath)) {
        console.log(`⏭️  Atlandı (zaten var): ${type.name}`);
        return;
    }

    const content = `---
title: "${type.name}"
date: "${new Date().toISOString()}"
draft: false
tur: "${type.slug}"
description: "${type.description}. Türkiye'deki en güzel ${type.name.toLowerCase()} alanlarını keşfedin."
keywords: ["${type.name}", "${type.slug}", "doğa", "gezi", "turizm", "Türkiye"]
icon: "${type.icon}"
---

# ${type.name}

${type.description}. Bu sayfada Türkiye'deki tüm ${type.name.toLowerCase()} alanlarını listeledik. Her bir ${type.name.toLowerCase()} hakkında detaylı bilgi almak için kartlara tıklayabilirsiniz.

## Türkiye'deki ${type.name} Alanları

Aşağıda Türkiye'nin çeşitli bölgelerinde yer alan ${type.name.toLowerCase()} alanlarını bulabilirsiniz.
`;

    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log(`✅ Oluşturuldu: ${type.name}`);
});

console.log(`\n✨ ${types.length} tür sayfası işlendi!`);
