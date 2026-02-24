'use strict';
/**
 * fix-content-quality.cjs
 * Aşama 1: Yabancı kelimeler
 * Aşama 2: Sahte/şablon cümle kaldırma
 * Aşama 3: Doğal alan olmayan sayfalar → draft:true
 */
const fs   = require('fs');
const path = require('path');

// ── helpers ───────────────────────────────────────────────────────────────
function walkMD(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMD(fp));
    else if (e.name.endsWith('.md')) out.push(fp);
  }
  return out;
}

// Remove a complete sentence that contains any of the patterns
// A sentence: starts after . or \n, ends with .  ! or ?
function removeSentences(text, patterns) {
  // Split into body + frontmatter
  const fmMatch = text.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  if (!fmMatch) return text;
  const fm   = fmMatch[1];
  let   body = fmMatch[2];

  for (const pat of patterns) {
    // Remove sentences matching the pattern
    body = body.replace(
      /[^.!?\n]*(?:\.\.\.)?[^.!?\n]*[.!?]/g,
      sentence => pat.test(sentence) ? '' : sentence
    );
    pat.lastIndex = 0;
  }

  // Clean up resulting double spaces, empty bullets, blank lines
  body = body
    .replace(/[ \t]+\n/g, '\n')           // trailing spaces
    .replace(/\n{3,}/g, '\n\n')           // 3+ blank lines → 2
    .replace(/^(##[^\n]+)\n\n(##)/gm, '$1\n\n$2'); // section with no body

  return fm + body;
}

// Simple string/regex replacements (on full file)
function applyReplacements(text, replacements) {
  for (const [from, to] of replacements) {
    if (from instanceof RegExp) {
      text = text.replace(from, to);
    } else {
      text = text.split(from).join(to);
    }
  }
  return text;
}

// ── Phase 1: Foreign word replacements ───────────────────────────────────
const FOREIGN_FIXES = [
  // Spanish "históri*" variants → Turkish "tarihi"
  [/histórik\w*/gi, 'tarihi'],
  [/histórica\w*/gi, 'tarihi'],
  [/histórico\w*/gi, 'tarihi'],
  [/histórique\w*/gi, 'tarihi'],
  [/históri\w*/gi, 'tarihi'],
  // French "région*" → Turkish suffix-friendly replacement
  [/régionun\b/gi, 'bölgenin'],
  [/régionu\b/gi, 'bölgeyi'],
  [/régiondan\b/gi, 'bölgeden'],
  [/régionda\b/gi, 'bölgede'],
  [/régiondaki\b/gi, 'bölgedeki'],
  [/régionla\b/gi, 'bölgeyle'],
  [/région\b/gi, 'bölge'],
  // French "expérience" → Turkish
  [/expériences/gi, 'deneyimler'],
  [/expérience/gi, 'deneyim'],
  // Spanish/Portuguese "fácil" → Turkish
  [/\bfácil\b/gi, 'kolay'],
  // Portuguese/Spanish "necessário/nécessaire" → Turkish
  [/\bnecessário\b/gi, 'gerekli'],
  [/\bnécessaire\b/gi, 'gerekli'],
  // Vietnamese "sâu" → Turkish "derin"
  [/\bsâu\b/gi, 'derin'],
  // Vietnamese "bảo" → "koruma"
  [/bảolanması/g, 'korunması'],
  [/bảo\b/g, 'koruma'],
  // Czech "vytváranıyor" → "yaratılıyor"
  [/vytváranıyor/g, 'yaratılıyor'],
  // Typo "habital" → "habitat"
  [/\bhabital\b/gi, 'habitat'],
];

// ── Phase 2: Template sentence patterns to REMOVE ─────────────────────────
// These sentences are ALWAYS fake/boilerplate — remove them entirely
const SENTENCE_REMOVAL_PATTERNS = [
  // "140 hektarlık" + "200 futbol sahası" fake size data
  /\d+\s*hektarlık[^.!?]*200\s*futbol\s*sahası[^.!?]*[.!?]/gi,
  /200\s*futbol\s*sahası[^.!?]*büyüklüğündedir[^.!?]*[.!?]/gi,
  /yaklaşık\s*\d+\s*futbol\s*sahası[^.!?]*[.!?]/gi,
  /Bu\s+alan[^.!?]*140\s*hektarlık[^.!?]*[.!?]/gi,
  // "çeşitli bitki türleri ve zengin fauna ile dikkat çeker" — generic filler
  /[^.!?]*çeşitli\s+bitki\s+türleri\s+ve\s+zengin\s+fauna\s+ile\s+dikkat\s+çeker[^.!?]*[.!?]/gi,
  // "hem yerli hem de yabancı turistler" — generic tourism filler
  /[^.!?]*hem\s+yerli\s+hem\s+de\s+yabancı\s+turistler\s+tarafından[^.!?]*[.!?]/gi,
  // "flora ve fauna açısından oldukça zengindir/zengin" — generic
  /[^.!?]*flora\s+ve\s+fauna\s+açısından\s+oldukça\s+zengin[^.!?]*[.!?]/gi,
  // "ekolojik dengesini korumak açısından oldukça önemlidir"
  /[^.!?]*ekolojik\s+denge[^.!?]*korumak\s+açısından[^.!?]*[.!?]/gi,
  // "ziyaretçilere ... keşfetme fırsatı sunmaktadır" — generic CTA filler
  /[^.!?]*ziyaretçilere[^.!?]{5,60}keşfetme\s+fırsatı\s+sunmaktadır[^.!?]*[.!?]/gi,
  // "ziyaretçilerine unutulmaz bir deneyim sunmaktadır"
  /[^.!?]*ziyaretçilerine\s+unutulmaz[^.!?]*[.!?]/gi,
  // "önemli bir turistik destinasyon"
  /[^.!?]*önemli\s+bir\s+turistik\s+destinasyon[^.!?]*[.!?]/gi,
  // "doğa tutkunlarının vazgeçilmezi"
  /[^.!?]*doğa\s+tutkunlarının\s+vazgeçilmezi[^.!?]*[.!?]/gi,
];

// ── Phase 3: Non-nature title keywords → draft:true ───────────────────────
const NON_NATURE_KEYWORDS = [
  'hamam', 'türbe', 'tekke', 'cami', 'külliye', 'müze', 'stadyum',
  'mezarlık', 'anıt mezar', 'han ', 'kervansaray', 'kilise', 'saray',
  'medrese', 'bedesten', 'çeşme', 'sebil', 'mescid', 'köprü', 'sur ',
  'hisar',
];

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const files = walkMD('content/alanlar');
  console.log('Toplam dosya:', files.length);

  let phase1Fixed = 0, phase2Fixed = 0, phase3Drafted = 0;
  let p1Changes = 0, p2Removed = 0;

  for (const fp of files) {
    let text = fs.readFileSync(fp, 'utf8');
    const original = text;

    // ── Phase 1 ──────────────────────────────────────────────────────────
    const afterP1 = applyReplacements(text, FOREIGN_FIXES);
    if (afterP1 !== text) {
      phase1Fixed++;
      p1Changes += (afterP1.length < text.length ? text.length - afterP1.length : 1);
      text = afterP1;
    }

    // ── Phase 2 ──────────────────────────────────────────────────────────
    const afterP2 = removeSentences(text, SENTENCE_REMOVAL_PATTERNS);
    if (afterP2 !== text) {
      phase2Fixed++;
      p2Removed += (text.length - afterP2.length);
      text = afterP2;
    }

    // ── Phase 3 ──────────────────────────────────────────────────────────
    const titleMatch = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const title      = titleMatch ? titleMatch[1].toLowerCase() : '';
    const isDraft    = /^draft:\s*true/m.test(text);

    if (!isDraft) {
      for (const kw of NON_NATURE_KEYWORDS) {
        if (title.includes(kw)) {
          text = text.replace(/^draft:\s*false/m, 'draft: true');
          phase3Drafted++;
          break;
        }
      }
    }

    // Write if changed
    if (text !== original) {
      fs.writeFileSync(fp, text, 'utf8');
    }
  }

  console.log('\n═══ RAPOR ═══════════════════════════════════════');
  console.log(`Aşama 1 (yabancı kelime)  : ${phase1Fixed} dosya, ~${p1Changes} karakter düzeltildi`);
  console.log(`Aşama 2 (şablon cümle)    : ${phase2Fixed} dosya, ~${Math.round(p2Removed/1000)}KB içerik silindi`);
  console.log(`Aşama 3 (draft)           : ${phase3Drafted} doğal-alan-olmayan sayfa draft:true yapıldı`);
}

main().catch(e => { console.error(e); process.exit(1); });
