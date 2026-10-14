import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiFiles = [
  ...fs.readdirSync(path.join(root, 'src'), {recursive: true})
    .filter(file => /\.(?:js|jsx)$/.test(file))
    .map(file => path.join(root, 'src', file)),
  path.join(root, 'android', 'src', 'main', 'res', 'values', 'strings.xml'),
];

const forbiddenBrandPatterns = [
  /منابع حدیثی آفلاین نور/u,
  /داده(?:‌|\s)*های مشابه(?:‌|\s)*یاب جامع التفاسیر [۴4]/u,
  /جامع التفاسیر [۴4]/u,
  /(?:Jame|Jami)\s+Tafasir\s+4/iu,
  /NoorSoft/iu,
  /مشکات(?:‌|-)?صوت/u,
  /برگرفته از منابع .*نور/u,
  /نسخه.*ویندوز.*اندروید/u,
];

test('user-facing sources contain no forbidden third-party branding', () => {
  const hits = [];
  for (const file of uiFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenBrandPatterns) {
      if (pattern.test(text)) hits.push(`${path.relative(root, file)}: ${pattern}`);
    }
  }
  assert.deepEqual(hits, []);
});

test('required Mansour white-label copy remains present', () => {
  const brandText = fs.readFileSync(path.join(root, 'src', 'brandText.js'), 'utf8');
  for (const expected of [
    'منابع حدیثی آفلاین جامع التفاسیر منصور',
    'فهرست منابع و مآخذ علمی برنامه',
    'موتور مشابه‌یاب آیات جامع التفاسیر منصور',
    'پژوهشگاه واژگان جامع التفاسیر منصور',
    'آرشیو صوتی جامع التفاسیر منصور',
  ]) assert(brandText.includes(expected), expected);
});
