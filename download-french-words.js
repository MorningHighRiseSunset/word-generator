// download-french-words.js
const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const FRENCH_WORD_URL = 'https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json';
const outFile = 'french-words.txt';

console.log('Downloading French word list...');

let data = '';
https.get(FRENCH_WORD_URL, res => {
    if (res.statusCode !== 200) {
        console.error('Failed to download:', res.statusCode);
        process.exit(1);
    }

    res.setEncoding('utf8');
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Process the word list - filter and clean
        const words = JSON.parse(data)
            .filter(w => w && w.length >= 2) // Keep words 2+ letters
            .filter(w => /^[a-zàâäæçéèêëîïôœùûüÿ-]+$/i.test(w)) // Keep only valid French words
            .sort()
            .filter((w, i, arr) => arr.indexOf(w) === i); // Remove duplicates

        // Save processed list
        fs.writeFileSync(outFile, words.join('\n'), 'utf8');
        console.log(`Saved ${words.length} French words to ${outFile}`);

        // Show statistics
        console.log('\nWord count by length:');
        const lengthStats = {};
        words.forEach(w => {
            lengthStats[w.length] = (lengthStats[w.length] || 0) + 1;
        });
        Object.keys(lengthStats).sort((a, b) => a - b).forEach(len => {
            console.log(`${len} letters: ${lengthStats[len]} words`);
        });

        // Show sample
        console.log('\nSample words:');
        for (let i = 0; i < 10; i++) {
            const idx = Math.floor(Math.random() * words.length);
            console.log(words[idx]);
        }
    });
}).on('error', err => {
    console.error('Download Error:', err.message);
    process.exit(1);
});