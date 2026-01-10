/**
 * İl-İlçe Düzeltme Scripti
 *
 * Sorun: 254 ada "il: Türkiye" olarak işaretlenmiş, doğru il bilgisi yok
 * Çözüm: İlçe bilgisinden il bilgisini otomatik belirle
 *
 * Kullanım: node scripts/fix-il-ilce.cjs
 */

const fs = require('fs');
const path = require('path');

const MASTER_LISTS_DIR = path.join(__dirname, '..', 'data', 'master-lists');

// Bölge haritası
const IL_BOLGE_MAP = {
  'Adana': 'Akdeniz', 'Adıyaman': 'Güneydoğu Anadolu', 'Afyonkarahisar': 'Ege',
  'Ağrı': 'Doğu Anadolu', 'Aksaray': 'İç Anadolu', 'Amasya': 'Karadeniz',
  'Ankara': 'İç Anadolu', 'Antalya': 'Akdeniz', 'Ardahan': 'Doğu Anadolu',
  'Artvin': 'Karadeniz', 'Aydın': 'Ege', 'Balıkesir': 'Marmara',
  'Bartın': 'Karadeniz', 'Batman': 'Güneydoğu Anadolu', 'Bayburt': 'Karadeniz',
  'Bilecik': 'Marmara', 'Bingöl': 'Doğu Anadolu', 'Bitlis': 'Doğu Anadolu',
  'Bolu': 'Karadeniz', 'Burdur': 'Akdeniz', 'Bursa': 'Marmara',
  'Çanakkale': 'Marmara', 'Çankırı': 'İç Anadolu', 'Çorum': 'Karadeniz',
  'Denizli': 'Ege', 'Diyarbakır': 'Güneydoğu Anadolu', 'Düzce': 'Karadeniz',
  'Edirne': 'Marmara', 'Elazığ': 'Doğu Anadolu', 'Erzincan': 'Doğu Anadolu',
  'Erzurum': 'Doğu Anadolu', 'Eskişehir': 'İç Anadolu', 'Gaziantep': 'Güneydoğu Anadolu',
  'Giresun': 'Karadeniz', 'Gümüşhane': 'Karadeniz', 'Hakkari': 'Doğu Anadolu',
  'Hatay': 'Akdeniz', 'Iğdır': 'Doğu Anadolu', 'Isparta': 'Akdeniz',
  'İstanbul': 'Marmara', 'İzmir': 'Ege', 'Kahramanmaraş': 'Akdeniz',
  'Karabük': 'Karadeniz', 'Karaman': 'İç Anadolu', 'Kars': 'Doğu Anadolu',
  'Kastamonu': 'Karadeniz', 'Kayseri': 'İç Anadolu', 'Kilis': 'Güneydoğu Anadolu',
  'Kırıkkale': 'İç Anadolu', 'Kırklareli': 'Marmara', 'Kırşehir': 'İç Anadolu',
  'Kocaeli': 'Marmara', 'Konya': 'İç Anadolu', 'Kütahya': 'Ege',
  'Malatya': 'Doğu Anadolu', 'Manisa': 'Ege', 'Mardin': 'Güneydoğu Anadolu',
  'Mersin': 'Akdeniz', 'Muğla': 'Ege', 'Muş': 'Doğu Anadolu',
  'Nevşehir': 'İç Anadolu', 'Niğde': 'İç Anadolu', 'Ordu': 'Karadeniz',
  'Osmaniye': 'Akdeniz', 'Rize': 'Karadeniz', 'Sakarya': 'Marmara',
  'Samsun': 'Karadeniz', 'Şanlıurfa': 'Güneydoğu Anadolu', 'Siirt': 'Güneydoğu Anadolu',
  'Sinop': 'Karadeniz', 'Sivas': 'İç Anadolu', 'Şırnak': 'Güneydoğu Anadolu',
  'Tekirdağ': 'Marmara', 'Tokat': 'Karadeniz', 'Trabzon': 'Karadeniz',
  'Tunceli': 'Doğu Anadolu', 'Uşak': 'Ege', 'Van': 'Doğu Anadolu',
  'Yalova': 'Marmara', 'Yozgat': 'İç Anadolu', 'Zonguldak': 'Karadeniz'
};

// Türkiye'deki tüm ilçe-il eşleşmeleri (kapsamlı)
const ILCE_IL_MAP = {
  // İstanbul
  'Adalar': 'İstanbul',
  'Arnavutköy': 'İstanbul',
  'Ataşehir': 'İstanbul',
  'Avcılar': 'İstanbul',
  'Bağcılar': 'İstanbul',
  'Bahçelievler': 'İstanbul',
  'Bakırköy': 'İstanbul',
  'Başakşehir': 'İstanbul',
  'Bayrampaşa': 'İstanbul',
  'Beşiktaş': 'İstanbul',
  'Beykoz': 'İstanbul',
  'Beylikdüzü': 'İstanbul',
  'Beyoğlu': 'İstanbul',
  'Büyükçekmece': 'İstanbul',
  'Çatalca': 'İstanbul',
  'Çekmeköy': 'İstanbul',
  'Esenler': 'İstanbul',
  'Esenyurt': 'İstanbul',
  'Eyüpsultan': 'İstanbul',
  'Fatih': 'İstanbul',
  'Gaziosmanpaşa': 'İstanbul',
  'Güngören': 'İstanbul',
  'Kadıköy': 'İstanbul',
  'Kağıthane': 'İstanbul',
  'Kartal': 'İstanbul',
  'Küçükçekmece': 'İstanbul',
  'Maltepe': 'İstanbul',
  'Pendik': 'İstanbul',
  'Sancaktepe': 'İstanbul',
  'Sarıyer': 'İstanbul',
  'Silivri': 'İstanbul',
  'Sultanbeyli': 'İstanbul',
  'Sultangazi': 'İstanbul',
  'Şile': 'İstanbul',
  'Şişli': 'İstanbul',
  'Tuzla': 'İstanbul',
  'Ümraniye': 'İstanbul',
  'Üsküdar': 'İstanbul',
  'Zeytinburnu': 'İstanbul',

  // Çanakkale
  'Ayvacık': 'Çanakkale',
  'Bayramiç': 'Çanakkale',
  'Biga': 'Çanakkale',
  'Bozcaada': 'Çanakkale',
  'Çan': 'Çanakkale',
  'Eceabat': 'Çanakkale',
  'Ezine': 'Çanakkale',
  'Gelibolu': 'Çanakkale',
  'Gökçeada': 'Çanakkale',
  'Lapseki': 'Çanakkale',
  'Yenice': 'Çanakkale',

  // Balıkesir
  'Altıeylül': 'Balıkesir',
  'Ayvalık': 'Balıkesir',
  'Balya': 'Balıkesir',
  'Bandırma': 'Balıkesir',
  'Bigadiç': 'Balıkesir',
  'Burhaniye': 'Balıkesir',
  'Dursunbey': 'Balıkesir',
  'Edremit': 'Balıkesir',
  'Erdek': 'Balıkesir',
  'Gömeç': 'Balıkesir',
  'Gönen': 'Balıkesir',
  'Havran': 'Balıkesir',
  'İvrindi': 'Balıkesir',
  'Karesi': 'Balıkesir',
  'Kepsut': 'Balıkesir',
  'Manyas': 'Balıkesir',
  'Marmara': 'Balıkesir',
  'Savaştepe': 'Balıkesir',
  'Sındırgı': 'Balıkesir',
  'Susurluk': 'Balıkesir',

  // İzmir
  'Aliağa': 'İzmir',
  'Balçova': 'İzmir',
  'Bayındır': 'İzmir',
  'Bayraklı': 'İzmir',
  'Bergama': 'İzmir',
  'Beydağ': 'İzmir',
  'Bornova': 'İzmir',
  'Buca': 'İzmir',
  'Çeşme': 'İzmir',
  'Çiğli': 'İzmir',
  'Dikili': 'İzmir',
  'Foça': 'İzmir',
  'Gaziemir': 'İzmir',
  'Güzelbahçe': 'İzmir',
  'Karabağlar': 'İzmir',
  'Karaburun': 'İzmir',
  'Karşıyaka': 'İzmir',
  'Kemalpaşa': 'İzmir',
  'Kınık': 'İzmir',
  'Kiraz': 'İzmir',
  'Konak': 'İzmir',
  'Menderes': 'İzmir',
  'Menemen': 'İzmir',
  'Narlıdere': 'İzmir',
  'Ödemiş': 'İzmir',
  'Seferihisar': 'İzmir',
  'Selçuk': 'İzmir',
  'Tire': 'İzmir',
  'Torbalı': 'İzmir',
  'Urla': 'İzmir',

  // Muğla
  'Bodrum': 'Muğla',
  'Dalaman': 'Muğla',
  'Datça': 'Muğla',
  'Fethiye': 'Muğla',
  'Kavaklıdere': 'Muğla',
  'Köyceğiz': 'Muğla',
  'Marmaris': 'Muğla',
  'Menteşe': 'Muğla',
  'Milas': 'Muğla',
  'Ortaca': 'Muğla',
  'Seydikemer': 'Muğla',
  'Ula': 'Muğla',
  'Yatağan': 'Muğla',

  // Antalya
  'Akseki': 'Antalya',
  'Aksu': 'Antalya',
  'Alanya': 'Antalya',
  'Demre': 'Antalya',
  'Döşemealtı': 'Antalya',
  'Elmalı': 'Antalya',
  'Finike': 'Antalya',
  'Gazipaşa': 'Antalya',
  'Gündoğmuş': 'Antalya',
  'İbradı': 'Antalya',
  'Kaş': 'Antalya',
  'Kemer': 'Antalya',
  'Kepez': 'Antalya',
  'Konyaaltı': 'Antalya',
  'Korkuteli': 'Antalya',
  'Kumluca': 'Antalya',
  'Manavgat': 'Antalya',
  'Muratpaşa': 'Antalya',
  'Serik': 'Antalya',

  // Tekirdağ
  'Çerkezköy': 'Tekirdağ',
  'Çorlu': 'Tekirdağ',
  'Ergene': 'Tekirdağ',
  'Hayrabolu': 'Tekirdağ',
  'Kapaklı': 'Tekirdağ',
  'Malkara': 'Tekirdağ',
  'Marmaraereğlisi': 'Tekirdağ',
  'Muratlı': 'Tekirdağ',
  'Saray': 'Tekirdağ',
  'Süleymanpaşa': 'Tekirdağ',
  'Şarköy': 'Tekirdağ',

  // Bursa
  'Büyükorhan': 'Bursa',
  'Gemlik': 'Bursa',
  'Gürsu': 'Bursa',
  'Harmancık': 'Bursa',
  'İnegöl': 'Bursa',
  'İznik': 'Bursa',
  'Karacabey': 'Bursa',
  'Keles': 'Bursa',
  'Kestel': 'Bursa',
  'Mudanya': 'Bursa',
  'Mustafakemalpaşa': 'Bursa',
  'Nilüfer': 'Bursa',
  'Orhaneli': 'Bursa',
  'Orhangazi': 'Bursa',
  'Osmangazi': 'Bursa',
  'Yenişehir': 'Bursa',
  'Yıldırım': 'Bursa',

  // Yalova
  'Altınova': 'Yalova',
  'Armutlu': 'Yalova',
  'Çiftlikköy': 'Yalova',
  'Çınarcık': 'Yalova',
  'Termal': 'Yalova',

  // Kocaeli
  'Başiskele': 'Kocaeli',
  'Çayırova': 'Kocaeli',
  'Darıca': 'Kocaeli',
  'Derince': 'Kocaeli',
  'Dilovası': 'Kocaeli',
  'Gebze': 'Kocaeli',
  'Gölcük': 'Kocaeli',
  'İzmit': 'Kocaeli',
  'Kandıra': 'Kocaeli',
  'Karamürsel': 'Kocaeli',
  'Kartepe': 'Kocaeli',
  'Körfez': 'Kocaeli',

  // Trabzon
  'Akçaabat': 'Trabzon',
  'Araklı': 'Trabzon',
  'Arsin': 'Trabzon',
  'Beşikdüzü': 'Trabzon',
  'Çarşıbaşı': 'Trabzon',
  'Çaykara': 'Trabzon',
  'Dernekpazarı': 'Trabzon',
  'Düzköy': 'Trabzon',
  'Hayrat': 'Trabzon',
  'Köprübaşı': 'Trabzon',
  'Maçka': 'Trabzon',
  'Of': 'Trabzon',
  'Ortahisar': 'Trabzon',
  'Sürmene': 'Trabzon',
  'Şalpazarı': 'Trabzon',
  'Tonya': 'Trabzon',
  'Vakfıkebir': 'Trabzon',
  'Yomra': 'Trabzon',

  // Mersin
  'Akdeniz': 'Mersin',
  'Anamur': 'Mersin',
  'Aydıncık': 'Mersin',
  'Bozyazı': 'Mersin',
  'Çamlıyayla': 'Mersin',
  'Erdemli': 'Mersin',
  'Gülnar': 'Mersin',
  'Mezitli': 'Mersin',
  'Mut': 'Mersin',
  'Silifke': 'Mersin',
  'Tarsus': 'Mersin',
  'Toroslar': 'Mersin',
  'Yenişehir': 'Mersin',

  // Artvin
  'Ardanuç': 'Artvin',
  'Arhavi': 'Artvin',
  'Borçka': 'Artvin',
  'Hopa': 'Artvin',
  'Murgul': 'Artvin',
  'Şavşat': 'Artvin',
  'Yusufeli': 'Artvin',

  // Rize
  'Ardeşen': 'Rize',
  'Çamlıhemşin': 'Rize',
  'Çayeli': 'Rize',
  'Derepazarı': 'Rize',
  'Fındıklı': 'Rize',
  'Güneysu': 'Rize',
  'Hemşin': 'Rize',
  'İkizdere': 'Rize',
  'İyidere': 'Rize',
  'Kalkandere': 'Rize',
  'Pazar': 'Rize',

  // Zonguldak
  'Alaplı': 'Zonguldak',
  'Çaycuma': 'Zonguldak',
  'Devrek': 'Zonguldak',
  'Ereğli': 'Zonguldak',
  'Gökçebey': 'Zonguldak',
  'Kilimli': 'Zonguldak',
  'Kozlu': 'Zonguldak'
};

console.log('🔧 İl-İlçe Düzeltme Scripti Başlatılıyor...\n');

let totalFixed = 0;
let totalProcessed = 0;
let filesModified = 0;
let notFound = [];

// Tüm merged dosyaları oku
const mergedFiles = fs.readdirSync(MASTER_LISTS_DIR)
  .filter(f => f.endsWith('-merged.json') && !f.includes('backup'));

console.log(`📁 ${mergedFiles.length} merged dosya bulundu\n`);

mergedFiles.forEach(fileName => {
  const filePath = path.join(MASTER_LISTS_DIR, fileName);
  const backupPath = filePath.replace('.json', '.backup-il-fix.json');

  try {
    // Dosyayı oku
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.alanlar || !Array.isArray(data.alanlar)) {
      console.log(`⚠️  ${fileName}: 'alanlar' dizisi yok, atlanıyor`);
      return;
    }

    let fixedInFile = 0;

    // Her alanı kontrol et
    data.alanlar.forEach(alan => {
      totalProcessed++;

      // Strateji 1: İl bilgisi yok/Türkiye ise ve ilçe bilgisi varsa düzelt
      if ((!alan.il || alan.il === 'Türkiye' || alan.il === '') && alan.ilce) {
        const oldIl = alan.il || '(boş)';

        // İlçeden il belirle
        let correctIl = ILCE_IL_MAP[alan.ilce];

        // İlçe bulunamadıysa, belki ilçe aslında il'dir (eski veri yapısı)
        if (!correctIl && IL_BOLGE_MAP[alan.ilce]) {
          correctIl = alan.ilce;
          alan.ilce = ''; // İlçe bilgisi yok artık
        }

        if (correctIl) {
          alan.il = correctIl;
          alan.bolge = IL_BOLGE_MAP[correctIl] || '';
          fixedInFile++;
          totalFixed++;
          console.log(`  ✅ ${alan.ad}: "${oldIl}" → "${correctIl}" (İlçe: ${alan.ilce || 'belirtilmedi'})`);
        } else {
          notFound.push({ alan: alan.ad, ilce: alan.ilce, file: fileName });
          console.log(`  ⚠️  ${alan.ad}: İlçe "${alan.ilce}" haritada bulunamadı!`);
        }
      }
    });

    // Düzeltme yapıldıysa dosyayı kaydet
    if (fixedInFile > 0) {
      // Önce backup al
      fs.writeFileSync(backupPath, rawData, 'utf8');

      // Meta güncelle
      if (data.meta) {
        data.meta.guncelleme_tarihi = new Date().toISOString().split('T')[0];
      }

      // Düzeltilmiş veriyi kaydet
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      filesModified++;
      console.log(`\n💾 ${fileName}: ${fixedInFile} alan düzeltildi ve kaydedildi\n`);
    } else {
      console.log(`✓ ${fileName}: Düzeltilecek alan yok\n`);
    }

  } catch (err) {
    console.error(`❌ ${fileName} işlenirken hata:`, err.message);
  }
});

// Özet rapor
console.log('\n' + '='.repeat(70));
console.log('📊 DÜZELTME RAPORU');
console.log('='.repeat(70));
console.log(`Toplam işlenen alan: ${totalProcessed}`);
console.log(`Düzeltilen alan sayısı: ${totalFixed}`);
console.log(`Değiştirilen dosya sayısı: ${filesModified}`);
console.log(`Backup dosyaları: ${filesModified} adet (*.backup-il-fix.json)`);
console.log('='.repeat(70));

if (notFound.length > 0) {
  console.log(`\n⚠️  ${notFound.length} alan için il belirlenemedi:`);
  notFound.forEach(item => {
    console.log(`   - ${item.alan} (İlçe: "${item.ilce}", Dosya: ${item.file})`);
  });
}

if (totalFixed > 0) {
  console.log('\n✅ Düzeltme başarılı! Artık içerik üretebilirsiniz.');
  console.log('\n💡 Backup dosyalarını silmek için (PowerShell):');
  console.log('   Remove-Item data\\master-lists\\*.backup-il-fix.json');
  console.log('\n💡 Düzeltmeyi geri almak için:');
  console.log('   Get-ChildItem data\\master-lists\\*.backup-il-fix.json | ForEach-Object {');
  console.log('     Copy-Item $_.FullName ($_.FullName -replace ".backup-il-fix.json", ".json")');
  console.log('   }');
} else {
  console.log('\n✓ Düzeltilecek alan bulunamadı. Tüm veriler zaten doğru!');
}
