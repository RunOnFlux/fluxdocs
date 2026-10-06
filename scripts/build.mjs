// Builds the static site into dist/ for GitHub Pages:
//
//   dist/fluxapi/**/index.html  the API reference (Scalar): one page per
//                               address, each with its own title and
//                               description, so every link answers 200
//   dist/fluxapi/<old>/         a redirect for every Redocly-era address
//   dist/index.html             redirect to /fluxapi/
//   dist/404.html               the reference again, for anything else
//   dist/fluxapi.json|yaml      the spec, loaded by the page and offered for download
//   dist/fluxapi.md             the reference as markdown, for language models
//   dist/llms.txt               index for language models (llmstxt.org)
//   dist/sitemap.xml, robots.txt
//   dist/assets/                Scalar bundle (versioned file name), Flux styles and script
//   dist/CNAME, dist/.nojekyll  GitHub Pages: custom domain, files served as they are
//
// scripts/serve.mjs serves dist/ the way GitHub Pages does.
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { load } from 'js-yaml';
import { apiMarkdown, llmsTxt } from './markdown.mjs';
import {
  canonicalUrl,
  introHeadings,
  pageRoutes,
  redoclyRedirects,
  scalarSlug,
} from './routes.mjs';

const out = 'dist';
const scalarDir = 'node_modules/@scalar/api-reference';
const scalarVersion = JSON.parse(
  readFileSync(`${scalarDir}/package.json`, 'utf8'),
).version;
const scalarFile = `scalar-${scalarVersion}.js`;

const hash = (text) =>
  createHash('sha256').update(text).digest('hex').slice(0, 12);

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const write = (path, content) => {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, content);
};

rmSync(out, { recursive: true, force: true });

const specYaml = readFileSync('fluxapi.yaml', 'utf8');
const spec = load(specYaml);
const specJson = JSON.stringify(spec);
write(`${out}/fluxapi.json`, specJson);
write(`${out}/fluxapi.yaml`, specYaml);
write(`${out}/fluxapi.md`, apiMarkdown(spec));
write(`${out}/llms.txt`, llmsTxt(spec));

const css = readFileSync('site/flux.css', 'utf8');
write(`${out}/assets/flux.css`, css);
const js = readFileSync('site/flux.js', 'utf8');
write(`${out}/assets/flux.js`, js);
copyFileSync(
  `${scalarDir}/dist/browser/standalone.js`,
  `${out}/assets/${scalarFile}`,
);
copyFileSync('favicon.ico', `${out}/favicon.ico`);
copyFileSync('flux_logo.png', `${out}/flux_logo.png`);
copyFileSync('CNAME', `${out}/CNAME`);
write(`${out}/.nojekyll`, '');

// The page shared by every address; only its head differs.
const headingSlugs = introHeadings(spec.info.description ?? '').map((h) =>
  scalarSlug(h.text),
);
const template = readFileSync('site/index.html', 'utf8')
  .replaceAll('{{HEADING_SLUGS}}', JSON.stringify(headingSlugs))
  .replaceAll('{{VERSION}}', spec.info.version)
  .replaceAll('{{SCALAR_FILE}}', scalarFile)
  .replaceAll('{{CSS_HASH}}', hash(css))
  .replaceAll('{{JS_HASH}}', hash(js))
  .replaceAll('{{YEAR}}', String(new Date().getFullYear()))
  .replaceAll('{{SPEC_HASH}}', hash(specJson));
const page = ({ title, description, canonical, robots = 'index, follow' }) =>
  template
    .replaceAll('{{TITLE}}', escapeHtml(title))
    .replaceAll('{{DESCRIPTION}}', escapeHtml(description))
    .replaceAll('{{CANONICAL}}', canonical)
    .replaceAll('{{ROBOTS}}', robots);

const routes = pageRoutes(spec);
for (const route of routes) {
  const dir = `${out}/fluxapi${route.path ? `/${route.path}` : ''}`;
  // The introduction is the reference's first page under a second address.
  const canonical = canonicalUrl(
    route.path === 'description/introduction' ? '' : route.path,
  );
  write(`${dir}/index.html`, page({ ...route, canonical }));
}

const taken = new Set(routes.map((r) => r.path));
const redirects = redoclyRedirects(spec).filter((r) => !taken.has(r.from));
for (const { from, to } of redirects) {
  const target = `/fluxapi/${to ? `${to}/` : ''}`;
  write(
    `${out}/fluxapi/${from}/index.html`,
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Flux API Documentation</title><meta name="robots" content="noindex">' +
      `<link rel="canonical" href="${canonicalUrl(to)}">` +
      `<meta http-equiv="refresh" content="0; url=${target}">` +
      `<script>location.replace(${JSON.stringify(target)} + location.hash)</script>` +
      `</head><body><a href="${target}">This page has moved.</a></body></html>\n`,
  );
}

write(
  `${out}/404.html`,
  page({
    title: 'Page not found · Flux API',
    description: 'This page of the Flux API reference does not exist.',
    canonical: canonicalUrl(''),
    robots: 'noindex',
  }),
);
write(
  `${out}/index.html`,
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    `<title>Flux API Documentation</title><link rel="canonical" href="${canonicalUrl('')}">` +
    '<meta http-equiv="refresh" content="0; url=/fluxapi/"></head>' +
    '<body><a href="/fluxapi/">Flux API Documentation</a></body></html>\n',
);
write(
  `${out}/sitemap.xml`,
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    routes
      .filter((r) => r.path !== 'description/introduction')
      .map((r) => `  <url><loc>${canonicalUrl(r.path)}</loc></url>\n`)
      .join('') +
    '</urlset>\n',
);
write(
  `${out}/robots.txt`,
  'User-agent: *\nAllow: /\n\nSitemap: https://docs.runonflux.io/sitemap.xml\n',
);

console.log(
  `Built FluxOS ${spec.info.version} reference with Scalar ${scalarVersion}: ` +
    `${routes.length} pages, ${redirects.length} Redocly redirects, in ${out}/`,
);
