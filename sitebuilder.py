from collections import defaultdict
from datetime import datetime
import sys
import os

from flask import Flask, render_template
from flask_flatpages import FlatPages
from flask_frozen import Freezer

app = Flask(__name__)
app.config.update(
  FLATPAGES_ROOT='songs',
  FLATPAGES_EXTENSION = '.md'
)
songs = FlatPages(app)
freezer = Freezer(app)

def _annotate(song):
  if hasattr(song, 'slug'):
    return
  slug = os.path.basename(song.path)
  song.src = '/static/' + slug + '.mp3'
  song.slug = slug
  song.dt = datetime.strptime(song.meta['date'], '%Y/%m/%d')

@app.route('/')
def index():
  for song in songs:
    _annotate(song)

  sorted_songs = sorted(list(songs), key=lambda song: song.dt, reverse=True)
  return render_template('index.html', songs=sorted_songs)

@app.route('/<path:path>/')
def song(path):
  related = defaultdict(list)

  song = songs.get_or_404(path)
  _annotate(song)

  for tag in song.meta['tags']:
    for s in songs:
      if tag in s.meta['tags']:
        _annotate(s)
        if s.slug != song.slug:
          related[tag].append(s)
  song.related = related
  song.src = '/static/' + os.path.basename(path) + '.mp3'
  return render_template('song.html', song=song, title=song.meta['title'])

if __name__ == '__main__':
  if len(sys.argv) > 1 and sys.argv[1] == 'build':
    freezer.freeze()
  else:
    app.run()
