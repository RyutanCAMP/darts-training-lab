"""Builds data/barrels.json from the research tables in tools/catalog/.

Inputs (all checked on the makers' official pages; see `url` per row):
  base.json   entries carried over from the earlier catalog (TARGET, verified COSMO, STAR QUEEN2)
  tri.tsv     TRiNiDAD   id, name, player, weight, length, diameter, tungsten, shape
  dyn.tsv     DYNASTY    id, name, player, release, weight, length, diameter, tungsten, shape
  cosmo.tsv   COSMO      name, slug, weight, length, diameter, tungsten
  tiga.tsv    TIGA       name, item, year, release, weight, tungsten, length, diameter, shape, verified, note
Usage: python3 tools/catalog/build_barrels.py
"""
import json, re, pathlib
from collections import Counter

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CHECKED = '2026-10-12'
SHAPE = {'ストレート': 'ストレート', 'トルピード': 'トルピード', '砲弾': '砲弾型', 'テーパー': 'その他・不明', '-': 'その他・不明'}
WORDS = [('DARTS HIVE限定', 'darts-hive'), ('初回限定カラー', 'first-color'), ('限定版', 'limited'), ('滅', 'metsu'), ('撃', 'geki'), ('蒼', 'ao'), ('+', ' plus'), ('α', 'alpha'), ('Ê', 'e')]


def num(v):
    v = str(v).strip()
    if v in ('-', '', 'None'):
        return None
    f = float(v.split('/')[0])
    return int(f) if f == int(f) else f


def multi(v):
    p = [x.strip() for x in str(v).split('/')]
    return p if len(p) > 1 else None


def slug(brand, name):
    s = brand + ' ' + name
    for a, b in WORDS:
        s = s.replace(a, ' ' + b + ' ')
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def rows(name):
    for line in open(HERE / name, encoding='utf8'):
        if line.strip() and not line.startswith('#'):
            yield line.rstrip('\n').split('\t')


out = []
for x in json.load(open(HERE / 'base.json', encoding='utf8')):
    out.append(x)

for i, n, p, w, L, d, t, s in rows('tri.tsv'):
    note = (p + 'モデル。' if p != '-' else '') + ('公式表記「テーパー」。' if s == 'テーパー' else '') + '公式サイトに発売日の掲載なし。'
    out.append(dict(brand='TRiNiDAD', name=n, player=None if p == '-' else p, year=None, release=None,
                    weight=num(w), material=num(t), length=num(L), diameter=num(d), color='未指定',
                    shape=SHAPE.get(s, 'その他・不明'), note=note, url='https://e-tri.jp/barrel/info.cgi?id=' + i,
                    verified='spec', source='official', checkedAt=CHECKED))

for i, n, p, r, w, L, d, t, s in rows('dyn.tsv'):
    extra = []
    for label, v, unit in (('重量', w, 'g'), ('全長', L, 'mm'), ('最大径', d, 'mm'), ('タングステン', t, '%')):
        if multi(v):
            extra.append(label + ' ' + ' / '.join(multi(v)) + unit)
    note = (p + 'モデル。' if p != '-' else '') + ('ラインナップ：' + '、'.join(extra) + '。' if extra else '')
    out.append(dict(brand='DYNASTY', name=n, player=None if p == '-' else p, year=int(r[:4]), release=r,
                    weight=num(w), material=num(t), length=num(L), diameter=num(d), color='未指定',
                    shape=SHAPE.get(s, 'その他・不明'), note=note, url='https://maximnet.co.jp/shopdetail/0000000' + i + '/',
                    verified='spec+date', source='official', checkedAt=CHECKED))

for n, sl, w, L, d, t in rows('cosmo.tsv'):
    out.append(dict(brand='COSMO DARTS', name=n, player=n, year=None, release=None, weight=num(w), material=num(t),
                    length=num(L), diameter=num(d), color='未指定', shape='その他・不明',
                    note=n + '選手モデル。公式サイトに発売日の掲載なし。', url='https://www.cosmodarts.jp/product/' + sl + '/',
                    verified='spec', source='official', checkedAt=CHECKED))

for n, item, yr, r, w, t, L, d, sh, v, note in rows('tiga.tsv'):
    out.append(dict(brand='TIGA', name=n, player=None, year=num(yr), release=None if r == '-' else r, weight=num(w),
                    material=num(t), length=num(L), diameter=num(d), color='未指定', shape=sh,
                    note='' if note == '-' else note, url='https://tigadarts.base.shop/items/' + item,
                    verified=v, source='official', checkedAt=CHECKED))

KEYS = ['id', 'brand', 'name', 'player', 'year', 'release', 'weight', 'material', 'length', 'diameter',
        'shape', 'color', 'note', 'url', 'verified', 'source', 'checkedAt']
for y in out:
    y['id'] = slug(y['brand'], y['name'])
ids = [y['id'] for y in out]
dups = sorted({i for i in ids if ids.count(i) > 1})
assert not dups, dups
for y in out:
    assert y['url'].startswith('https://'), y
out = [{k: y.get(k) for k in KEYS} for y in out]
doc = {
    'schemaVersion': 1,
    'updatedAt': CHECKED,
    'scope': '2024〜2026年のタングステン製ソフトダーツ用バレル（TARGET / TRiNiDAD / DYNASTY / COSMO DARTS / TIGA）',
    'verifiedLevels': {
        'spec+date': '公式ページで仕様と発売日を確認',
        'spec': '公式ページで仕様を確認（発売日は未掲載）',
        'partial': '公式ページで一部のみ確認',
        'unconfirmed': '公式ページで確認できず',
    },
    'barrels': out,
}
(ROOT / 'data' / 'barrels.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
print(len(out), dict(Counter(y['brand'] for y in out)), dict(Counter(y['verified'] for y in out)))
