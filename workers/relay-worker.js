const UPSTREAM_BASE = 'https://opencode.ai/zen/go/v1';
const PROXY_PREFIX = '/opencode-go/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization,content-type,x-drift-upstream-base',
  'Access-Control-Max-Age': '86400'
};

function withCors(headers = {}) {
  return new Headers({
    ...Object.fromEntries(headers),
    ...corsHeaders
  });
}

function upstreamUrlFor(request) {
  const url = new URL(request.url);
  const upstreamPath = url.pathname.startsWith(PROXY_PREFIX)
    ? url.pathname.slice(PROXY_PREFIX.length)
    : url.pathname;
  return `${UPSTREAM_BASE}${upstreamPath}${url.search}`;
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const headers = new Headers();
    headers.set('accept', request.headers.get('accept') || 'application/json');
    headers.set('content-type', request.headers.get('content-type') || 'application/json');

    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('authorization', authorization);

    const response = await fetch(upstreamUrlFor(request), {
      method: request.method,
      headers,
      body: request.method === 'POST' ? request.body : undefined
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: withCors(response.headers)
    });
  }
};
