const fs = require('fs');
const path = require('path');

// Türkiye'nin 81 ili (alfabetik sıra)
const provinces = [
    { name: 'Adana', region: 'Akdeniz', slug: 'adana' },
    { name: 'Adıyaman', region: 'Güneydoğu Anadolu', slug: 'adiyaman' },
    { name: 'Afyonkarahisar', region: 'Ege', slug: 'afyonkarahisar' },
    { name: 'Ağrı', region: 'Doğu Anadolu', slug: 'agri' },
    { name: 'Aksaray', region: 'İç Anadolu', slug: 'aksaray' },
    { name: 'Amasya', region: 'Karadeniz', slug: 'amasya' },
    { name: 'Ankara', region: 'İç Anadolu', slug: 'ankara' },
    { name: 'Antalya', region: 'Akdeniz', slug: 'antalya' },
    { name: 'Ardahan', region: 'Doğu Anadolu', slug: 'ardahan' },
    { name: 'Artvin', region: 'Karadeniz', slug: 'artvin' },
    { name: 'Aydın', region: 'Ege', slug: 'aydin' },
    { name: 'Balıkesir', region: 'Marmara', slug: 'balikesir' },
    { name: 'Bartın', region: 'Karadeniz', slug: 'bartin' },
    { name: 'Batman', region: 'Güneydoğu Anadolu', slug: 'batman' },
    { name: 'Bayburt', region: 'Karadeniz', slug: 'bayburt' },
    { name: 'Bilecik', region: 'Marmara', slug: 'bilecik' },
    { name: 'Bingöl', region: 'Doğu Anadolu', slug: 'bingol' },
    { name: 'Bitlis', region: 'Doğu Anadolu', slug: 'bitlis' },
    { name: 'Bolu', region: 'Karadeniz', slug: 'bolu' },
    { name: 'Burdur', region: 'Akdeniz', slug: 'burdur' },
    { name: 'Bursa', region: 'Marmara', slug: 'bursa' },
    { name: 'Çanakkale', region: 'Marmara', slug: 'canakkale' },
    { name: 'Çankırı', region: 'İç Anadolu', slug: 'cankiri' },
    { name: 'Çorum', region: 'Karadeniz', slug: 'corum' },
    { name: 'Denizli', region: 'Ege', slug: 'denizli' },
    { name: 'Diyarbakır', region: 'Güneydoğu Anadolu', slug: 'diyarbakir' },
    { name: 'Düzce', region: 'Karadeniz', slug: 'duzce' },
    { name: 'Edirne', region: 'Marmara', slug: 'edirne' },
    { name: 'Elazığ', region: 'Doğu Anadolu', slug: 'elazig' },
    { name: 'Erzincan', region: 'Doğu Anadolu', slug: 'erzincan' },
    { name: 'Erzurum', region: 'Doğu Anadolu', slug: 'erzurum' },
    { name: 'Eskişehir', region: 'İç Anadolu', slug: 'eskisehir' },
    { name: 'Gaziantep', region: 'Güneydoğu Anadolu', slug: 'gaziantep' },
    { name: 'Giresun', region: 'Karadeniz', slug: 'giresun' },
    { name: 'Gümüşhane', region: 'Karadeniz', slug: 'gumushane' },
    { name: 'Hakkari', region: 'Doğu Anadolu', slug: 'hakkari' },
    { name: 'Hatay', region: 'Akdeniz', slug: 'hatay' },
    { name: 'Iğdır', region: 'Doğu Anadolu', slug: 'igdir' },
    { name: 'Isparta', region: 'Akdeniz', slug: 'isparta' },
    { name: 'İstanbul', region: 'Marmara', slug: 'istanbul' },
    { name: 'İzmir', region: 'Ege', slug: 'izmir' },
    { name: 'Kahramanmaraş', region: 'Akdeniz', slug: 'kahramanmaras' },
    { name: 'Karabük', region: 'Karadeniz', slug: 'karabuk' },
    { name: 'Karaman', region: 'İç Anadolu', slug: 'karaman' },
    { name: 'Kars', region: 'Doğu Anadolu', slug: 'kars' },
    { name: 'Kastamonu', region: 'Karadeniz', slug: 'kastamonu' },
    { name: 'Kayseri', region: 'İç Anadolu', slug: 'kayseri' },
    { name: 'Kilis', region: 'Güneydoğu Anadolu', slug: 'kilis' },
    { name: 'Kırıkkale', region: 'İç Anadolu', slug: 'kirikkale' },
    { name: 'Kırklareli', region: 'Marmara', slug: 'kirklareli' },
    { name: 'Kırşehir', region: 'İç Anadolu', slug: 'kirsehir' },
    { name: 'Kocaeli', region: 'Marmara', slug: 'kocaeli' },
    { name: 'Konya', region: 'İç Anadolu', slug: 'konya' },
    { name: 'Kütahya', region: 'Ege', slug: 'kutahya' },
    { name: 'Malatya', region: 'Doğu Anadolu', slug: 'malatya' },
    { name: 'Manisa', region: 'Ege', slug: 'manisa' },
    { name: 'Mardin', region: 'Güneydoğu Anadolu', slug: 'mardin' },
    { name: 'Mersin', region: 'Akdeniz', slug: 'mersin' },
    { name: 'Muğla', region: 'Ege', slug: 'mugla' },
    { name: 'Muş', region: 'Doğu Anadolu', slug: 'mus' },
    { name: 'Nevşehir', region: 'İç Anadolu', slug: 'nevsehir' },
    { name: 'Niğde', region: 'İç Anadolu', slug: 'nigde' },
    { name: 'Ordu', region: 'Karadeniz', slug: 'ordu' },
    { name: 'Osmaniye', region: 'Akdeniz', slug: 'osmaniye' },
    { name: 'Rize', region: 'Karadeniz', slug: 'rize' },
    { name: 'Sakarya', region: 'Marmara', slug: 'sakarya' },
    { name: 'Samsun', region: 'Karadeniz', slug: 'samsun' },
    { name: 'Şanlıurfa', region: 'Güneydoğu Anadolu', slug: 'sanliurfa' },
    { name: 'Siirt', region: 'Güneydoğu Anadolu', slug: 'siirt' },
    { name: 'Sinop', region: 'Karadeniz', slug: 'sinop' },
    { name: 'Şırnak', region: 'Güneydoğu Anadolu', slug: 'sirnak' },
    { name: 'Sivas', region: 'İç Anadolu', slug: 'sivas' },
    { name: 'Tekirdağ', region: 'Marmara', slug: 'tekirdag' },
    { name: 'Tokat', region: 'Karadeniz', slug: 'tokat' },
    { name: 'Trabzon', region: 'Karadeniz', slug: 'trabzon' },
    { name: 'Tunceli', region: 'Doğu Anadolu', slug: 'tunceli' },
    { name: 'Uşak', region: 'Ege', slug: 'usak' },
    { name: 'Van', region: 'Doğu Anadolu', slug: 'van' },
    { name: 'Yalova', region: 'Marmara', slug: 'yalova' },
    { name: 'Yozgat', region: 'İç Anadolu', slug: 'yozgat' },
    { name: 'Zonguldak', region: 'Karadeniz', slug: 'zonguldak' }
];

const outputDir = path.join(__dirname, '..', 'content', 'iller');

// Her il için klasör ve _index.md oluştur
provinces.forEach(province => {
    const provinceDir = path.join(outputDir, province.slug);

    // Klasör oluştur
    if (!fs.existsSync(provinceDir)) {
        fs.mkdirSync(provinceDir, { recursive: true });
    }

    // _index.md dosyası oluştur
    const indexPath = path.join(provinceDir, '_index.md');

    // Eğer dosya zaten varsa atla
    if (fs.existsSync(indexPath)) {
        console.log(`⏭️  Atlandı (zaten var): ${province.name}`);
        return;
    }

    const content = `---
title: "${province.name}"
date: "${new Date().toISOString()}"
draft: false
il: "${province.name}"
bolge: "${province.region}"
description: "${province.name}'daki doğal güzellikleri ve gezilecek yerleri keşfedin. ${province.region} Bölgesi'nin incisi ${province.name}, tarihi ve doğal zenginlikleriyle ziyaretçilerini bekliyor."
keywords: ["${province.name}", "${province.region}", "gezi", "tatil", "doğa", "turizm"]
---

# ${province.name}

${province.region} Bölgesi'nde yer alan ${province.name}, doğal güzellikleri ve tarihi zenginlikleriyle Türkiye'nin önemli illerinden biridir. ${province.name}'da gezilecek çok sayıda doğal alan, milli park, tabiat parkı ve tarihi mekan bulunmaktadır.

## ${province.name}'da Gezilecek Yerler

${province.name}'daki doğal alanları ve gezilecek yerleri aşağıda keşfedebilirsiniz.
`;

    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log(`✅ Oluşturuldu: ${province.name}`);
});

console.log(`\n✨ ${provinces.length} il sayfası işlendi!`);
