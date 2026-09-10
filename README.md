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

Visit http://localhost:4000 - Modern Redocly v2 interface with interactive testing.

## Commands

- `npm start` - Start interactive documentation server
- `npm run build` - Generate static HTML for GitHub Pages  
- `npm test` - Lint OpenAPI specification
- `npm run docker` - Run in Docker container

## Deployment

**GitHub Pages**: Push to master, GitHub Actions will deploy automatically.

**Your Server**: Run `npm start` or `npm run docker` for containerized deployment.

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