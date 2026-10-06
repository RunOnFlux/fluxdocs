// Every address of the reference: the ones Scalar builds (pathRouting under
// /fluxapi) and the ones Redocly used. The build writes a file for each, so a
// static host - GitHub Pages - answers all of them with 200. Without them a
// deep link would load through the host's 404 page: it still renders, but
// search engines treat a 404 as a missing page.
import { readFileSync } from 'node:fs';
import { redoclySlug } from './markdown.mjs';

const SITE = 'https://docs.runonflux.io/fluxapi';
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const INVISIBLE = new RegExp(
  `[${String.fromCharCode(0xfe0e, 0xfe0f, 0x200d)}]`,
  'g',
);

// @scalar/helpers slugify, as Scalar applies it to tags, headings and models.
export const scalarSlug = (text, { preserveCase = false } = {}) => {
  const normalized = text.slice(0, 255).trim().normalize('NFC');
  return (preserveCase ? normalized : normalized.toLowerCase())
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// What the page's generateHeadingSlug (site/index.html) makes of Scalar's.
const headingSlug = (text) =>
  scalarSlug(text).replace(INVISIBLE, '').replace(/^-+/, '');

// Headings of the introduction (info.description) with the text under each,
// skipping "#" lines inside code blocks, which are comments, not headings.
export const introHeadings = (description) => {
  const headings = [];
  let fence = false;
  for (const line of description.split('\n')) {
    const heading = !fence && /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      headings.push({
        level: heading[1].length,
        text: heading[2].trim(),
        body: '',
      });
    } else if (headings.length) {
      headings[headings.length - 1].body += `${line}\n`;
    }
    if (/^```/.test(line.trim())) fence = !fence;
  }
  return headings;
};

// A meta description: the text without markdown or the trailing privilege
// marker, cut at a word boundary.
const summarize = (markdown, fallback) => {
  const text = String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(
      /\*\*(Public|User|Admin|FluxTeam|AdminAndFluxTeam|AppOwner|AppOwnerAbove)\*\*[^\n]*$/m,
      '',
    )
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#|]/g, '')
    .replace(INVISIBLE, '')
    .replace(/[\p{Extended_Pictographic}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text.length <= 160
    ? text
    : `${text.slice(0, 157).replace(/\s+\S*$/, '')}…`;
};

const label = (text) =>
  text
    .replace(INVISIBLE, '')
    .replace(/[\p{Extended_Pictographic}]/gu, '')
    .trim();

const operationsOf = (spec) =>
  Object.entries(spec.paths).flatMap(([path, item]) =>
    METHODS.filter((m) => item[m]).map((method) => ({
      path,
      method,
      operation: item[method],
    })),
  );

// Pages, as { path, title, description }; path is relative to /fluxapi.
export function pageRoutes(spec) {
  const intro = `Complete API reference for FluxOS ${spec.info.version}, the node software behind the Flux decentralized cloud.`;
  const routes = [
    { path: '', title: 'Flux API Documentation', description: intro },
    {
      path: 'description/introduction',
      title: 'Flux API Documentation',
      description: intro,
    },
  ];

  for (const { text, body } of introHeadings(spec.info.description ?? '')) {
    routes.push({
      path: `description/${headingSlug(text)}`,
      title: `${label(text)} · Flux API`,
      description: summarize(body, intro),
    });
  }

  for (const group of spec['x-tagGroups'] ?? []) {
    routes.push({
      path: `tag-group/${scalarSlug(group.name)}`,
      title: `${group.name} · Flux API`,
      description: `${group.name}: ${group.tags.join(', ')} endpoints of the FluxOS API.`,
    });
  }
  for (const tag of spec.tags ?? []) {
    routes.push({
      path: `tag/${scalarSlug(tag.name)}`,
      title: `${tag.name} endpoints · Flux API`,
      description: summarize(
        tag.description,
        `${tag.name} endpoints of the FluxOS API.`,
      ),
    });
  }
  for (const { path, method, operation } of operationsOf(spec)) {
    for (const tag of operation.tags ?? []) {
      routes.push({
        path: `tag/${scalarSlug(tag)}/${operation.operationId.toLowerCase()}`,
        title: `${operation.summary || operation.operationId} · Flux API`,
        description: summarize(
          operation.description,
          `${method.toUpperCase()} ${path}`,
        ),
      });
    }
  }

  const schemas = Object.keys(spec.components?.schemas ?? {});
  if (schemas.length) {
    routes.push({
      path: 'models',
      title: 'Models · Flux API',
      description: 'Data models of the FluxOS API.',
    });
  }
  for (const name of schemas) {
    routes.push({
      path: `models/${scalarSlug(name, { preserveCase: true })}`,
      title: `${name} model · Flux API`,
      description: summarize(
        spec.components.schemas[name].description,
        `The ${name} data model of the FluxOS API.`,
      ),
    });
  }

  const seen = new Set();
  return routes.filter((r) => !seen.has(r.path) && seen.add(r.path));
}

// Operations FluxOS no longer routes (site/removed-operations.json, recorded
// from the spec before they were taken out). Their old addresses lead to the
// note that says so, instead of a 404.
const removedOperations = JSON.parse(
  readFileSync(
    new URL('../site/removed-operations.json', import.meta.url),
    'utf8',
  ),
).operations;

// Redocly's addresses, and the addresses of removed operations, as
// { from, to }, both relative to /fluxapi.
export function redoclyRedirects(spec) {
  const redirects = [{ from: 'section/flux-api-documentation', to: '' }];
  for (const { level, text } of introHeadings(spec.info.description ?? '')) {
    if (level === 1) continue; // Redocly linked the title as the section root
    redirects.push({
      from: `section/flux-api-documentation/${redoclySlug(text)}`,
      to: `description/${headingSlug(text)}`,
    });
  }
  for (const tag of spec.tags ?? []) {
    redirects.push({
      from: redoclySlug(tag.name),
      to: `tag/${scalarSlug(tag.name)}`,
    });
  }
  for (const { operation } of operationsOf(spec)) {
    const id = operation.operationId.toLowerCase();
    for (const tag of operation.tags ?? []) {
      redirects.push({
        from: `${redoclySlug(tag)}/${id}`,
        to: `tag/${scalarSlug(tag)}/${id}`,
      });
    }
  }
  const headings = introHeadings(spec.info.description ?? '').map(
    (h) => h.text,
  );
  const notes = headings.includes('Deprecated & Removed Endpoints')
    ? `description/${headingSlug('Deprecated & Removed Endpoints')}`
    : '';
  for (const { operationId, tags } of removedOperations) {
    const id = operationId.toLowerCase();
    for (const tag of tags) {
      redirects.push({ from: `${redoclySlug(tag)}/${id}`, to: notes });
      redirects.push({ from: `tag/${scalarSlug(tag)}/${id}`, to: notes });
    }
  }
  const seen = new Set();
  return redirects.filter((r) => !seen.has(r.from) && seen.add(r.from));
}

export const canonicalUrl = (path) => `${SITE}/${path ? `${path}/` : ''}`;
