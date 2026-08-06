#!/usr/bin/env node
/**
 * Generates sitemap.xml for birdland.com.tw
 *
 * Rerun this script when pages are added or removed from:
 * - repo root (*.html files)
 * - language folders (nl/, de/, fr/, es/, pt-br/, pl/, it/, ja/, zh-tw/)
 *
 * Pages with <meta name="robots" content="noindex"> or names containing
 * "vault"/"encrypt" are automatically excluded.
 */

const fs = require('fs');
const path = require('path');

// Language folders to scan
const LANGS = ['nl', 'de', 'fr', 'es', 'pt-br', 'pl', 'it', 'ja', 'zh-tw'];
const DOMAIN = 'https://birdland.com.tw';

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

/**
 * Check if an HTML file contains noindex meta tag
 */
function hasNoindex(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return /meta\s+name\s*=\s*["']robots["']\s+content\s*=\s*["']([^"']*)noindex/i.test(content) ||
           /content\s*=\s*["']([^"']*)noindex([^"']*)["']\s+name\s*=\s*["']robots["']/i.test(content);
  } catch (e) {
    return true; // exclude on read error
  }
}

/**
 * Build list of HTML files to include in sitemap
 */
function collectPages() {
  const pages = [];

  // Root directory HTML files
  const rootDir = path.join(__dirname, '..', '..');
  const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(rootDir, file);

    // Skip excluded files
    if (file === '404.html' || file.includes('vault') || file.includes('encrypt')) {
      continue;
    }

    // Skip files with noindex
    if (hasNoindex(filePath)) {
      continue;
    }

    // Convert index.html to /
    const urlPath = file === 'index.html' ? '' : file;
    pages.push({
      url: `${DOMAIN}/${urlPath}`,
      lastmod: today
    });
  }

  // Language folders
  for (const lang of LANGS) {
    const langDir = path.join(rootDir, lang);

    if (!fs.existsSync(langDir)) continue;

    const langFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.html'));

    for (const file of langFiles) {
      const filePath = path.join(langDir, file);

      // Skip excluded files
      if (file === '404.html' || file.includes('vault') || file.includes('encrypt')) {
        continue;
      }

      // Skip files with noindex
      if (hasNoindex(filePath)) {
        continue;
      }

      // Convert index.html to /{lang}/
      const urlPath = file === 'index.html' ? '' : file;
      pages.push({
        url: `${DOMAIN}/${lang}/${urlPath}`,
        lastmod: today
      });
    }
  }

  return pages;
}

/**
 * Generate XML sitemap
 */
function generateSitemap(pages) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(page => (
      `  <url>\n    <loc>${page.url}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n  </url>`
    )),
    '</urlset>',
    '' // trailing newline
  ].join('\n');

  return xml;
}

/**
 * Main
 */
function main() {
  const pages = collectPages();
  const xml = generateSitemap(pages);

  const outputPath = path.join(__dirname, '..', '..', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');

  console.log(`Generated sitemap.xml with ${pages.length} URLs`);
  console.log(`Output: ${outputPath}`);
}

main();
