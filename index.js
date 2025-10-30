const fs = require('fs');
const path = require('path');

const SOURCE_DICTIONARY = 'dictionary.txt';
const SPANISH_DICTIONARY_FILE = 'spanishdictionary.js';
const ENGLISH_DICTIONARY_FILE = 'englishdictionary.js';
const FRENCH_DICTIONARY_FILE = 'frenchdictionary.js';
const HINDI_DICTIONARY_FILE = 'hindidictionary.js';
const VIETDICTIONARY_FILE = 'vietnamesedictionary.js';
const MANDARIN_DICTIONARY_FILE = 'mandarindictionary.js';

// Parse dictionary.txt into an array of entries
function parseDictionaryFile() {
  const content = fs.readFileSync(path.join(__dirname, SOURCE_DICTIONARY), 'utf8');
  // Accept several small variations in spacing
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

// Write entries to a JS dictionary file using provided key (keyStr) and values
function writeEntriesToFile(entries, filePath, keyExtractor) {
  fs.writeFileSync(filePath, 'const dictionary = {\n', 'utf8');
  for (const entry of entries) {
    const key = keyExtractor(entry);
    const formatted = `  "${key}": {\n    definition: ${JSON.stringify(entry.definition)},\n    pronunciation: ${JSON.stringify(entry.pronunciation)},\n    englishEquivalent: ${JSON.stringify(entry.englishEquivalent)}\n  },\n`;
    fs.appendFileSync(filePath, formatted, 'utf8');
  }
  fs.appendFileSync(filePath, '};\n', 'utf8');
}

// Translate text via LibreTranslate public endpoint (fallback to empty string on failure)
async function translateText(text, source, target) {
  try {
    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: source, target: target, format: 'text' })
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.translatedText || '';
  } catch (err) {
    return '';
  }
}

// Export entries translating word and definition to target language (targetCode like 'fr','hi','vi','zh')
async function exportTranslated(entries, outFile, targetCode, messageEl, outputEl) {
  messageEl.textContent = `Translating ${entries.length} entries to ${targetCode} — this may take a while...`;
  // create/overwrite file header
  fs.writeFileSync(outFile, 'const dictionary = {\n', 'utf8');

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // attempt translation of the Spanish word and definition (source 'es')
    const [translatedWord, translatedDefinition] = await Promise.all([
      translateText(entry.word, 'es', targetCode),
      translateText(entry.definition, 'es', targetCode)
    ]);

    // fallback strategy: if translations fail, use englishEquivalent or original Spanish word
    const key = (translatedWord && translatedWord.length >= 1) ? translatedWord : entry.word;
    const definitionToWrite = (translatedDefinition && translatedDefinition.length > 0) ? translatedDefinition : entry.definition;

    const formatted = `  "${key}": {\n    definition: ${JSON.stringify(definitionToWrite)},\n    pronunciation: ${JSON.stringify(entry.pronunciation)},\n    englishEquivalent: ${JSON.stringify(entry.englishEquivalent)}\n  },\n`;
    fs.appendFileSync(outFile, formatted, 'utf8');

    // update progress occasionally
    if ((i + 1) % 25 === 0 || i === entries.length - 1) {
      outputEl.textContent = `Translated ${i + 1} / ${entries.length} entries...`;
    }
    // small delay to be polite to public endpoint
    await new Promise(r => setTimeout(r, 150));
  }

  fs.appendFileSync(outFile, '};\n', 'utf8');
  messageEl.textContent = `Exported ${entries.length} entries to ${outFile} (target: ${targetCode}).`;
  outputEl.textContent = entries.slice(0, 10).map(e =>
    `"${e.word}": {\n  definition: "${e.definition}",\n  pronunciation: "${e.pronunciation}",\n  englishEquivalent: "${e.englishEquivalent}"\n},`
  ).join('\n\n') + (entries.length > 10 ? `\n...and ${entries.length - 10} more.` : '');
}

// UI logic
window.addEventListener('DOMContentLoaded', () => {
  const exportSpanishBtn = document.getElementById('exportSpanishBtn');
  const exportEnglishBtn = document.getElementById('exportEnglishBtn');
  const exportFrenchBtn = document.getElementById('exportFrenchBtn');
  const exportHindiBtn = document.getElementById('exportHindiBtn');
  const exportVietnameseBtn = document.getElementById('exportVietnameseBtn');
  const exportMandarinBtn = document.getElementById('exportMandarinBtn');

  const output = document.getElementById('output');
  const message = document.getElementById('message');

  const entries = parseDictionaryFile();

  // Spanish export (no translation, key = spanish word)
  exportSpanishBtn.addEventListener('click', () => {
    writeEntriesToFile(entries, SPANISH_DICTIONARY_FILE, e => e.word);
    message.textContent = `Exported ${entries.length} words to ${SPANISH_DICTIONARY_FILE} (Spanish keys).`;
    output.textContent = entries.slice(0, 10).map(entry =>
      `"${entry.word}": {\n  definition: "${entry.definition}",\n  pronunciation: "${entry.pronunciation}",\n  englishEquivalent: "${entry.englishEquivalent}"\n},`
    ).join('\n\n') + (entries.length > 10 ? `\n...and ${entries.length - 10} more.` : '');
  });

  // English export (key = englishEquivalent)
  exportEnglishBtn.addEventListener('click', () => {
    writeEntriesToFile(entries, ENGLISH_DICTIONARY_FILE, e => e.englishEquivalent);
    message.textContent = `Exported ${entries.length} words to ${ENGLISH_DICTIONARY_FILE} (English keys).`;
    output.textContent = entries.slice(0, 10).map(entry =>
      `"${entry.englishEquivalent}": {\n  definition: "${entry.definition}",\n  pronunciation: "${entry.pronunciation}",\n  englishEquivalent: "${entry.englishEquivalent}"\n},`
    ).join('\n\n') + (entries.length > 10 ? `\n...and ${entries.length - 10} more.` : '');
  });

  // French export
  exportFrenchBtn.addEventListener('click', async () => {
    await exportTranslated(entries, FRENCH_DICTIONARY_FILE, 'fr', message, output);
  });

  // Hindi export
  exportHindiBtn.addEventListener('click', async () => {
    await exportTranslated(entries, HINDI_DICTIONARY_FILE, 'hi', message, output);
  });

  // Vietnamese export
  exportVietnameseBtn.addEventListener('click', async () => {
    await exportTranslated(entries, VIETDICTIONARY_FILE, 'vi', message, output);
  });

  // Mandarin (Chinese) export (target 'zh')
  exportMandarinBtn.addEventListener('click', async () => {
    await exportTranslated(entries, MANDARIN_DICTIONARY_FILE, 'zh', message, output);
  });
});
