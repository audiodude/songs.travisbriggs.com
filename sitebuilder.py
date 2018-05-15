from flask import Flask, render_template
from flask_flatpages import FlatPages

app = Flask(__name__)
app.config.update(
  FLATPAGES_ROOT='songs',
  FLATPAGES_EXTENSION = '.md'
)
songs = FlatPages(app)

@app.route("/")
def index():
  return render_template('index.html', songs=songs)

@app.route('/<path:path>/')
def song(path):
  song = songs.get_or_404(path)
  return render_template('song.html', song=song)

if __name__ == "__main__":
    app.run()
