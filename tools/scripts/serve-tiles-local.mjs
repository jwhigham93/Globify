#!/usr/bin/env node

/**
 * Local tile server for development.
 *
 * Serves the processed NASA tile pyramid over HTTP with CORS headers,
 * so the Globify app can load tiles without a CDN.
 *
 * Usage:
 *   node tools/scripts/serve-tiles-local.mjs [--port 3001] [--tilesDir ./tiles]
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    port:     { type: 'string', default: '3001' },
    tilesDir: { type: 'string', default: './tiles' },
  },
});

const PORT = parseInt(args.port, 10);
const TILES_DIR = args.tilesDir;

if (!existsSync(TILES_DIR)) {
  console.error(`Tiles directory not found: ${TILES_DIR}`);
  console.error('Run the tile processor first:');
  console.error('  node tools/scripts/process-nasa-tiles.mjs --download --process');
  process.exit(1);
}

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Strip leading slash and query params
  const urlPath = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
  const filePath = join(TILES_DIR, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(TILES_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=86400',
  });
  res.end(readFileSync(filePath));
});

server.listen(PORT, () => {
  console.log(`Tile server running at http://localhost:${PORT}`);
  console.log(`Serving tiles from: ${TILES_DIR}`);
  console.log(`\nSet TILE_CDN_URL=http://localhost:${PORT} in your app config.`);
});
