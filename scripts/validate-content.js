#!/usr/bin/env node

/**
 * İçerik Doğrulama Scripti
 *
 * Oluşturulan içerikleri doğrular:
 * - Front matter geçerliliği
 * - Koordinat kontrolü
 * - Kaynak sayısı
 * - Boş alanlar
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content/alanlar');

function validateFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const { data: frontMatter } = matter(content);

  const errors = [];
  const warnings = [];

  // Zorunlu alanlar
  if (!frontMatter.title) errors.push('Başlık eksik');
  if (!frontMatter.il) errors.push('İl bilgisi eksik');
  if (!frontMatter.type || frontMatter.type !== 'alan') errors.push('Type hatalı');

  // Koordinat kontrolü
  const lat = frontMatter.coordinates?.lat;
  const lon = frontMatter.coordinates?.lon;

  if (!lat || !lon) {
    warnings.push('Koordinat eksik');
  } else if (lat < 35 || lat > 43 || lon < 25 || lon > 46) {
    errors.push('Koordinat Türkiye dışında');
  }

  // Kaynak kontrolü
  const kaynakSayisi = frontMatter.kaynaklar?.length || 0;
  if (kaynakSayisi === 0) {
    errors.push('Hiç kaynak yok');
  } else if (kaynakSayisi < 2) {
    warnings.push('2\'den az kaynak var');
  }

  // Giriş bilgisi kontrolü
  if (frontMatter.giris?.dogrulanmadi === true) {
    warnings.push('Giriş bilgileri doğrulanmamış');
  }

  return { errors, warnings };
}

function validateAll() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('❌ Content klasörü bulunamadı:', CONTENT_DIR);
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('⚠️  Henüz içerik üretilmemiş\n');
    return;
  }

  console.log('\n🔍 İçerik Doğrulama Başlatıldı\n');
  console.log('='.repeat(70));
  console.log(`Toplam ${files.length} dosya kontrol ediliyor\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  const problemFiles = [];

  files.forEach(file => {
    const filepath = path.join(CONTENT_DIR, file);
    const { errors, warnings } = validateFile(filepath);

    if (errors.length > 0 || warnings.length > 0) {
      problemFiles.push({ file, errors, warnings });
      totalErrors += errors.length;
      totalWarnings += warnings.length;
    }
  });

  if (problemFiles.length === 0) {
    console.log('✅ Tüm dosyalar geçerli!\n');
  } else {
    console.log(`\n⚠️  ${problemFiles.length} dosyada sorun tespit edildi:\n`);

    problemFiles.forEach(({ file, errors, warnings }) => {
      console.log(`📄 ${file}`);
      if (errors.length > 0) {
        errors.forEach(err => console.log(`   ❌ HATA: ${err}`));
      }
      if (warnings.length > 0) {
        warnings.forEach(warn => console.log(`   ⚠️  UYARI: ${warn}`));
      }
      console.log('');
    });
  }

  console.log('='.repeat(70));
  console.log(`\n📊 Özet:`);
  console.log(`   Toplam dosya: ${files.length}`);
  console.log(`   Geçerli: ${files.length - problemFiles.length}`);
  console.log(`   Sorunlu: ${problemFiles.length}`);
  console.log(`   Toplam hata: ${totalErrors}`);
  console.log(`   Toplam uyarı: ${totalWarnings}\n`);
}

validateAll();
