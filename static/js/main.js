$(function() {
  var globalPause;

  $('.player').each(function(i, player) {
    var song_id = $(player).attr('data-song-id');
    $(player).find('.play-button').click(function() {
      var player = $('#player-' + song_id).get(0)
      if ($.data(player, 'playing')) {
        $(this).find('.fa-pause').hide();
        $(this).find('.fa-play').show();
        player.pause();
        $.data(player, 'playing', false);
      }
      else {
        if (globalPause) {
          globalPause();
          globalPause = null;
        }
        $(this).find('.fa-play').hide();
        $(this).find('.fa-pause').show();
        player.play();
        $.data(player, 'playing', true);
        globalPause = player.pause.bind(player);
      }
    });
  });
});
