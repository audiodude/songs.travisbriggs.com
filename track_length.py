# usage:
# $ poetry shell
# $ python track_length.py static/mp3/<track.mp3>
import sys

from mutagen.mp3 import MP3

track = MP3(sys.argv[1])
print(int(track.info.length * 1000))