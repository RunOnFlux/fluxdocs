# FluxOS API Documentation

Beautiful, interactive API documentation for FluxOS. Test against `https://api.runonflux.io`.

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