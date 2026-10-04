"""Download official Steam artwork and a small public catalog snapshot."""
import json
import time
import html
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/steam'
DATA = ROOT / 'src/data'
ASSETS.mkdir(parents=True, exist_ok=True)
DATA.mkdir(parents=True, exist_ok=True)
IDS = [1245620, 1091500, 1174180, 1903340, 1145360, 367520, 1086940, 1030300]
CDN = 'https://cdn.akamai.steamstatic.com/steam/apps'

def fetch(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'NextGameLanding/0.1'}), timeout=45) as res:
                return res.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)

query = {'ids': [{'appid': i} for i in IDS], 'context': {'language': 'english', 'country_code': 'us'},
         'data_request': {'include_assets': True, 'include_basic_info': True, 'include_release': True,
                          'include_tag_count': 20, 'include_platforms': True}}
url = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?' + urlencode({'input_json': json.dumps(query)})
items = {int(i['appid']): i for i in json.loads(fetch(url))['response']['store_items']}
genres = {1245620: ['RPG', 'Open World'], 1091500: ['RPG', 'Open World'], 1174180: ['Adventure', 'Open World'],
          1903340: ['RPG', 'Adventure'], 1145360: ['Action', 'Indie'], 367520: ['Adventure', 'Indie'],
          1086940: ['RPG', 'Adventure'], 1030300: ['Action', 'Indie']}
rows = []
sources = []
for appid in IDS:
    item = items[appid]
    paths = {}
    for key, filename in [('poster', 'library_600x900_2x.jpg'), ('hero', 'library_hero.jpg'), ('header', 'header.jpg')]:
        target = ASSETS / f'{appid}-{key}.jpg'
        source = f'{CDN}/{appid}/{filename}'
        if not target.exists():
            try:
                target.write_bytes(fetch(source))
            except Exception:
                if key == 'poster':
                    source = f'{CDN}/{appid}/library_600x900.jpg'
                    target.write_bytes(fetch(source))
                else:
                    source = f'{CDN}/{appid}/header.jpg'
                    target.write_bytes(fetch(source))
        paths[key] = f'/steam/{target.name}'
        sources.append({'app_id': appid, 'asset': key, 'url': source, 'local': paths[key]})
    release = item.get('release', {}).get('steam_release_date')
    description = html.unescape(re.sub('<[^>]*>', '', item.get('basic_info', {}).get('short_description', '')))
    rows.append({'app_id': appid, 'name': item['name'], 'description': description, 'genres': genres[appid],
                 'publisher': ', '.join(p['name'] for p in item.get('basic_info', {}).get('publishers', [])),
                 'release_date': datetime.fromtimestamp(release, timezone.utc).date().isoformat() if release else None,
                 'steam_url': f'https://store.steampowered.com/app/{appid}/', **paths})
    print(f'Assets ready: {appid} {item["name"]}', flush=True)
(DATA / 'games.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
(ASSETS / 'sources.json').write_text(json.dumps({'fetched_at': datetime.now(timezone.utc).isoformat(),
     'metadata_source': url.split('?')[0], 'genres': 'Editorial browsing labels, not official Steam genre IDs', 'assets': sources}, ensure_ascii=False, indent=2), encoding='utf-8')
