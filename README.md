# FluxOS API Documentation

Interactive API reference for **FluxOS**, the node software behind the Flux
decentralized cloud. Published at [docs.runonflux.io](https://docs.runonflux.io).

The specification in `fluxapi.yaml` tracks
[RunOnFlux/flux](https://github.com/RunOnFlux/flux) `ZelBack/src/routes.js` — it
currently documents **FluxOS 8.18.0** (446 paths). Test against
`https://api.runonflux.io`, or against an individual node at
`https://<node-ip>:16127` for anything node-scoped.

## Quick Start

```bash
npm install
npm start
```

Visit http://localhost:4000/fluxapi/.

The page is [Scalar](https://github.com/scalar/scalar) (MIT, self-hosted, no
account or cloud services) with Flux styling and glue in `site/`. **Ask AI**
opens the Flux AI assistant ([ownllm](https://github.com/RunOnFlux/ownllm));
it answers allowlisted sites only, so the local server relays it under
`/ownllm` (`scripts/serve.mjs`). **Connect MCP** in the sidebar installs the
[Flux Cloud MCP server](https://github.com/RunOnFlux/flux-cloud-mcp).

## Look and feel

`site/flux.css` gives Scalar the Flux identity from runonflux.com: Gilroy
headings, Figtree text, IBM Plex Mono code, the navy and blue palette in dark
and light mode, and the blue glow over a field of hexagons from the logo.
Figtree and IBM Plex Mono come from their pinned npm packages (OFL); Gilroy is
the website's own copy in `site/fonts/`, under InFlux's Gilroy licence.

`site/flux.js` adds what Scalar does not have: one header bar on phones,
**Ask AI** on every endpoint (asks the assistant about that endpoint), and
⌘I / Ctrl+I to open the assistant from anywhere.

## Commands

- `npm start` - build, then serve `dist/` on port 4000
- `npm run build` - build the site into `dist/`
- `npm run preview` - serve an existing `dist/`
- `npm test` - lint the OpenAPI specification (Redocly CLI, open source)

## What the build produces

- **A page for every address.** Scalar is a single-page app; GitHub Pages has
  no rewrites, so `scripts/routes.mjs` lists every tag, endpoint, heading and
  model and the build writes an `index.html` for each, with its own title,
  description and canonical URL. Every link answers 200 and search engines
  see a real page.
- **Redirects for the Redocly-era links** (`/fluxapi/<tag>/<operationid>`,
  `/fluxapi/section/flux-api-documentation/<heading>`), so existing links and
  search results keep working.
- **`fluxapi.md` and `llms.txt`**: the reference as one markdown document, a
  section per endpoint, for language models. The Flux AI assistant indexes it
  (see below).
- `sitemap.xml`, `robots.txt`, `404.html`, `CNAME`.

`npm start` serves `dist/` the way GitHub Pages does (folders redirect to a
trailing slash, unknown paths get `404.html` with status 404), so a local
check is a check of the live behaviour.

## Deployment: GitHub Pages

`.github/workflows/pages.yml` lints, builds and publishes `dist/` on every push
to `master`. One-time setup, replacing the Redocly-hosted site:

1. **Settings -> Pages -> Build and deployment -> Source: GitHub Actions.**
2. Merge to `master` (or run the workflow by hand) and wait for the first
   deployment.
3. **Settings -> Pages -> Custom domain: `docs.runonflux.io`.** Verifying the
   domain for the organisation first (**Organisation settings -> Pages ->
   Add a domain**, a TXT record) prevents anyone else from claiming it.
4. **DNS:** point `docs.runonflux.io` at GitHub instead of Redocly - a
   `CNAME` to `runonflux.github.io` (today it is `ssl.redocly.app`).
5. Once GitHub has issued the certificate, tick **Enforce HTTPS**.
6. Check the site, then cancel the Redocly subscription and delete
   `redocly.yaml`'s `seo`, `logo`, `navbar`, `footer` and `apis` sections; the
   lint settings (`extends`, `rules`) are still used by `npm test`.

Until the DNS change, Redocly keeps building its own site from `master`.

## The Flux AI assistant

The assistant answers API questions from `fluxapi.md`, which ships in its
image as `images/docsbot/docs/flux-api-reference.md` (ownllm). After the spec
changes, refresh it: `npm run build`, copy `dist/fluxapi.md` over that file,
bump `images/gate/VERSION` in ownllm and redeploy the docs bot. Its citations
use the Redocly-era links, which redirect.

## Keeping the spec in sync

When FluxOS adds or changes routes, re-check three things against
`ZelBack/src/routes.js` and the handlers it points at:

1. **Coverage** — every route in `routes.js` has a path item here, and every path
   item here still has a route.
2. **Permission labels** — the `**Public** / **User** / **Admin** / **FluxTeam** /
**AdminAndFluxTeam** / **AppOwner** / **AppOwnerAbove**` marker at the end of
   each description must match the `Privilege.*` the handler verifies, and the
   `security` field must agree with it (`[]` for Public, `ZelID` otherwise).
3. **Parameters** — every `req.query.*` / `req.params.*` the handler reads is
   documented.

Then run `npm test` (Redocly lint) and `npm run build`.

## Licence

Documentation and specification © 2026 **InFlux Technologies USA LLC**.
FluxOS is published under the GNU AGPLv3.
