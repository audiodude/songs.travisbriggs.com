# songs.travisbriggs.com
This is the static site generator setup that powers [songs.travisbriggs.com](https://songs.travisbriggs.com).

It is written with lots of help from
[this fabulous article](https://nicolas.perriault.net/code/2012/dead-easy-yet-powerful-static-website-generator-with-flask/)

It uses Python, [Flask](http://flask.pocoo.org/), [Flask-FlatPages](https://pythonhosted.org/Flask-FlatPages/) and
[Frozen-Flask](https://pythonhosted.org/Frozen-Flask/).

Note that the repository contains metadata for mp3 files but not the actual mp3s themselves.

## Adding a song

The basic way this works is that for each song, there is an mp3 file in `static/mp3/` and a Markdown file in
`songs/`. These files need to have the same name.

The Markdown file should have some front matter that describes the song. Look at any example in the `songs/`
directory.

To get the track length of the song (which is specified in milliseconds in the front matter, by convention, but
not actually used anywhere in the site), use the following commands:

```bash
$ poetry shell
$ python track_length.py static/mp3/<song_title.mp3>
```

To add ID3 tags to songs, in case anyone ever downloads them (also not used anywhere in the site), use the
`id3.sh` script:

```bash
$ poetry shell
$ ./id3.sh 'Song title' static/mp3/song_title.mp3
```

# Your version

If you'd like to make your own version of a site based on this one, I've already done the work of
cleaning out the personal content. That version is [on Github as well](https://github.com/audiodude/rainfall).
