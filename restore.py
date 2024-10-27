# Downloads all of the mp3 files, which are not checked into the repository, from
# the live site and puts them in the appropriate directory path.

import os
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE_URL = 'https://songs.travisbriggs.com'
OUT_DIR = 'static/mp3'

os.makedirs(OUT_DIR, exist_ok=True)

resp = requests.get(BASE_URL)
resp.raise_for_status()

soup = BeautifulSoup(resp.text, 'html.parser')

for audio in soup.find_all('audio'):
  url = urljoin(BASE_URL, audio.get('src'))
  out_path = os.path.join(os.path.dirname(__file__), 'static/mp3',
                          os.path.basename(audio.get('src')))

  print(f'Requesting {url}')
  with requests.get(url, stream=True, timeout=10) as r:
    r.raise_for_status()
    with open(out_path, 'wb') as f:
      # Read data in 1 MB chunks
      for chunk in r.iter_content(chunk_size=1024):
        f.write(chunk)
