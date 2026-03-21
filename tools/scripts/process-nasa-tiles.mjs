#!/usr/bin/env node

/**
 * NASA Earth-at-Night Tile Processor
 *
 * Downloads the 8 full-resolution (500 m/pixel) NASA Black Marble 2016 Color
 * JPEG tiles and processes them into a Z/X/Y tile pyramid for progressive loading.
 *
 * NASA source: 8 GeoTIFF files arranged in a 4-column × 2-row grid (A1–D2).
 *   A1 B1 C1 D1   (top row, left to right)
 *   A2 B2 C2 D2   (bottom row, left to right)
 * Each source tile is ~21,600 × 21,600 pixels.  Full composite: 86,400 × 43,200.
 *
 * Zoom levels produced (all output tiles resized to 2048×2048 for WebGL):
 *   z0 — 1×1   (single tile, downsampled composite → 2700×1350)
 *   z1 — 4×2   (8 tiles — each source resized to 2048×2048)
 *   z2 — 8×4   (32 tiles — each source quadrant resized to 2048×2048)
 *
 * Usage:
 *   node tools/scripts/process-nasa-tiles.mjs --download --process --outputDir ./tiles
 *   node tools/scripts/process-nasa-tiles.mjs --process --sourceDir ./nasa-sources --outputDir ./tiles
 *   node tools/scripts/process-nasa-tiles.mjs --help
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    download:   { type: 'boolean', default: false },
    process:    { type: 'boolean', default: false },
    outputDir:  { type: 'string',  default: './tiles' },
    sourceDir:  { type: 'string',  default: '' },
    help:       { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(`
NASA Earth-at-Night Tile Processor (Full Resolution — 500 m)

Downloads the 8 pre-tiled NASA Black Marble 2016 Color source images and
slices them into a Z/X/Y tile pyramid (z0, z1, z2).

Options:
  --download          Download the 8 NASA source tiles (~250 MB total)
  --process           Process source tiles into the Z/X/Y pyramid
  --outputDir <dir>   Output directory for tiles (default: ./tiles)
  --sourceDir <dir>   Directory containing already-downloaded source .jpg files
  --help              Show this help message

Examples:
  # Download from NASA and process in one step
  node tools/scripts/process-nasa-tiles.mjs --download --process

  # Process already-downloaded tiles (e.g. downloaded via browser)
  node tools/scripts/process-nasa-tiles.mjs --process --sourceDir ./nasa-downloads

Source tiles expected (download from https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/):
  BlackMarble_2016_A1.jpg
  BlackMarble_2016_B1.jpg
  BlackMarble_2016_C1.jpg
  BlackMarble_2016_D1.jpg
  BlackMarble_2016_A2.jpg
  BlackMarble_2016_B2.jpg
  BlackMarble_2016_C2.jpg
  BlackMarble_2016_D2.jpg
  `);
  process.exit(0);
}

// ── NASA source tile grid ─────────────────────────────────────────────

// Column labels A–D (left to right), row labels 1–2 (top to bottom).
const COLS = ['A', 'B', 'C', 'D'];
const ROWS = ['1', '2'];

const NASA_BASE_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898';

/** Build the NASA download URL for a given column/row label. */
function nasaSourceUrl(col, row) {
  return `${NASA_BASE_URL}/BlackMarble_2016_${col}${row}.jpg`;
}

/** Build the expected local filename for a source tile. */
function sourceFileName(col, row) {
  return `BlackMarble_2016_${col}${row}.jpg`;
}

// Output zoom level definitions
const ZOOM_LEVELS = [
  { z: 0, cols: 1, rows: 1 },
  { z: 1, cols: 4, rows: 2 },
  { z: 2, cols: 8, rows: 4 },
];

const WEBP_QUALITY = 85;
const JPEG_QUALITY = 90;
const MAX_RETRIES = 3;

// ── Download ──────────────────────────────────────────────────────────

/**
 * Download a file with exponential backoff retry.
 */
async function downloadFile(url, destPath) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  Downloading (attempt ${attempt}/${MAX_RETRIES})...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(destPath, buffer);
      console.log(`  ✓ ${destPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`  Attempt ${attempt} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Download all 8 NASA source tiles to the given directory.
 */
async function downloadAllSources(destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const row of ROWS) {
    for (const col of COLS) {
      const filename = sourceFileName(col, row);
      const destPath = join(destDir, filename);
      if (existsSync(destPath)) {
        console.log(`  Skipping ${filename} (already exists)`);
        continue;
      }
      const url = nasaSourceUrl(col, row);
      console.log(`\nFetching ${col}${row}: ${url}`);
      await downloadFile(url, destPath);
    }
  }
}

// ── Processing ────────────────────────────────────────────────────────

/**
 * Process the 8 NASA source tiles into a Z/X/Y tile pyramid.
 *
 * Grid layout (source tile → z1 index):
 *   A1(0,0) B1(1,0) C1(2,0) D1(3,0)   ← row 1 (top)
 *   A2(0,1) B2(1,1) C2(2,1) D2(3,1)   ← row 2 (bottom)
 */
async function processTiles(sourceDir, outputDir) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Error: "sharp" is not installed. Run: npm install --save-dev sharp');
    process.exit(1);
  }

  // NASA 500m tiles are 21600×21600 (~466 Mpx) — raise sharp's pixel limit
  // In sharp 0.33+, limitInputPixels is a per-call option, not a static method.
  const sharpOpts = { limitInputPixels: false };
  const sharpOpen = (path) => sharp(path, sharpOpts);

  // Verify all 8 source tiles exist
  const sourcePaths = {};
  for (const row of ROWS) {
    for (const col of COLS) {
      const filename = sourceFileName(col, row);
      const p = join(sourceDir, filename);
      if (!existsSync(p)) {
        console.error(`Missing source tile: ${p}`);
        console.error(
          'Download all 8 tiles from https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/'
        );
        process.exit(1);
      }
      sourcePaths[`${col}${row}`] = p;
    }
  }

  // Read one tile to get dimensions
  const sampleMeta = await sharpOpen(sourcePaths['A1']).metadata();
  const srcTileW = sampleMeta.width;
  const srcTileH = sampleMeta.height;
  console.log(`Source tile size: ${srcTileW}×${srcTileH}`);
  console.log(`Full composite would be: ${srcTileW * 4}×${srcTileH * 2}`);

  // Target output tile size — 2048 is the sweet spot for WebGL textures
  // (8 MB GPU memory each, ~1-2 MB compressed download)
  const OUT_TILE = 2048;

  // ── z1: Resize each NASA tile to OUT_TILE × OUT_TILE ──
  console.log(`\n── z1 (4×2 = 8 tiles, ${OUT_TILE}×${OUT_TILE} each) ──`);
  for (let yi = 0; yi < ROWS.length; yi++) {
    for (let xi = 0; xi < COLS.length; xi++) {
      const key = `${COLS[xi]}${ROWS[yi]}`;
      const tileDir = join(outputDir, '1', String(xi));
      mkdirSync(tileDir, { recursive: true });

      const resized = await sharpOpen(sourcePaths[key])
        .resize(OUT_TILE, OUT_TILE)
        .toBuffer();
      await sharp(resized).webp({ quality: WEBP_QUALITY }).toFile(join(tileDir, `${yi}.webp`));
      await sharp(resized).jpeg({ quality: JPEG_QUALITY }).toFile(join(tileDir, `${yi}.jpg`));
      process.stdout.write(`  z1/${xi}/${yi} ✓  `);
    }
  }
  console.log();

  // ── z2: Extract quadrant from each NASA tile, resize to OUT_TILE × OUT_TILE ──
  console.log(`\n── z2 (8×4 = 32 tiles, ${OUT_TILE}×${OUT_TILE} each) ──`);
  const halfW = Math.floor(srcTileW / 2);
  const halfH = Math.floor(srcTileH / 2);

  for (let yi = 0; yi < ROWS.length; yi++) {
    for (let xi = 0; xi < COLS.length; xi++) {
      const key = `${COLS[xi]}${ROWS[yi]}`;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const z2x = xi * 2 + sx;
          const z2y = yi * 2 + sy;
          const tileDir = join(outputDir, '2', String(z2x));
          mkdirSync(tileDir, { recursive: true });

          const left = sx * halfW;
          const top = sy * halfH;
          const extractW = sx === 1 ? srcTileW - left : halfW;
          const extractH = sy === 1 ? srcTileH - top : halfH;

          const buf = await sharpOpen(sourcePaths[key])
            .extract({ left, top, width: extractW, height: extractH })
            .resize(OUT_TILE, OUT_TILE)
            .toBuffer();

          await sharp(buf).webp({ quality: WEBP_QUALITY }).toFile(join(tileDir, `${z2y}.webp`));
          await sharp(buf).jpeg({ quality: JPEG_QUALITY }).toFile(join(tileDir, `${z2y}.jpg`));
          process.stdout.write(`  z2/${z2x}/${z2y} ✓  `);
        }
      }
    }
  }
  console.log();

  // ── z0: Composite small thumbnails into a single tile ──
  console.log('\n── z0 (1×1 = 1 tile) ──');
  mkdirSync(join(outputDir, '0', '0'), { recursive: true });

  const z0Width = 2700;
  const z0Height = 1350;
  // Each source tile becomes a 675×675 thumbnail
  const thumbW = z0Width / 4;
  const thumbH = z0Height / 2;

  const thumbInputs = [];
  for (let yi = 0; yi < ROWS.length; yi++) {
    for (let xi = 0; xi < COLS.length; xi++) {
      const key = `${COLS[xi]}${ROWS[yi]}`;
      const thumb = await sharpOpen(sourcePaths[key])
        .resize(Math.round(thumbW), Math.round(thumbH))
        .toBuffer();
      thumbInputs.push({
        input: thumb,
        left: Math.round(xi * thumbW),
        top: Math.round(yi * thumbH),
      });
    }
  }

  const z0 = sharp({
    create: { width: z0Width, height: z0Height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).composite(thumbInputs);

  await z0.clone().webp({ quality: WEBP_QUALITY }).toFile(join(outputDir, '0', '0', '0.webp'));
  await z0.clone().jpeg({ quality: JPEG_QUALITY }).toFile(join(outputDir, '0', '0', '0.jpg'));
  console.log('  z0/0/0 ✓');

  // ── Manifest ──
  const manifest = {
    dataset: 'NASA Black Marble 2016 Color',
    sourceResolution: '500m',
    fullComposite: `${srcTileW * 4}×${srcTileH * 2}`,
    generatedAt: new Date().toISOString(),
    urlPattern: '{z}/{x}/{y}.{ext}',
    formats: ['webp', 'jpg'],
    zoomLevels: ZOOM_LEVELS.map(({ z, cols, rows }) => {
      const tw = z === 0 ? z0Width : OUT_TILE;
      const th = z === 0 ? z0Height : OUT_TILE;
      return { z, cols, rows, tileWidth: tw, tileHeight: th };
    }),
  };

  const manifestPath = join(outputDir, 'tile-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${manifestPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  if (!args.download && !args.process) {
    console.error('Specify --download, --process, or both. Use --help for details.');
    process.exit(1);
  }

  const outputDir = args.outputDir;
  mkdirSync(outputDir, { recursive: true });

  // Source directory: where the 8 .tif files live (or will be downloaded to)
  const sourceDir = args.sourceDir || join(outputDir, '_sources');

  if (args.download) {
    console.log('Downloading 8 NASA Black Marble 2016 Color source tiles...');
    console.log(`Source directory: ${sourceDir}\n`);
    await downloadAllSources(sourceDir);
    console.log('\nAll source tiles downloaded.');
  }

  if (args.process) {
    console.log(`\nProcessing tiles from ${sourceDir} → ${outputDir}`);
    await processTiles(sourceDir, outputDir);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
