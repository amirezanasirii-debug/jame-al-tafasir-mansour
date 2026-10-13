import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'public', 'content.json'), 'utf8'));
const targets = [[2, 2], [2, 5]];

for (const [surahId, number] of targets) {
  const ayah = data.ayahs.find(item => item.surah_id === surahId && item.number === number);
  if (!ayah) throw new Error(`Missing ayah ${surahId}:${number}`);
  console.log(`\n${surahId}:${number}  ${ayah.text_original}`);
  for (const character of ayah.text_original) {
    const code = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    console.log(`U+${code}\t${JSON.stringify(character)}`);
  }
}
