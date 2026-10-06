// Serves dist/ the way GitHub Pages does, so a local preview behaves like the
// live site: a file is served as it is, a folder without a trailing slash is
// redirected to one, a folder serves its index.html, anything else gets
// 404.html with status 404.
//
// It also relays the Flux AI assistant under /ownllm. The assistant answers
// only allowlisted sites, so from localhost its widget would fail with "Lost
// the connection"; the page points the widget here when it runs locally.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';

const root = 'dist';
const port = Number(process.env.PORT) || 4000;
const assistant = 'https://ownllmrouter.app.runonflux.io';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const kind = (path) => {
  try {
    const stat = statSync(path);
    return stat.isFile() ? 'file' : stat.isDirectory() ? 'dir' : null;
  } catch {
    return null;
  }
};

const send = (res, status, file) => {
  res.writeHead(status, {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
};

const relay = async (req, res, path) => {
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : req;
  try {
    const upstream = await fetch(assistant + path, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] ?? 'application/json',
        Origin: 'https://docs.runonflux.io',
      },
      body,
      duplex: 'half',
    });
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/plain',
    });
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' }).end(err.message);
  }
};

createServer((req, res) => {
  const { pathname, search } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/ownllm/')) {
    relay(req, res, pathname.slice('/ownllm'.length) + search);
    return;
  }
  const path = join(
    root,
    normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ''),
  );
  const found = kind(path);
  if (found === 'file') return send(res, 200, path);
  if (found === 'dir' && kind(join(path, 'index.html')) === 'file') {
    if (!pathname.endsWith('/')) {
      res.writeHead(301, { Location: `${pathname}/${search}` }).end();
      return;
    }
    return send(res, 200, join(path, 'index.html'));
  }
  send(res, 404, join(root, '404.html'));
}).listen(port, () =>
  console.log(`Flux API docs on http://localhost:${port}/fluxapi/`),
);
