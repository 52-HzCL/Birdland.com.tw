// Build tools/dev/fixtures/promo-sample.pdf — a fake export quotation used to
// end-to-end test the CI pipeline that runs Gemini extraction over supplier
// PDFs. The pipeline's job is to pull out products and strip every price, so
// this fixture must carry obvious, unmistakable fake prices for that
// price-scrubbing step to catch.
//
// Idempotent: re-running regenerates the PDF and its temp PNGs from scratch.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const { CHROME, REPO } = require('./_env');

const FIXTURES = path.join(REPO, 'tools', 'dev', 'fixtures');
fs.mkdirSync(FIXTURES, { recursive: true });

const ITEMS = [
  {
    sku: 'BT-2101',
    name_en: 'Forged Garden Trowel',
    name_zh: '鍛造花鏟',
    spec: 'Blade 145 x 95 mm, S45C carbon steel, HRC 48-52, ash wood handle',
    moq: '3,000 pcs',
    price: 'FOB Taichung USD 9.99 / pc',
    color: '#2f6b3a',
    shape: 'circle',
  },
  {
    sku: 'BT-2205',
    name_en: 'Bypass Branch Shears',
    name_zh: '樹枝剪',
    spec: 'Blade length 210 mm, S45C carbon steel, HRC 50-54, PP + rubber grip handle',
    moq: '2,400 pcs',
    price: 'FOB Taichung USD 9.99 / pc',
    color: '#b0451e',
    shape: 'triangle',
  },
  {
    sku: 'BT-2310',
    name_en: '3-Prong Cultivator Rake',
    name_zh: '三爪耙',
    spec: 'Head width 90 mm, S45C carbon steel, HRC 46-50, beech wood handle',
    moq: '3,000 pcs',
    price: 'FOB Taichung USD 9.99 / pc',
    color: '#1e4f7a',
    shape: 'square',
  },
];

function shapeSvg(shape, fg) {
  if (shape === 'circle') return `<circle cx="150" cy="150" r="90" fill="${fg}"/>`;
  if (shape === 'triangle') return `<polygon points="150,50 240,230 60,230" fill="${fg}"/>`;
  return `<rect x="60" y="60" width="180" height="180" fill="${fg}"/>`;
}

async function makeItemPng(item, outFile) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320">
      <rect width="320" height="320" fill="${item.color}"/>
      ${shapeSvg(item.shape, '#ffffff')}
    </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outFile);
}

function toDataUri(pngPath) {
  const buf = fs.readFileSync(pngPath);
  return 'data:image/png;base64,' + buf.toString('base64');
}

function rowHtml(item, dataUri) {
  return `
    <tr>
      <td class="img"><img src="${dataUri}" width="120" height="120" alt="${item.sku}"></td>
      <td>
        <div class="sku">${item.sku}</div>
        <div class="name">${item.name_en}｜${item.name_zh}</div>
        <div class="spec">${item.spec}</div>
        <div class="moq">MOQ: ${item.moq}</div>
        <div class="price">${item.price}</div>
      </td>
    </tr>`;
}

function pageHtml(rowsHtml) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, "Microsoft JhengHei", sans-serif; margin: 0; padding: 36px; color: #1a1a1a; }
  .fixture-banner {
    background: #fff3cd; border: 2px solid #cc9a00; color: #7a5c00;
    padding: 10px 14px; font-weight: bold; font-size: 15px; margin-bottom: 18px;
    text-align: center;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .seller { font-size: 13px; color: #444; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #ccc; padding: 12px 8px; vertical-align: top; }
  td.img { width: 130px; }
  .sku { font-weight: bold; font-size: 14px; }
  .name { font-size: 13px; margin-top: 2px; }
  .spec { font-size: 12px; color: #555; margin-top: 4px; }
  .moq { font-size: 12px; margin-top: 6px; }
  .price { font-size: 13px; font-weight: bold; color: #a4270a; margin-top: 2px; }
  .footer { margin-top: 24px; font-size: 11px; color: #888; }
</style></head>
<body>
  <div class="fixture-banner">FIXTURE — NOT A REAL QUOTE / 測試用假資料</div>
  <h1>Export Quotation / 出口報價單</h1>
  <div class="seller">Seller: Birdland Enterprise Co., Ltd. — Garden Hand Tools</div>
  <table>
    ${rowsHtml}
  </table>
  <div class="footer">This document is a synthetic test fixture generated for CI pipeline testing. All prices, quantities, and specifications are fabricated and do not represent real products or offers.</div>
</body></html>`;
}

(async () => {
  const pngPaths = ITEMS.map((item, i) => path.join(FIXTURES, `._tmp-${item.sku}.png`));
  for (let i = 0; i < ITEMS.length; i++) {
    await makeItemPng(ITEMS[i], pngPaths[i]);
  }

  const rowsHtml = ITEMS.map((item, i) => rowHtml(item, toDataUri(pngPaths[i]))).join('\n');
  const html = pageHtml(rowsHtml);

  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  const outPdf = path.join(FIXTURES, 'promo-sample.pdf');
  await page.pdf({
    path: outPdf,
    format: 'A4',
    margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    printBackground: true,
  });
  await browser.close();

  // Clean up temp PNGs — the PDF has them embedded already.
  for (const p of pngPaths) { try { fs.unlinkSync(p); } catch (_) {} }

  const size = fs.statSync(outPdf).size;
  console.log('wrote ' + outPdf + ' (' + size + ' bytes)');
})().catch(e => { console.error(e); process.exit(1); });
