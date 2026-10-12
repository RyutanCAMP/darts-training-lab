# Barrel catalog (data/barrels.json)

The MY DARTS model picker reads `data/barrels.json` at runtime (same origin on Firebase Hosting; the GitHub raw URL is the fallback for `file://` previews). Nothing is embedded in `app.js` any more.

## Update flow
1. Edit the research tables here (`tri.tsv`, `dyn.tsv`, `cosmo.tsv`, `tiga.tsv`, `base.json`). Every row must come from the maker's official page; put that page in the row (id / slug / item / url).
2. `python3 tools/catalog/build_barrels.py` → rewrites `data/barrels.json`.
3. `python3 tools/run-tests.py`, commit, push. CI tests then deploys; the app picks up the new file on next load.

## Fields
`id, brand, name, player, year, release (YYYY-MM-DD), weight g, material (tungsten %), length mm, diameter mm, shape (ストレート/トルピード/砲弾型/その他・不明), color, note, url (official page), verified, source, checkedAt`

`verified`: `spec+date` (spec and release date on the official page) / `spec` (spec only; maker does not publish dates) / `partial` / `unconfirmed`.
Shapes are only set when the maker uses the word; 「テーパー」「ひし形」 are kept in `note` and the shape stays その他・不明. When a model has several weights, `weight` is the first one and the others are listed in `note`.

## Sources (checked 2026-10-12)
- TRiNiDAD: https://e-tri.jp/barrel/ (detail pages `info.cgi?id=`; no release dates published). Soft models only.
- DYNASTY: MAXIM official shop https://maximnet.co.jp/shopbrand/dynasty_darts/ (release dates on product pages).
- COSMO DARTS: https://www.cosmodarts.jp/product/ (no release dates on product pages; years only where an announcement post was checked).
- TIGA: https://tigadarts.base.shop/
- TARGET: entries checked on 2026-10-11 (top.target-darts.jp news / target-darts.jp shop).
