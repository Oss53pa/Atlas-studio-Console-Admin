# Wordmarks Grand Hotel — apps Atlas Studio

Titres des applications rendus en **Grand Hotel** convertis en **tracés vectoriels**
(via `opentype.js`), donc affichés à l'identique partout — y compris dans les
clients mail qui ne chargent pas les web-fonts.

Chaque app dispose de :
- `wm-<id>.svg` — source vectorielle ;
- `wm-<id>.png` — rendu standard (fond transparent) ;
- `wm-<id>@2x.png` — rendu retina.

Servis via jsDelivr, ex. :
`https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/wm-atlas-compta.png`

L'URL de chaque wordmark est enregistrée dans `public.apps.wordmark_url`
(éditable depuis la Console Admin) et consommée par le template email d'auth.

La colonne **fill** est la couleur réellement utilisée pour le tracé : l'accent de
l'app quand il est assez sombre pour rester lisible sur fond clair, sa variante
foncée (`accent_deep`) sinon.

| id (slug)       | app            | accent   | fill du wordmark |
|-----------------|----------------|----------|------------------|
| cockpit-journey | CockpitJourney | #6E8B58  | #1A1D17 (neutre) |
| cockpit-fa      | Cockpit F&A    | #C97A5A  | #A85638 (deep)   |
| atlas-compta    | Atlas F&A      | #235A6E  | #235A6E          |
| tablesmart      | TableSmart     | #C0A24E  | #9A7E30 (deep)   |
| atlasbanx       | AtlasBanx      | #C29A4B  | #8A6E2E (deep)   |
| taxpilot        | Liass'Pilot    | #0F766E  | #0F766E          |
| advist          | Advist         | #4F46E5  | #4F46E5          |
| atlas-people    | Atlas People   | #C97E12  | #C97E12          |
| cockpit-cr      | CockpitCR      | #4F46E5  | #4F46E5          |
| cockpit-projet  | Cockpit Projet | #0F2A4A  | #0F2A4A          |
| wedo            | WeDo           | #D4A03C  | #A77B25 (deep)   |
| atlas-studio    | Atlas Studio (neutre) | #1A1D17 | #1A1D17 |

> `cockpit-cr` partage exactement l'accent d'`advist` (#4F46E5) — les deux apps
> ont donc le même indigo. À arbitrer côté design si une distinction est voulue.

## Régénérer

Police : **Grand Hotel** (Google Fonts), convertie en tracés — aucune web-font
n'est requise à l'affichage.

Paramètres du pipeline, retrouvés depuis les assets d'origine et vérifiés
sur les 8 wordmarks déjà commités :

- corps **88**, marge **8 px** de chaque côté ;
- `width  = ceil(advanceWidth(texte, 88)) + 16` ;
- `height = ceil(bbox.y2 - bbox.y1) + 16` ;
- `transform="translate(8, -bbox.y1 + 8)"` ;
- PNG **@1x = 2×** le viewBox, **@2x = 4×**, fond transparent.

Scripts dans le scratchpad : `gen.mjs` (texte → SVG paths, via `opentype.js`)
puis `render-png.mjs` (SVG → PNG @1x/@2x, via Chromium).

La régénération d'un wordmark existant donne des tracés et des dimensions
identiques ; seuls les pixels d'anti-crénelage diffèrent (le rasteriseur n'est
pas le même), sans aucun écart sur les pixels pleins.
