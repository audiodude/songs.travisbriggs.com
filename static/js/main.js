$(function() {
  var globalPause;

  function play(playButton, audioPlayer) {
    $(playButton).find('.fa-play').hide();
    $(playButton).find('.fa-pause').show();
    audioPlayer.play();
    $.data(audioPlayer, 'playing', true);
  }

  function pause(playButton, audioPlayer) {
    $(playButton).find('.fa-pause').hide();
    $(playButton).find('.fa-play').show();
    audioPlayer.pause();
    $.data(audioPlayer, 'playing', false);
  }

  function updateDuration(player, duration) {
    $(player).find('.duration').text(formatTime(duration));
  }

  function formatTime(seconds) {
    var minutes = Math.floor(seconds / 60);
    var secsRem = Math.round(seconds % 60);
    if (secsRem < 10) {
      secsRem = '0' + secsRem;
    }
    return minutes + ':' + secsRem;
  }

  $('.song').each(function(i, song) {
    $(song).data('tagarray', $(song).data('tags').split(';'));
  });

  $('.tag').each(function(i, tag) {
    $(tag).click(function() {
      tagdata = $(tag).data('tag');
      window.console.log($(tag).data('tag'));
      $('.song').each(function(i, song) {
        var visible = (
          $(song).data('tagarray').indexOf(tagdata) != -1 ||
          tagdata == '__all__');
        $(song).toggle(visible);
      });

      var allShowing = tagdata == '__all__';
      $('#cur-tag-banner').toggle(!allShowing);
      $('#cur-tag').text(tagdata);
    });
  });

  $('.player').each(function(i, player) {
    var song_id = $(player).attr('data-song-id');
    var audioPlayer = $('#player-' + song_id).get(0);

    audioPlayer.addEventListener('ended', function() {
      pause($(player).find('.play-button').get(0), player);
      player.currentTime = 0;
    }, true);

    audioPlayer.addEventListener('timeupdate', function() {
      var percent = audioPlayer.currentTime * 100 / audioPlayer.duration;
      $(player).find('.progress').css({'width': percent + '%'});
      $(player).find('.current-time').text(formatTime(audioPlayer.currentTime));
    });

    audioPlayer.addEventListener('loadedmetadata', function() {
      updateDuration(player, audioPlayer.duration);
    });

    audioPlayer.addEventListener('play', function() {
      updateDuration(player, audioPlayer.duration);
    });

    $(player).find('.play-button').click(function() {
      if ($.data(audioPlayer, 'playing')) {
        pause(this, audioPlayer);
      }
      else {
        if (globalPause) {
          globalPause();
          globalPause = null;
        }
        play(this, audioPlayer);
        globalPause = pause.bind(null, this, audioPlayer);
      }
    });
  });

  function updateDurations() {
    $('.duration').each(function(i, duration) {
      if ($(duration).text() == '0:00') {
        var player = $(duration).closest('.player');
        var song_id = $(player).attr('data-song-id');
        var audioPlayer = $('#player-' + song_id).get(0);
        
        if (audioPlayer.duration) {
          $(duration).text(formatTime(audioPlayer.duration));
        }
      }
    });
  }

  window.setTimeout(updateDurations, 4000);
});
