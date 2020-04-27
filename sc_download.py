import os
import re

import requests
import soundcloud


def main():
  # create a client object with your app credentials
  client = soundcloud.Client(client_id=os.environ['SC_CLIENT_ID'])

  # find all sounds of buskers licensed under 'creative commons share alike'
  tracks = client.get('/tracks',
                      user_id='36111',
                      limit=200,
                      linked_partitioning=1)

  for track in tracks.collection:
    slug = track.permalink
    with open(os.path.join('songs', slug + '.md'), 'w') as f:
      f.write('title: %s\n' % track.title)
      f.write('date: %s\n' % track.created_at[:10])
      f.write('duration: %s\n' % track.duration)
      f.write('tags: %r\n' % track.tag_list.split(' '))
      f.write('\n')
      f.write('%s\n' % track.description)

    if hasattr(track, 'download_url'):
      print('Downloading %s...' % track.title)
      resp = requests.get(track.download_url,
                          params={'client_id': os.environ['SC_CLIENT_ID']})
      if resp.status_code != 200:
        print('WARNING: could not download '
              'http://soundcloud.com/travis-briggs/%s' % track.permalink)
      with open(os.path.join('static', slug + '.mp3'), 'wb') as f:
        for chunk in resp.iter_content(1024):
          f.write(chunk)
    else:
      print('WARNING: could not download '
            'http://soundcloud.com/travis-briggs/%s' % track.permalink)


if __name__ == '__main__':
  main()
