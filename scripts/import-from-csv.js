#!/usr/bin/env node

/**
 * CSV'den Toplu Alan İçe Aktarma
 *
 * CSV formatında hazırlanmış alan listelerini
 * master listelere aktarır.
 *
 * CSV Formatı:
 * ad,il,ilce,lat,lon,kaynak1,kaynak2,notlar
 *
 * Kullanım:
 *   node import-from-csv.js ormanlik-alanlar ormanlik-alanlar.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MASTER_LISTS_DIR = path.join(__dirname, '../data/master-lists');

const TUR_MAP = {
  'milli-park': 'milli-parklar.json',
  'tabiat-parki': 'tabiat-parklari.json',
  'tabiat-aniti': 'tabiat-anıtları.json',
  'kanyon': 'kanyonlar.json',
  'selalesi': 'selaleler.json',
  'magara': 'magaralar.json',
  'gol': 'goller.json',
  'plaj': 'plajlar.json',
  'yayla': 'yaylalar.json',
  'sulak-alan': 'sulak-alanlar.json',
  'ormanlik-alan': 'ormanlik-alanlar.json',
  'kamp-alani': 'kamp-alanlari.json'
};

function slugify(text) {
  const trMap = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'I': 'i',
    'İ': 'i', 'i': 'i',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  return text
    .split('')
    .map(char => trMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('\n❌ Kullanım: node import-from-csv.js <tür-kodu> <csv-dosyası>\n');
    console.log('Örnek: node import-from-csv.js ormanlik-alan ormanlik-alanlar.csv\n');
    console.log('Tür kodları:');
    Object.keys(TUR_MAP).forEach(kod => console.log(`  - ${kod}`));
    console.log('');
    process.exit(1);
  }

  const turKodu = args[0];
  const csvFile = args[1];

  if (!TUR_MAP[turKodu]) {
    console.log(`❌ Geçersiz tür kodu: ${turKodu}`);
    process.exit(1);
  }

  if (!fs.existsSync(csvFile)) {
    console.log(`❌ CSV dosyası bulunamadı: ${csvFile}`);
    process.exit(1);
  }

  console.log('\n📥 CSV İçe Aktarma Başlatıldı\n');
  console.log('='.repeat(60));

  // CSV oku
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const rows = parseCSV(csvContent);

  console.log(`📄 ${rows.length} satır okundu\n`);

  // Master liste dosyasını yükle veya oluştur
  const outputFile = TUR_MAP[turKodu];
  const filePath = path.join(MASTER_LISTS_DIR, outputFile);

  let data = {
    meta: {
      kaynak: 'CSV import',
      guncelleme_tarihi: new Date().toISOString().split('T')[0],
      toplam_sayi: 0
    },
    alanlar: []
  };

  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  // Alanları ekle
  let eklenenSayi = 0;

  rows.forEach(row => {
    const alan = {
      id: slugify(row.ad || row.name),
      ad: row.ad || row.name,
      tur: turKodu,
      il: row.il || row.province || '',
      ilce: row.ilce || row.district || '',
      bolge: row.bolge || row.region || '',
      koordinat: {
        lat: parseFloat(row.lat || row.latitude) || null,
        lon: parseFloat(row.lon || row.longitude) || null
      },
      olasi_kaynaklar: [],
      notlar: row.notlar || row.notes || 'CSV import'
    };

    if (row.kaynak1 || row.source1) {
      alan.olasi_kaynaklar.push(row.kaynak1 || row.source1);
    }
    if (row.kaynak2 || row.source2) {
      alan.olasi_kaynaklar.push(row.kaynak2 || row.source2);
    }

    // Duplicate kontrolü
    const mevcutMu = data.alanlar.some(a => a.id === alan.id);
    if (!mevcutMu) {
      data.alanlar.push(alan);
      eklenenSayi++;
      console.log(`  ✅ ${alan.ad}`);
    } else {
      console.log(`  ⏭️  Atlandı (zaten var): ${alan.ad}`);
    }
  });

  // Kaydet
  data.meta.toplam_sayi = data.alanlar.length;
  data.meta.guncelleme_tarihi = new Date().toISOString().split('T')[0];

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log(`✅ İçe aktarma tamamlandı!`);
  console.log(`📊 ${eklenenSayi} yeni alan eklendi`);
  console.log(`📁 Toplam alan sayısı: ${data.alanlar.length}`);
  console.log(`📁 Dosya: ${filePath}\n`);
}

main();
