# MagazinOT dev pages

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
