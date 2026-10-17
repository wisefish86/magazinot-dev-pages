# MagazinOT dev pages

CSS maintenance and component workflow: [guide in Russian](docs/css-maintenance.md).
Component centralization findings: [architecture audit](docs/css-architecture-audit.md).

## Component class namespace

Reusable components use the project prefix `mot-`: `mot-btn`, `mot-card`,
`mot-docpage`, `mot-doc-table`, etc. The `.mk-ui` page boundary remains in place
for design tokens and base typography. Component state classes (`is-*`, `has-*`),
`data-ui-*` attributes, element IDs, resource paths and SVG symbol IDs are unchanged.
The preserved original calculator prototype keeps its original markup.

`scripts/ui-class-map.json` records the old and new component names. Keep HTML,
shared JavaScript, generators and tests in sync; the UI validator rejects old
component selectors/classes and stale injected JavaScript. New components use
`mot-` directly and do not need entries in the historical rename map.

Deploy this migration as one complete repository update, including all modified
pages and scripts, rather than replacing only the CSS and UI Kit. Pages outside
this repository using old component names must also be migrated before sharing
the updated stylesheet. To roll back, restore the complete previous version.

Local preparation and validation (Node.js):

```powershell
node scripts/sync-medium-colors.mjs
node scripts/sync-medium-colors.mjs --check
node scripts/generate-markirovka-normdocs.mjs
node scripts/inject-magazinot-ui.mjs
node scripts/validate-magazinot-ui.mjs
```

Browser checks require Playwright/Chromium (CI uses Playwright 1.55.0):

```powershell
node scripts/audit-magazinot-css.mjs --check
node scripts/test-component-foundations.mjs
node scripts/visual-qa.mjs
node scripts/visual-regression-check.mjs
node scripts/test-marker-demo.mjs
```

These checks create screenshots and reports in `visual-snapshots/`. Full visual QA
also needs the original hazard PNG assets staged by the workflow. No FTP upload
is needed to execute the local checks.

Development source for generated MagazinOT content pages.

Managed files:
- `pages/**/*.html`
- `magazinot_gen.css`
- `scripts/generate-dev-index.mjs`

Server `index.php` is intentionally not tracked or deployed.

## Automatic DEV catalog

Every deploy generates `pages/index-gpt.html`. The catalog scans every HTML page and builds a multi-level navigation tree.

Optional metadata can be placed in HTML comments at the top of any page:

```html
<!-- dev-title: Название страницы -->
<!-- dev-title-state: provisional -->
<!-- dev-path: Маркировка трубопроводов/Маркировочные стрелки -->
<!-- dev-status: Рабочая -->
<!-- dev-description: Короткое пояснение -->
<!-- dev-order: 10 -->
```

- `dev-path` uses `/` as the hierarchy separator and supports any number of levels.
- A page without `dev-path` is placed in **Прочее**.
- `index-gpt.html` is generated automatically and must not be maintained by hand.


## DEV title convention

- `dev-title-state: final` means the page title is approved.
- Any page without `dev-title-state: final` is treated as having a temporary title.
- Temporary browser titles are automatically prefixed with **⏳**.
- Final browser titles use the normal page name.
- For visible content, use the same convention: prefix a provisional page-level H1 with **⏳**.
- Do not prefix H2/H3 automatically unless that specific heading is itself provisional.


## Runtime assets

- Shared global frontend files remain at repository root: `magazinot_gen.css`, `magazinot_gen.js`.
- Page-specific/runtime files live under `site-assets/**`.
- Every deploy uploads the full `site-assets/` tree to the FTP directory configured by `RUNTIME_ASSETS_SERVER_DIR`.
- Current temporary target: `/site-assets/` inside the DEV FTP account.
- When a permanent production assets directory is provided, change only `RUNTIME_ASSETS_SERVER_DIR`; keep the repository structure and file names stable.
- Normative navigation registry: `site-assets/data/markirovka/markirovka-normdocs.json`.
- New page-specific assets should follow `site-assets/<type>/<feature>/...`, e.g. `site-assets/js/markirovka/...`, `site-assets/css/markirovka/...`, `site-assets/data/markirovka/...`, `site-assets/img/markirovka/...`, `site-assets/docs/markirovka/...`.

## Canonical UI assets and color tokens

- **Neutral palette:** use the seven `--neutral-*` tokens declared at the top of `magazinot_gen.css`. Components must consume their semantic aliases (`--c-surface`, `--c-soft`, `--c-line`, `--c-line-strong`, `--c-muted`, `--c-text`). Table headers, internal grids, zebra rows and hover states use only `--table-*`, which map to the same neutral scale. Do not add component-local gray hex values.
- **Interface icons:** one SVG sprite at `site-assets/icons/ui-icons.svg`. Reuse a stable symbol ID with `<svg class="mot-icon"><use href="/assets/icons/ui-icons.svg#cart"></use></svg>`. All symbols must be displayed in `pages/ui-kit.html`; validation checks this. Do not copy inline SVG paths to new pages or generators.
- **Normative navigation:** `site-assets/data/markirovka/markirovka-normdocs.json` stores `iconId` references to the sprite, not icon path geometry. The generator keeps all destination URLs/anchors.
- **Standard medium palette:** edit **only** `site-assets/data/markirovka/medium-colors.json` to change the eight marking group colors. `scripts/sync-medium-colors.mjs` generates the CSS variables `--medium-water`, `--medium-steam`, etc. and synchronizes archived/demo catalog JSON color fields before validation and FTP publishing. Shared JS reads the CSS tokens, never a second hard-coded palette.
- **Color caution:** these UI colors are display tokens for product categories, not a replacement for legally required colorimetric requirements or original safety-sign artwork.
- **Images:** reference common assets by stable paths. Safety pictograms and standard illustrations remain original files and must not be approximated as generic UI SVG icons.
- **Component gallery:** `pages/ui-kit.html` is the single visual reference; repeated behavior belongs in `magazinot_gen.js`, repeated styling in `magazinot_gen.css`. Reusable additions must be demonstrated there and tested at desktop/mobile widths.
- **Protected source:** `pages/markirovka-strelki-calculator-original.html` is an intentionally preserved reference prototype; do not silently rewrite it.

