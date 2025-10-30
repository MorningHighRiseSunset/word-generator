// export-all.js
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const SOURCE_DICTIONARY = 'dictionary.txt';
const OUT = {
  es: 'spanishdictionary.js',
  en: 'englishdictionary.js',
  fr: 'frenchdictionary.js',
  hi: 'hindidictionary.js',
  vi: 'vietnamesedictionary.js',
  zh: 'mandarindictionary.js'
};

function parseDictionaryFile() {
  const content = fs.readFileSync(path.join(__dirname, SOURCE_DICTIONARY), 'utf8');
  const entryRegex = /{[\s\S]*?word:\s*"(.*?)",[\s\S]*?definition:\s*"(.*?)",[\s\S]*?pronunciation:\s*"(.*?)",[\s\S]*?englishEquivalent:\s*"(.*?)"[\s\S]*?}/g;
  const entries = [];
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    entries.push({
      word: match[1],
      definition: match[2],
      pronunciation: match[3],
      englishEquivalent: match[4]
    });
  }
  return entries;
}

function writeEntries(entries, filePath, keyFn) {
  fs.writeFileSync(filePath, 'const dictionary = {\n', 'utf8');
  for (const e of entries) {
    const key = keyFn(e);
    const formatted = `  "${key}": {\n    definition: ${JSON.stringify(e.definition)},\n    pronunciation: ${JSON.stringify(e.pronunciation)},\n    englishEquivalent: ${JSON.stringify(e.englishEquivalent)}\n  },\n`;
    fs.appendFileSync(filePath, formatted, 'utf8');
  }
  fs.appendFileSync(filePath, '};\n', 'utf8');
}

async function translateText(text, source, target) {
  try {
    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' })
    });
    if (!res.ok) return '';
    const json = await res.json();
    return json.translatedText || '';
  } catch (err) {
    return '';
  }
}

async function exportAll() {
  const entries = parseDictionaryFile();
  console.log(`Parsed ${entries.length} entries.`);

  // Spanish (no translation)
  writeEntries(entries, OUT.es, e => e.word);
  console.log(`Wrote ${OUT.es}`);

  // English (no translation)
  writeEntries(entries, OUT.en, e => e.englishEquivalent);
  console.log(`Wrote ${OUT.en}`);

  // For other languages, translate key+definition (batch sequentially)
  const translationTargets = ['fr','hi','vi','zh'];
  for (const t of translationTargets) {
    const outFile = OUT[t];
    fs.writeFileSync(outFile, 'const dictionary = {\n', 'utf8');
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const [tw, td] = await Promise.all([
        translateText(e.word, 'es', t),
        translateText(e.definition, 'es', t)
      ]);
      const key = tw && tw.length ? tw : e.word;
      const def = td && td.length ? td : e.definition;
      const formatted = `  "${key}": {\n    definition: ${JSON.stringify(def)},\n    pronunciation: ${JSON.stringify(e.pronunciation)},\n    englishEquivalent: ${JSON.stringify(e.englishEquivalent)}\n  },\n`;
      fs.appendFileSync(outFile, formatted, 'utf8');
      if ((i+1) % 50 === 0) console.log(`${t}: ${i+1}/${entries.length}`);
      await new Promise(r => setTimeout(r, 100)); // polite pacing
    }
    fs.appendFileSync(outFile, '};\n', 'utf8');
    console.log(`Wrote ${outFile}`);
  }

  console.log('All exports complete.');
}

exportAll().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
