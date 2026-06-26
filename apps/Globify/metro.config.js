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
        // Inject dark loading shell into the root HTML before the JS bundle arrives
        const isRootHtml = req.url === '/' || (req.url && req.url.startsWith('/?'));
        if (isRootHtml) {
          const origWriteHead = res.writeHead.bind(res);
          const origEnd = res.end.bind(res);
          // Strip Content-Length so the browser doesn't truncate our injected content
          res.writeHead = (statusCode, headers) => {
            const h = { ...(headers || {}) };
            delete h['content-length'];
            delete h['Content-Length'];
            return origWriteHead(statusCode, h);
          };
          res.end = (chunk, encoding, cb) => {
            const html = chunk ? chunk.toString() : '';
            const shell = `<style>html,body{background:#000}#loading-shell{position:fixed;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;z-index:9999;transition:opacity .3s}#loading-shell.gone{opacity:0;pointer-events:none}.sp{width:44px;height:44px;border:3px solid rgba(255,255,255,.12);border-top-color:rgba(255,255,255,.85);border-radius:50%;animation:spin .75s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.sl{color:rgba(255,255,255,.35);font:13px -apple-system,sans-serif;letter-spacing:.04em}</style><div id="loading-shell"><div class="sp"></div><span class="sl">Globify</span></div><script>window.__hideLoadingShell=function(){var e=document.getElementById('loading-shell');if(e){e.classList.add('gone');setTimeout(function(){e.remove()},350)}}</script>`;
            const modified = html.includes('<script')
              ? html.replace('<script', shell + '<script')
              : html + shell;
            return origEnd(modified, encoding, cb);
          };
          return middleware(req, res, next);
        }

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
