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

| id (slug)       | app            | accent   |
|-----------------|----------------|----------|
| cockpit-journey | CockpitJourney | #6E8B58  |
| cockpit-fa      | Cockpit F&A    | #C97A5A  |
| atlas-compta    | Atlas F&A      | #235A6E  |
| tablesmart      | TableSmart     | #C0A24E  |
| atlasbanx       | AtlasBanx      | #C29A4B  |
| taxpilot        | Liass'Pilot    | #0F766E  |
| advist          | Advist         | #3E5C8A ⚠️ à confirmer |
| atlas-studio    | Atlas Studio (neutre) | #1A1D17 |

## Régénérer

Pipeline dans le scratchpad (calqué sur `cockpitJourney/scripts/email-assets/generate-wordmark.mjs`) :
`gen.mjs` (texte → SVG paths) puis `render-png.mjs` (SVG → PNG @1x/@2x).
