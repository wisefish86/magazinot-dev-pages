# Site assets

Runtime assets that must be deployed to the server together with DEV pages.

Recommended structure:

- `data/<feature>/` — JSON and other data files.
- `js/<feature>/` — page-specific JavaScript used in the browser.
- `css/<feature>/` — page-specific styles that are not part of the global design system.
- `img/<feature>/` — images for the new design.
- `docs/<feature>/` — downloadable documents and other static files.

Examples:

- `data/markirovka/markirovka-normdocs.json`
- `js/markirovka/<feature>.js`
- `css/markirovka/<feature>.css`
- `img/markirovka/...`
- `docs/markirovka/...`

Global shared files remain separate while the legacy site is being migrated:
- `magazinot_gen.css`
- `magazinot_gen.js`

Do not duplicate files between GitHub folders. GitHub is the source; GitHub Actions deploys `site-assets/**` to the server.

When a permanent assets directory is provided by the site programmer, change only the deployment target `RUNTIME_ASSETS_SERVER_DIR`. Keep asset paths and filenames stable.


## Shared UI icons

Canonical reusable interface icons live in `icons/ui-icons.svg` as named SVG symbols.

Rules:
- reuse the existing symbol id for the same semantic action;
- do not redraw common icons locally in page HTML;
- unique illustrations and page-specific graphics do not belong in the shared sprite;
- standard icon language: 24×24 viewBox, outline, `currentColor`, about 1.8–1.9 px stroke, round caps/joins.

Current reusable ids:
`chevron-left`, `chevron-right`, `chevron-down`, `arrow-right`, `arrow-up-right`, `check`, `check-circle`, `info`, `warning`, `alert-circle`, `search`, `filter`, `menu`, `plus`, `minus`, `close`, `download`, `upload`, `external-link`, `file`, `image`, `cart`, `phone`, `mail`, `location`, `clock`, `calendar`, `user`, `play`, `copy`, `edit`, `trash`, `zoom-in`, `lock`, `settings`.

Usage:

```html
<svg class="ui-icon" aria-hidden="true">
  <use href="/assets/icons/ui-icons.svg#chevron-right"></use>
</svg>
```
