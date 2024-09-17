# songs.travisbriggs.com
This is the static site generator setup that powers [songs.travisbriggs.com](https://songs.travisbriggs.com).

It is written with lots of help from
[this fabulous article](https://nicolas.perriault.net/code/2012/dead-easy-yet-powerful-static-website-generator-with-flask/)

It uses Python, [Flask](http://flask.pocoo.org/), [Flask-FlatPages](https://pythonhosted.org/Flask-FlatPages/) and
[Frozen-Flask](https://pythonhosted.org/Frozen-Flask/).

Note that the repository contains metadata for mp3 files but not the actual mp3s themselves. **Always back up your
mp3 files**.

Almost all of the commands below require `poetry shell` to work. It only has to be done once, in the beginning of your
session. Also you might have to do `poetry install` if this is a fresh checkout.

## Adding a song

The basic way this works is that for each song, there is an mp3 file in `static/mp3/` and a Markdown file in
`songs/`. These files need to have the same name.

The Markdown file should have some front matter that describes the song. Look at any example in the `songs/`
directory.

To get the track length of the song (which is specified in milliseconds in the front matter, by convention, but
not actually used anywhere in the site), use the following commands:

```bash
$ python track_length.py static/mp3/<song_title.mp3>
```

To add ID3 tags to songs, in case anyone ever downloads them (also not used anywhere in the site), use the
`id3.sh` script:

```bash
$ ./id3.sh 'Song title' static/mp3/song_title.mp3
```

## Previewing the site

As stated, the site "runs" on Flask, and can be previewed (or even potentially deployed) as a Flask powered
web app. To do so, first install the dependencies using `pipenv`. You will need the `pipenv` library
installed in your global Python libraries.

```bash
pipenv install
```

Then to preview the site run:

```bash
pipenv run flask --debug -A sitebuilder run
```

Then visit the url printed, probably `http://localhost:5000`.

## Deploying the site

The site is currently hosted for free as a static site on Netlify. To deploy, first build the site:

```bash
pipenv run python sitebuilder.py build
```

Then use the Netlify CLI to deploy:

```bash
netlify deploy -d build --prod
```

You might have to log in to Netlify or otherwise provide credentials/pick a site.

Note the `--prod` flag will clobber production and not give you a chance to preview the deployment, but assuming
you already previewed locally on the Flask server, this shouldn't be a problem.

# Your version

If you'd like to make your own version of a site based on this one, I've already done the work of
cleaning out the personal content. That version is [on Github as well](https://github.com/audiodude/rainfall).
