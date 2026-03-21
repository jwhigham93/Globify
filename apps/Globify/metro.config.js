const { withNxMetro } = require('@nx/expo');
const { getDefaultConfig } = require('@expo/metro-config');
const { mergeConfig } = require('metro-config');
const { existsSync, readFileSync, statSync } = require('node:fs');
const { join, extname, resolve } = require('node:path');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

// Workspace-root tiles directory (populated by `make tiles`)
const TILES_DIR = resolve(__dirname, '..', '..', 'tiles');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const customConfig = {
  cacheVersion: 'Globify-v4',
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: [...assetExts.filter((ext) => ext !== 'svg'), 'glb', 'gltf'],
    sourceExts: [...sourceExts, 'cjs', 'mjs', 'svg'],
  },
  server: {
    // Serve NASA tile imagery from {workspaceRoot}/tiles/ so no separate
    // tile server is needed during development.
    enhanceMiddleware: (middleware) => {
      const MIME = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.json': 'application/json',
      };

      return (req, res, next) => {
        if (req.url && req.url.startsWith('/tiles/')) {
          const relativePath = decodeURIComponent(
            req.url.split('?')[0].slice('/tiles/'.length),
          );
          const filePath = join(TILES_DIR, relativePath);

          // Prevent directory traversal
          if (!filePath.startsWith(TILES_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
          }

          try {
            if (existsSync(filePath) && statSync(filePath).isFile()) {
              const ct = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
              res.writeHead(200, {
                'Content-Type': ct,
                'Cache-Control': 'public, max-age=86400',
              });
              res.end(readFileSync(filePath));
              return;
            }
          } catch {
            // fall through to 404
          }

          res.writeHead(404);
          res.end('Not found');
          return;
        }

        return middleware(req, res, next);
      };
    },
  },
};

module.exports = withNxMetro(mergeConfig(defaultConfig, customConfig), {
  debug: false,
  extensions: [],
  watchFolders: [],
});
