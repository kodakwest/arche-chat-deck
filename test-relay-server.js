const assert = require('node:assert/strict');
const http = require('node:http');
const { createRelayServer } = require('./relay-server.js');

function listen(server, host = '127.0.0.1', port = 0) {
  return new Promise(resolve => {
    server.listen(port, host, () => {
      const address = server.address();
      assert.equal(typeof address, 'object');
      resolve(`http://${host}:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(err => (err ? reject(err) : resolve()));
  });
}

let upstreamRequest = null;
const upstreamServer = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    upstreamRequest = {
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      contentType: req.headers['content-type'],
      body: Buffer.concat(chunks).toString('utf8')
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content: 'proxied ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 2 }
    }));
  });
});

(async () => {
  const upstreamBase = await listen(upstreamServer);
  const relayServer = createRelayServer({ upstreamBase });
  const relayBase = await listen(relayServer);

  try {
    const preflight = await fetch(`${relayBase}/opencode-go/v1/chat/completions`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'file://',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,x-drift-upstream-base'
      }
    });

    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);
    assert.match(preflight.headers.get('access-control-allow-headers') || '', /x-drift-upstream-base/);

    const body = {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }]
    };
    const response = await fetch(`${relayBase}/opencode-go/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Origin: 'file://',
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
        'x-drift-upstream-base': upstreamBase
      },
      body: JSON.stringify(body)
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(await response.json(), {
      choices: [{ message: { content: 'proxied ok' } }],
      usage: { prompt_tokens: 1, completion_tokens: 2 }
    });

    assert.deepEqual(upstreamRequest, {
      method: 'POST',
      url: '/chat/completions',
      authorization: 'Bearer test-key',
      contentType: 'application/json',
      body: JSON.stringify(body)
    });

    console.log('PASS: relay server returns CORS headers and proxies OpenCode Go requests');
  } finally {
    await close(relayServer);
    await close(upstreamServer);
  }
})();
