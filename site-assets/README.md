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
`chevron-left`, `chevron-right`, `chevron-down`, `arrow-right`, `arrow-up-right`, `check`, `check-circle`, `info`, `warning`, `alert-circle`, `search`, `filter`, `menu`, `plus`, `minus`, `close`, `download`, `upload`, `external-link`, `file`, `image`, `cart`, `phone`, `mail`, `location`, `clock`, `calendar`, `user`, `play`, `copy`, `edit`, `trash`, `zoom-in`, `lock`, `settings`, `message-circle`, `lightbulb`, `user-placeholder`, `shopping-bag`.

Usage:

```html
<svg class="ui-icon" aria-hidden="true">
  <use href="/assets/icons/ui-icons.svg#chevron-right"></use>
</svg>
```

## UI Kit demonstration media (DEV only)

**Never hotlink remote photos or diagrams from a DEV page.** The UI Kit showcases real context-sensitive images, but all are stored in `site-assets/img/ui-kit-demo/` and deployed through the usual FTP workflow. The browser references only stable `/assets/img/ui-kit-demo/...` paths, which do not require foreign-host access or VPN.

- `PHOTO-SOURCES.md`: original Pexels photo URLs, retained for licensing and provenance, not used as page image sources.
- `DIAGRAM-SOURCES.md`: attribution and origin of bundled reusable diagram SVGs. These are illustrative network diagrams, not Russian normative drawings.
- `scripts/import-ui-kit-photos.mjs`: reproducible, one-time photo import with JPEG signature/size checks; GitHub Actions commits actual binary files.
- `scripts/check-ui-kit-media.mjs`: checks all UI Kit image paths exist and have valid format; after FTP upload, compares publicly returned bytes to the committed sources using SHA-256. New remote image URLs in the UI Kit cause validation failure.

Media contract: `ui-media-frame` owns dimensions/rounding/overflow; `ui-media-fit--cover` crops photos, plain `ui-media-fit` or `ui-figure--diagram` shows diagrams completely. `ui-figure--photo` uses cover; `ui-split--balanced` uses two equal columns on desktop. Use one semantic wrapper, not nested background placeholders or inline sizing.

**Only for DEV**: images are not verified as MagazinOT products and not authentic normative illustrations. Before production replace them with approved originals, confirm licensing and maintain local first-party hosting.
