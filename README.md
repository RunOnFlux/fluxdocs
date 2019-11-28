# zelfluxdocs OpenAPI Specification
[![Build Status](https://travis-ci.com/zelcash/zelfluxdocs.svg?branch=master)](https://travis-ci.com/zelcash/zelfluxdocs)

[ZelFlux](https://github.com/zelcash/zelflux/)

## Links

- [Reference Documentation (ReDoc)](https://zelcash.github.io/zelfluxdocs/)
- [SwaggerUI](https://zelcash.github.io/zelfluxdocs/swagger-ui/)
- OpenAPI Raw Files: [JSON](https://zelcash.github.io/zelfluxdocs/openapi.json) [YAML](https://zelcash.github.io/zelfluxdocs/openapi.yaml)

**Warning:** All above links are updated only after Travis CI finishes deployment

## Working on specification
### Install

1. Install [Node JS](https://nodejs.org/)
2. Clone repo and run `npm install` in the repo root

### Usage

#### `npm start`
Starts the development server.

#### `npm run build`
Bundles the spec and prepares web_deploy folder with static assets.

#### `npm test`
Validates the spec.

#### `npm run gh-pages`
Deploys docs to GitHub Pages. You don't need to run it manually if you have Travis CI configured.
