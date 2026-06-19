# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`brain-sam-js` (published as `brain-sam-js`, global name BrainSam) is a browser tracking script for the Samhub (https://samhub.io) service. It collects page-view and custom events and fires them as image-pixel (or `navigator.sendBeacon`) requests to a remote endpoint. The public CDN consumers load the bundled browser build and interact with it purely through a global `window.sam_data` array.

## Commands

- `yarn test` — run the Jest test suite. Single test: `yarn test -t "<test name>"` or `yarn test src/main.test.ts`.
- `yarn lint` — ESLint over `src/`.
- `yarn build-all` — full clean + `tsc` type build + esbuild node & browser bundles into `dist/`.
- `yarn esbuild-browser:watch` — rebuild the browser bundle (`dist/esbuild/sam.js`) on change while developing.
- `yarn server` — serve the repo over http-server; open `http://localhost:8080/browser-test.html` for a live demo.
- `yarn docs` — generate TypeDoc API docs into `docs/` from `src/main.ts`.

Tests run under jsdom (`@jest-environment jsdom` is set per-file in `src/main.test.ts`).

## Architecture

The whole library is three source files in `src/`:

- **`main.ts`** — the `BrainSam` class, the entire public API. Construction wires the data layer, optionally fires a `page_view` (gated on `config.autoview`, deferred to `DOMContentLoaded` if the document is still loading), and starts the observable watcher. `event()` assembles the pixel payload, manages the first-party `dep` cookie, and dispatches via `send()` → `sendBeacon` (when opted in) or `pixel()` (an `Image().src` GET).
- **`datalayer.ts`** — `DataLayerHelper`, a fork of Google's data-layer-helper pattern. It monkey-patches `Array.prototype.push` on the passed-in array so that anything pushed after load is processed live. It maintains an internal merged model, supports command processors (`event`, `plugin`, `set`), plain-object merges, function callbacks, and array-style commands.
- **`sam.ts`** / **`cli.ts`** — thin entrypoints. `sam.ts` is the browser bundle entry: it grabs/creates `window.sam_data` and instantiates `BrainSam`. `cli.ts` is the node entry (largely a stub).

### Data flow & the `sam_data` contract

Everything flows through one array (`window.sam_data`). Hosts push objects onto it; `DataLayerHelper`'s patched `push` routes each object:

- `{config: {...}}` and other scoped objects (`user`, `page`, `session`, etc.) → merged into the persistent model and resent with every subsequent event.
- `{event: 'name', ...}` → fires an event; the extra keys go on this event only, not the persistent model.
- `{plugin: fn}` → registers a listener invoked before each event, able to mutate event data and the data layer.

`getPixelData()` flattens the model into prefixed query params: `user→u_`, `device/domain→d_`, `session→s_`, `event→e_`, `page→p_`. The remote pixel endpoint is `BrainSam.pixel_url` (`https://sam.dep-x.com/e.gif`). The `beacon` flag is opt-in and stripped before sending — never forwarded to the server.

The README documents the full host-facing JS API, config options, the pixel query-param schema, and plugin/processor hooks — consult it before changing payload shape or the `sam_data` command surface, since external sites depend on it.

## Build outputs

Two build paths, both into `dist/` (gitignored):
- `tsc` → `dist/tsc/` produces type declarations (`package.json` `types` points here).
- esbuild → `dist/esbuild/sam.js` (minified browser bundle, the `main`/`browser` entry) and `dist/esbuild/cli.js`.

## Notes

- Targets ES6 with strict TypeScript, but `noImplicitAny` is off and the code leans on `any` heavily (`data_layer`, `config`, payloads). Match that style; don't introduce heavy typing that fights the existing loose model.
- The data layer must keep working when pushed to before or after init — the `data.installed` guard in the `BrainSam` constructor prevents double-initialization of the same array.
