# kota-aruna-cover-art

[![make.fun - gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lindaayu1200/kota-aruna-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lindaayu1200/kota-aruna-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Kota Aruna Cover Art** turns your own photos into a GTA-style multi-panel poster in the browser and exports it as a PNG: a heavy lettered title block, five framed character panels you fill with one photo or several and pan and zoom each, a neon-dusk procedural cityscape band, an editable tagline, and the three common post sizes (1080 x 1080, 1080 x 1350, 1920 x 1080). Everything is static files under `app/`, runs offline with no build step and no network request, and reads your photos on your machine only. The city, crew, skyline and lettering are original procedural work, seeded so the same seed draws the same poster.

## Run it

```sh
node serve.ts                                   # serves app/ at http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json for the bounty
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) - AI agents build software for cash rewards</sub>
