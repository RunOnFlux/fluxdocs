// The API reference as one markdown document, for language models: the Flux AI
// assistant indexes it (ownllm, images/docsbot INDEX_DOCS) and other tools can
// read it from /fluxapi.md (listed in /llms.txt).
//
// Every "## " heading starts a self-contained section and carries the page to
// cite: "## Title <https://...>". The assistant's index splits on those lines,
// embeds each section on its own and matches keywords against its text only,
// so each section repeats what it is about (method, path, operationId, auth)
// and stays under ~1,800 characters, about what its embedding model reads.
//
// Links use the Redocly-era paths (/fluxapi/<tag>/<operationid>,
// /fluxapi/section/flux-api-documentation/<heading>). The current site
// redirects those, so the citations work before and after a site change.

const SITE = 'https://docs.runonflux.io/fluxapi';
const GATEWAY = 'https://api.runonflux.io';
const MAX_SECTION = 1800;
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// Redocly's slug: lowercase words joined by hyphens, "&" spelled "and", dots
// kept ("1.-choose-..."), emoji and other punctuation dropped.
export const redoclySlug = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const tagUrl = (tag) => `${SITE}/${redoclySlug(tag)}`;
const operationUrl = (tag, operation) =>
  `${tagUrl(tag)}/${operation.operationId.toLowerCase()}`;
// Redocly nested every heading under the document's title, and linked the
// title itself (the one level-1 heading) as the section root.
const sectionUrl = (heading, level) =>
  `${SITE}/section/flux-api-documentation${level === 1 ? '' : `/${redoclySlug(heading)}`}`;

const resolve = (spec, node) => {
  let out = node;
  for (let depth = 0; out && out.$ref && depth < 10; depth++) {
    out = out.$ref
      .slice(2)
      .split('/')
      .reduce((value, key) => value?.[key], spec);
  }
  return out;
};

// Keeps a section's text from starting a new section in the index: any line
// that would read as "## " becomes "### ".
const demoteHeadings = (text) => text.replace(/^#{1,2} /gm, '### ');

const oneLine = (text, max) => {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

// Splits text into pieces of at most `max` characters on paragraph
// boundaries, never inside a fenced code block unless one alone is too long.
const splitText = (text, max) => {
  const blocks = [];
  let fence = false;
  for (const line of text.split('\n')) {
    const startsBlock = !fence && (line.trim() === '' || /^```/.test(line));
    if (startsBlock || blocks.length === 0) blocks.push('');
    blocks[blocks.length - 1] += `${line}\n`;
    if (/^```/.test(line.trim())) fence = !fence;
  }
  const pieces = [''];
  for (const block of blocks) {
    if (
      pieces[pieces.length - 1].length + block.length > max &&
      pieces[pieces.length - 1].trim()
    ) {
      pieces.push('');
    }
    pieces[pieces.length - 1] += block;
  }
  return pieces
    .map((piece) =>
      (piece.length > max ? `${piece.slice(0, max - 1)}…` : piece).trim(),
    )
    .filter(Boolean);
};

const schemaSummary = (spec, schema) => {
  const resolved = resolve(spec, schema);
  if (!resolved) return '';
  const properties =
    resolved.properties ?? resolve(spec, resolved.items)?.properties;
  if (!properties) return resolved.type ?? '';
  const required = new Set(resolved.required ?? []);
  return Object.entries(properties)
    .slice(0, 12)
    .map(([name, property]) => {
      const p = resolve(spec, property) ?? {};
      return `${name}${required.has(name) ? '*' : ''} (${p.type ?? 'object'})`;
    })
    .join(', ');
};

// Operation sections never name the header itself: repeated on ~300 sections,
// "zelidauth" stopped telling the keyword index anything, and "how do I get a
// zelidauth header" retrieved random endpoints instead of the auth sections.
const authLine = (operation) => {
  const required = (operation.security ?? []).some(
    (s) => Object.keys(s).length > 0,
  );
  if (!required) return 'Public, no login.';
  const optional = (operation.security ?? []).some(
    (s) => Object.keys(s).length === 0,
  );
  const privilege =
    /\*\*(AdminAndFluxTeam|AppOwnerAbove|AppOwner|FluxTeam|Admin|User)\*\*/.exec(
      operation.description ?? '',
    )?.[1];
  return `${optional ? 'Optional' : 'Requires'} Flux ID login${privilege ? `, privilege ${privilege}` : ''}.`;
};

// How to authenticate, as its own section for each security scheme: the
// scheme's description from the spec plus the steps of the introduction's
// "Complete Authentication Flow", which that section shows as code only.
const securitySections = (spec) =>
  Object.entries(spec.components?.securitySchemes ?? {}).map(([name, scheme]) =>
    [
      `## How to get the ${scheme.name} header (${name} authentication) <${sectionUrl('Complete Authentication Flow')}>`,
      `FluxOS API calls that need a login send a ${scheme.name} ${scheme.in}. ${oneLine(scheme.description, 900)}`,
      '',
      `Steps: 1. GET ${GATEWAY}/id/loginphrase returns a login phrase. ` +
        '2. Sign the phrase with the Flux ID (ZelID) - SSP Wallet, ZelCore, MetaMask personal_sign or WalletConnect. ' +
        `3. POST ${GATEWAY}/id/verifylogin with zelid, loginPhrase and signature. ` +
        `4. Send ${scheme.name}: zelid=<address>&signature=<signature>&loginPhrase=<phrase> on every authenticated call.`,
    ].join('\n'),
  );

// Long examples (a whole signed app spec inline, multi-screen code blocks)
// would make up most of a section and pull its embedding away from what the
// endpoint does; the site keeps them in full.
const trimExamples = (text) =>
  text
    .replace(/`([^`\n]{120,})`/g, (_, code) => `\`${code.slice(0, 80)}…\``)
    .replace(/```[^\n]*\n[\s\S]*?```/g, (block) =>
      block.length > 500 ? `${block.slice(0, 400)}\n…\n\`\`\`` : block,
    );

const operationSection = (spec, path, method, operation) => {
  const tag = operation.tags?.[0] ?? 'Other';
  const title = operation.summary || operation.operationId;
  const heading = `## ${title} (${method.toUpperCase()} ${path}) <${operationUrl(tag, operation)}>`;
  // What the endpoint does comes first, the facts about it after: the
  // embedding model weighs the start of a section most, and identical
  // opening lines made every endpoint look alike to it.
  const lines = [
    `FluxOS API endpoint ${method.toUpperCase()} ${path} (operationId ${operation.operationId}, ${tag}). ${authLine(operation)}`,
  ];
  const parameters = (operation.parameters ?? []).map((p) => resolve(spec, p));
  if (parameters.length) {
    lines.push('Parameters:');
    for (const p of parameters) {
      const type = resolve(spec, p.schema)?.type ?? 'string';
      lines.push(
        `- ${p.name} (${p.in}, ${type}${p.required ? ', required' : ''})${p.description ? `: ${oneLine(p.description, 160)}` : ''}`,
      );
    }
  }
  const body = resolve(spec, operation.requestBody);
  if (body?.content) {
    for (const [type, media] of Object.entries(body.content)) {
      const fields = schemaSummary(spec, media.schema);
      lines.push(
        `Request body (${type})${fields ? `: ${fields}` : ''}${body.description ? ` - ${oneLine(body.description, 160)}` : ''}`,
      );
    }
  }
  const responses = Object.entries(operation.responses ?? {}).map(
    ([status, response]) =>
      `${status} ${oneLine(resolve(spec, response)?.description, 60)}`,
  );
  if (responses.length) lines.push(`Responses: ${responses.join('; ')}.`);

  const facts = lines.join('\n');
  const room = MAX_SECTION - heading.length - facts.length - 4;
  const description = trimExamples(
    demoteHeadings((operation.description ?? '').trim()),
  );
  const text =
    description.length > room
      ? `${description.slice(0, room - 1)}…`
      : description;
  return [heading, text, facts].filter(Boolean).join('\n\n');
};

const tagSections = (spec, tag, operations) => {
  const entries = operations.map(
    ({ path, method, operation }) =>
      `- ${method.toUpperCase()} ${path} - ${operation.summary || operation.operationId}${(operation.security ?? []).length === 0 ? ' (public)' : ''}`,
  );
  const intro = oneLine(
    resolve(
      spec,
      spec.tags.find((t) => t.name === tag),
    )?.description,
    600,
  );
  const lead = (first) =>
    `FluxOS API ${tag} group: ${entries.length} endpoints.${first && intro ? ` ${intro}` : ''}`;
  // Packed by size; the heading, with its part label and link, needs ~120.
  const parts = [[]];
  let size = lead(true).length + 120;
  for (const entry of entries) {
    if (
      size + entry.length + 1 > MAX_SECTION &&
      parts[parts.length - 1].length
    ) {
      parts.push([]);
      size = lead(false).length + 120;
    }
    parts[parts.length - 1].push(entry);
    size += entry.length + 1;
  }
  return parts.map((part, i) =>
    [
      `## ${tag} endpoints${parts.length > 1 ? ` (part ${i + 1} of ${parts.length})` : ''} <${tagUrl(tag)}>`,
      lead(i === 0),
      ...part,
    ].join('\n'),
  );
};

// The introduction (info.description) as one section per heading, longer ones
// split into parts that each keep the heading.
const introSections = (description) => {
  const sections = [];
  let current = null;
  let fence = false;
  for (const line of description.split('\n')) {
    const heading = !fence && /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      current = {
        title: heading[2].trim(),
        level: heading[1].length,
        body: '',
      };
      sections.push(current);
    } else if (current) {
      current.body += `${line}\n`;
    }
    if (/^```/.test(line.trim())) fence = !fence;
  }
  return sections.flatMap(({ title, level, body }) => {
    const clean = title.replace(/[^\p{L}\p{N}\s&.,:()/'-]/gu, '').trim();
    const pieces = splitText(demoteHeadings(body.trim()), MAX_SECTION - 200);
    return pieces.map(
      (piece, i) =>
        `## ${clean}${pieces.length > 1 ? ` (part ${i + 1} of ${pieces.length})` : ''} <${sectionUrl(title, level)}>\n` +
        `Flux API documentation: ${clean}.\n\n${piece}`,
    );
  });
};

export function apiMarkdown(spec) {
  const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
    METHODS.filter((m) => item[m]).map((method) => ({
      path,
      method,
      operation: item[method],
    })),
  );
  const byTag = new Map(spec.tags.map((t) => [t.name, []]));
  for (const entry of operations) {
    const tag = entry.operation.tags?.[0] ?? 'Other';
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag).push(entry);
  }

  const header =
    `# ${spec.info.title} - FluxOS ${spec.info.version}\n\n` +
    `Generated from the OpenAPI specification behind ${SITE}. ` +
    `${operations.length} operations in ${byTag.size} groups. Each section below is self-contained.\n`;

  return (
    [
      header,
      ...securitySections(spec),
      ...introSections(spec.info.description ?? ''),
      ...[...byTag].flatMap(([tag, entries]) =>
        tagSections(spec, tag, entries),
      ),
      ...operations.map(({ path, method, operation }) =>
        operationSection(spec, path, method, operation),
      ),
    ].join('\n\n') + '\n'
  );
}

export function llmsTxt(spec) {
  return (
    `# Flux API\n\n` +
    `> HTTP API of FluxOS ${spec.info.version}, the node software behind the Flux decentralized cloud. ` +
    `Public calls go to ${GATEWAY}; node-scoped calls go to one node at https://<node-ip>:16127. ` +
    `Authenticated calls send a signed zelidauth header.\n\n` +
    `## Docs\n\n` +
    `- [API reference (markdown)](https://docs.runonflux.io/fluxapi.md): every endpoint with method, path, authentication, parameters and responses\n` +
    `- [OpenAPI specification (YAML)](https://docs.runonflux.io/fluxapi.yaml)\n` +
    `- [OpenAPI specification (JSON)](https://docs.runonflux.io/fluxapi.json)\n` +
    `- [Interactive reference](${SITE})\n\n` +
    `## Optional\n\n` +
    `- [Flux user documentation](https://docs.runonflux.com/)\n`
  );
}
