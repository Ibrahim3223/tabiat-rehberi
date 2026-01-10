const fs = require('fs');
const path = require('path');

// Türkçe karakter normalize
function normalizeForFilename(text) {
    if (!text) return 'unknown';
    return text
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Alan türüne göre kategori belirleme
function getCategoryFromType(tur) {
    const mapping = {
        'ada': 'ada',
        'dağ': 'dag',
        'göl': 'gol',
        'kanyon': 'kanyon',
        'mağara': 'magara',
        'milli park': 'milli-park',
        'tabiat parkı': 'tabiat-parki',
        'şelale': 'selale',
        'plaj': 'plaj',
        'sulak alan': 'sulak-alan',
        'tabiat anıtı': 'tabiat-aniti',
        'jeopark': 'jeopark',
        'botanik bahçesi': 'botanik-bahcesi',
        'kayak merkezi': 'kayak-merkezi',
        'kuş cenneti': 'kus-cenneti',
        'orman': 'orman',
        'tepe': 'tepe',
        'termal kaynak': 'termal-kaynak',
        'vadi': 'vadi',
        'yayla': 'yayla'
    };
    return mapping[tur.toLowerCase()] || 'alan';
}

// Aktivite önerileri
function getActivities(tur) {
    const activities = {
        'ada': ['yüzme', 'tekne turu', 'dalış', 'fotoğrafçılık'],
        'dağ': ['dağcılık', 'trekking', 'kamp', 'fotoğrafçılık'],
        'göl': ['yüzme', 'kano', 'balık tutma', 'piknik'],
        'kanyon': ['kanyoning', 'rafting', 'doğa yürüyüşü', 'fotoğrafçılık'],
        'mağara': ['mağara turu', 'speloloji', 'fotoğrafçılık'],
        'milli park': ['doğa yürüyüşü', 'kamp', 'vahşi yaşam gözlemi', 'fotoğrafçılık'],
        'tabiat parkı': ['doğa yürüyüşü', 'piknik', 'bisiklet', 'fotoğrafçılık'],
        'şelale': ['doğa yürüyüşü', 'piknik', 'fotoğrafçılık', 'yüzme'],
        'plaj': ['yüzme', 'güneşlenme', 'su sporları', 'dalış'],
        'sulak alan': ['kuş gözlemi', 'fotoğrafçılık', 'doğa yürüyüşü'],
        'jeopark': ['jeoloji turu', 'doğa yürüyüşü', 'eğitim', 'fotoğrafçılık'],
        'kayak merkezi': ['kayak', 'snowboard', 'kızak', 'apres-ski']
    };
    return activities[tur.toLowerCase()] || ['doğa yürüyüşü', 'fotoğrafçılık', 'piknik'];
}

// En iyi ziyaret dönemi
function getBestPeriod(tur) {
    const periods = {
        'ada': 'Mayıs-Ekim',
        'dağ': 'Haziran-Eylül',
        'göl': 'İlkbahar ve yaz',
        'kanyon': 'İlkbahar ve sonbahar',
        'mağara': 'Yıl boyu',
        'milli park': 'İlkbahar ve sonbahar',
        'tabiat parkı': 'İlkbahar ve sonbahar',
        'şelale': 'İlkbahar ve yaz',
        'plaj': 'Haziran-Eylül',
        'kayak merkezi': 'Aralık-Mart',
        'yayla': 'Haziran-Eylül'
    };
    return periods[tur.toLowerCase()] || 'İlkbahar ve sonbahar';
}

// Zorluk seviyesi
function getDifficulty(tur) {
    const difficulty = {
        'dağ': 'Orta-Zor',
        'kanyon': 'Orta',
        'kayak merkezi': 'Değişken',
        'mağara': 'Orta'
    };
    return difficulty[tur.toLowerCase()] || 'Kolay';
}

// Markdown dosyası oluştur
function createMarkdownFile(alan, outputDir) {
    const filename = normalizeForFilename(alan.ad) + '.md';
    const filepath = path.join(outputDir, filename);

    // Eğer dosya zaten varsa atla
    if (fs.existsSync(filepath)) {
        console.log(`⏭️  Atlandı (zaten var): ${filename}`);
        return false;
    }

    // Frontmatter oluştur
    const frontmatter = {
        title: alan.ad,
        date: new Date().toISOString(),
        draft: false,
        type: 'alan',
        alan_turu: getCategoryFromType(alan.tur || 'alan'),
        il: alan.il || 'Türkiye',
        ilce: alan.ilce || '',
        bolge: alan.bolge || (alan.il || 'Türkiye'),
        ziyaret: {
            en_iyi_donem: getBestPeriod(alan.tur || ''),
            zorluk: getDifficulty(alan.tur || ''),
            tahmini_sure: 'Günlük'
        },
        aktiviteler: getActivities(alan.tur || ''),
        wikidata_id: alan.wikidata_id || ''
    };

    // Koordinat varsa ekle
    if (alan.koordinat && alan.koordinat.lat && alan.koordinat.lon) {
        frontmatter.koordinat = {
            lat: alan.koordinat.lat,
            lon: alan.koordinat.lon
        };
    }

    // İmaj varsa ekle
    if (alan.images && alan.images.hero && alan.images.hero.url) {
        frontmatter.images = {
            hero: {
                url: alan.images.hero.url,
                alt: `${alan.ad} manzarası`,
                credit: 'Wikimedia Commons',
                license: 'CC BY-SA'
            }
        };
    }

    // Kaynaklar
    const kaynaklar = [];
    if (alan.olasi_kaynaklar && alan.olasi_kaynaklar.length > 0) {
        alan.olasi_kaynaklar.forEach(kaynak => {
            if (kaynak.includes('wikipedia')) {
                kaynaklar.push({
                    title: 'Wikipedia',
                    url: kaynak,
                    tip: 'ansiklopedi'
                });
            } else if (kaynak.includes('wikidata')) {
                kaynaklar.push({
                    title: 'Wikidata',
                    url: kaynak,
                    tip: 'veri'
                });
            }
        });
    }
    if (kaynaklar.length > 0) {
        frontmatter.kaynaklar = kaynaklar;
    }

    // Description ve keywords
    const turAd = alan.tur || 'doğal alan';
    frontmatter.description = `${alan.il}'${alan.il.endsWith('ı') || alan.il.endsWith('i') ? 'da' : 'de'} yer alan ${alan.ad}, ${turAd} olarak dikkat çekiyor.`;
    frontmatter.keywords = [alan.ad, alan.il, 'Türkiye', turAd, 'doğa', 'gezi'];

    frontmatter.schema_type = 'TouristAttraction';

    // Markdown içeriği
    let content = '---\n';
    content += `title: "${frontmatter.title}"\n`;
    content += `date: "${frontmatter.date}"\n`;
    content += `draft: ${frontmatter.draft}\n`;
    content += `type: "${frontmatter.type}"\n`;
    content += `alan_turu: "${frontmatter.alan_turu}"\n`;
    content += `il: "${frontmatter.il}"\n`;
    if (frontmatter.ilce) content += `ilce: "${frontmatter.ilce}"\n`;
    content += `bolge: "${frontmatter.bolge}"\n`;

    if (frontmatter.koordinat) {
        content += `koordinat:\n`;
        content += `  lat: ${frontmatter.koordinat.lat}\n`;
        content += `  lon: ${frontmatter.koordinat.lon}\n`;
    }

    content += `ziyaret:\n`;
    content += `  en_iyi_donem: "${frontmatter.ziyaret.en_iyi_donem}"\n`;
    content += `  zorluk: "${frontmatter.ziyaret.zorluk}"\n`;
    content += `  tahmini_sure: "${frontmatter.ziyaret.tahmini_sure}"\n`;

    content += `aktiviteler: ${JSON.stringify(frontmatter.aktiviteler)}\n`;

    if (frontmatter.images) {
        content += `images:\n`;
        content += `  hero: ${JSON.stringify(frontmatter.images.hero)}\n`;
    }

    if (frontmatter.kaynaklar && frontmatter.kaynaklar.length > 0) {
        content += `kaynaklar: ${JSON.stringify(frontmatter.kaynaklar)}\n`;
    }

    content += `description: "${frontmatter.description}"\n`;
    content += `keywords: ${JSON.stringify(frontmatter.keywords)}\n`;
    content += `schema_type: "${frontmatter.schema_type}"\n`;
    if (frontmatter.wikidata_id) content += `wikidata_id: "${frontmatter.wikidata_id}"\n`;
    content += '---\n\n';

    // İçerik
    content += `# ${alan.ad}\n\n`;
    content += `${alan.ad}, ${alan.il}'${alan.il.endsWith('ı') || alan.il.endsWith('i') ? 'da' : 'de'} yer alan muhteşem bir ${turAd}${alan.ilce ? ` (${alan.ilce})` : ''}. `;
    content += `Doğal güzellikleri ve eşsiz manzarası ile ziyaretçilerine unutulmaz anlar yaşatıyor.\n\n`;

    if (alan.koordinat && alan.koordinat.lat && alan.koordinat.lon) {
        content += `## Konum\n\n`;
        content += `${alan.ad}, ${alan.il}${alan.ilce ? `, ${alan.ilce}` : ''} bölgesinde ${alan.koordinat.lat.toFixed(4)}°K, ${alan.koordinat.lon.toFixed(4)}°D koordinatlarında konumlanmaktadır.\n\n`;
    }

    content += `## Ziyaret Bilgileri\n\n`;
    content += `**En İyi Ziyaret Dönemi:** ${frontmatter.ziyaret.en_iyi_donem}\n\n`;
    content += `**Aktiviteler:** ${frontmatter.aktiviteler.join(', ')}\n\n`;

    if (frontmatter.kaynaklar && frontmatter.kaynaklar.length > 0) {
        content += `## Kaynaklar\n\n`;
        frontmatter.kaynaklar.forEach(kaynak => {
            content += `- [${kaynak.title}](${kaynak.url})\n`;
        });
    }

    // Dosyayı yaz
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`✅ Oluşturuldu: ${filename}`);
    return true;
}

// Ana fonksiyon
async function main() {
    const masterListsDir = path.join(__dirname, '..', 'data', 'master-lists');
    const outputDir = path.join(__dirname, '..', 'content', 'alanlar');

    // Output klasörünü oluştur
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Merged JSON dosyalarını bul
    const files = fs.readdirSync(masterListsDir)
        .filter(f => f.endsWith('-merged.json') && !f.includes('test'));

    console.log(`\n📂 ${files.length} merged JSON dosyası bulundu\n`);

    let totalCreated = 0;
    let totalSkipped = 0;
    const maxPerFile = 10; // Her dosyadan maksimum 10 alan ekle

    for (const file of files) {
        const filepath = path.join(masterListsDir, file);
        console.log(`\n📄 İşleniyor: ${file}`);

        try {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            if (!data.alanlar || data.alanlar.length === 0) {
                console.log(`⚠️  Alan bulunamadı, atlanıyor`);
                continue;
            }

            console.log(`   Toplam ${data.alanlar.length} alan var, ${maxPerFile} tanesi eklenecek`);

            // Her dosyadan ilk N tanesini al
            const alansToAdd = data.alanlar.slice(0, maxPerFile);

            for (const alan of alansToAdd) {
                const created = createMarkdownFile(alan, outputDir);
                if (created) {
                    totalCreated++;
                } else {
                    totalSkipped++;
                }
            }
        } catch (error) {
            console.error(`❌ Hata: ${file} - ${error.message}`);
        }
    }

    console.log(`\n\n✨ İşlem Tamamlandı!`);
    console.log(`📊 Özet:`);
    console.log(`   ✅ Yeni oluşturulan: ${totalCreated}`);
    console.log(`   ⏭️  Atlanan (zaten var): ${totalSkipped}`);
    console.log(`   📝 Toplam alan: ${totalCreated + totalSkipped}\n`);
}

main().catch(console.error);
