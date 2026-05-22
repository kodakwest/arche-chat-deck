const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8787;
const OPENCODE_GO_UPSTREAM_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_GO_PROXY_PREFIX = '/opencode-go/v1';
const rootDir = __dirname;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type,x-drift-upstream-base');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function serveStatic(req, res, staticRoot = rootDir) {
  const url = new URL(req.url, `http://${req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`}`);
  const pathname = url.pathname === '/' ? '/drift_chat_suite.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(staticRoot, pathname));

  if (!filePath.startsWith(staticRoot + path.sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function getUpstreamBase(req, fallbackUpstreamBase) {
  const requested = String(req.headers['x-drift-upstream-base'] || fallbackUpstreamBase || '').trim().replace(/\/+$/, '');
  const allowed = String(fallbackUpstreamBase || OPENCODE_GO_UPSTREAM_BASE_URL).trim().replace(/\/+$/, '');
  return requested === allowed ? requested : allowed;
}

function sanitizeProxyResponseHeaders(headers) {
  const responseHeaders = { ...headers };
  delete responseHeaders['content-encoding'];
  delete responseHeaders['transfer-encoding'];
  delete responseHeaders.connection;
  delete responseHeaders['keep-alive'];
  return responseHeaders;
}

function proxyOpenCode(req, res, options = {}) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    send(res, 405, 'Method not allowed');
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`}`);
  const upstreamPath = requestUrl.pathname.replace(new RegExp(`^${OPENCODE_GO_PROXY_PREFIX}`), '');
  const upstreamBase = getUpstreamBase(req, options.upstreamBase || OPENCODE_GO_UPSTREAM_BASE_URL);
  const upstreamUrl = new URL(`${upstreamBase}${upstreamPath}${requestUrl.search}`);
  const transport = upstreamUrl.protocol === 'http:' ? http : https;
  const headers = {
    accept: req.headers.accept || 'application/json',
    authorization: req.headers.authorization || '',
    'content-type': req.headers['content-type'] || 'application/json'
  };

  const upstreamReq = transport.request(upstreamUrl, { method: req.method, headers }, upstreamRes => {
    const responseHeaders = sanitizeProxyResponseHeaders(upstreamRes.headers);
    setCors(res);
    res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', err => {
    setCors(res);
    send(res, 502, JSON.stringify({ error: err.message }), 'application/json; charset=utf-8');
  });

  req.pipe(upstreamReq);
}

function createRelayServer(options = {}) {
  return http.createServer((req, res) => {
    if (req.url && req.url.startsWith(`${OPENCODE_GO_PROXY_PREFIX}/`)) {
      proxyOpenCode(req, res, options);
      return;
    }

    if (req.url === '/health') {
      setCors(res);
      send(res, 200, 'ok');
      return;
    }

    serveStatic(req, res, options.staticRoot || rootDir);
  });
}

function startRelayServer(options = {}) {
  const host = options.host || process.env.DRIFT_RELAY_HOST || DEFAULT_HOST;
  const port = Number(options.port || process.env.DRIFT_RELAY_PORT || DEFAULT_PORT);
  const server = createRelayServer(options);
  server.listen(port, host, () => {
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : port;
    console.log(`Drift relay listening at http://${host}:${boundPort}/drift_chat_suite.html`);
    console.log(`Proxying OpenCode Go through ${options.upstreamBase || OPENCODE_GO_UPSTREAM_BASE_URL}`);
  });
  return server;
}

if (require.main === module) {
  startRelayServer();
}

module.exports = {
  createRelayServer,
  startRelayServer,
  setCors,
  OPENCODE_GO_UPSTREAM_BASE_URL,
  OPENCODE_GO_PROXY_PREFIX
};
