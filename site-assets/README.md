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

UI Kit uses contextual, publicly hosted photographs and diagrams **only to test layout and responsive behavior**. They are not MagazinOT product photos, not normative drawings and not approved production assets. Production pages must use an owned/cleared original in `site-assets/img/<feature>/` with stable `/assets/img/<feature>/...` references.

- Pexels photography (demo originals and license/source details): [industrial pipes](https://www.pexels.com/photo/industrial-factory-pipes-and-structures-33813584/), [machine workshop](https://www.pexels.com/photo/tool-in-factory-10119310/), [industrial plant](https://www.pexels.com/photo/pipes-on-industrial-plant-12380628/), [workshop](https://www.pexels.com/photo/a-machine-shop-with-a-large-machine-and-tools-18569751/), [tool](https://www.pexels.com/photo/close-up-of-workshop-tools-16630111/), [machine](https://www.pexels.com/photo/a-close-up-shot-of-a-metal-machine-12826695/).
- Wikimedia Commons technical examples (follow file-specific attribution/license terms): [network diagram](https://commons.wikimedia.org/wiki/File:Network_diagram_(example).svg), [network topology](https://commons.wikimedia.org/wiki/File:NetzwerkTopologien.svg), [hub](https://commons.wikimedia.org/wiki/File:Hub_network_diagram.svg), [star](https://commons.wikimedia.org/wiki/File:Star_Topology.svg), [industrial ring topology](https://commons.wikimedia.org/wiki/File:SERCOS_III_Control_Interface_Ring_Topology_diagram.svg), [emergency exit sign](https://commons.wikimedia.org/wiki/File:Fire_exit.svg).

Media contract: `ui-media-frame` owns dimensions/rounding/overflow; `ui-media-fit--cover` crops photos, plain `ui-media-fit` or `ui-figure--diagram` shows diagrams completely. `ui-figure--photo` uses cover; `ui-split--balanced` uses two equal columns on desktop. Use one semantic wrapper, not nested background placeholders or inline sizing. A single photo in both `cover` and `contain` showcases the difference.
