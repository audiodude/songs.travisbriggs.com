$(function() {
  var globalPause;

  function play(playButton, player) {
    $(playButton).find('.fa-play').hide();
    $(playButton).find('.fa-pause').show();
    player.play();
    $.data(player, 'playing', true);
  }

  function pause(playButton, player) {
    $(playButton).find('.fa-pause').hide();
    $(playButton).find('.fa-play').show();
    player.pause();
    $.data(player, 'playing', false);
  }

  $('.player').each(function(i, player) {
    var song_id = $(player).attr('data-song-id');

    player.addEventListener('ended', function() {
      pause($(player).find('.play-button').get(0), player);
    }, true);

    $(player).find('.play-button').click(function() {
      var player = $('#player-' + song_id).get(0)
      if ($.data(player, 'playing')) {
        pause(this, player);
      }
      else {
        if (globalPause) {
          globalPause();
          globalPause = null;
        }
        play(this, player);
        globalPause = pause.bind(null, this, player);
      }
    });
  });
});
