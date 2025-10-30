// download-english-words.js
// Downloads the dwyl English word list and saves it as english-words.txt
const https = require('https');
const fs = require('fs');
const url = 'https://raw.githubusercontent.com/dwyl/english-words/refs/heads/master/words.txt';
const outFile = 'english-words.txt';

console.log('Downloading English word list...');
https.get(url, res => {
  if (res.statusCode !== 200) {
    console.error('Failed to download:', res.statusCode);
    process.exit(1);
  }
  const file = fs.createWriteStream(outFile);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Saved to', outFile);
  });
}).on('error', err => {
  console.error('Error:', err.message);
  process.exit(1);
});
