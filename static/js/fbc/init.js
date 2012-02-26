function init() {
    console.log('init called');

    var q = Helpers.parseUri(window.location).queryKey,
        roomsToJoin = [];

    if (q.join) {
        roomsToJoin = q.join.split(',');
    }

    FBC.ColumnManager.init();
    FBC.ColumnManager.appendColumn('login');
    // Join rooms from memory
    var recalled = FBC.RoomManager.recallRooms();
    if (!roomsToJoin.length && !recalled.length) {
        FBC.ColumnManager.appendColumn('room', {
            id: 'frontpage',
            title: 'Front Page',
            shortname: 'frontpage'
        });
        FBC.ColumnManager.appendColumn('roompicker');
    }
    FBC.UI.init();
    $(document).one('FBC_authStatus', function() {
        console.log('finishing init');
        FBC.Auth.assertSession();
        FBC.Strophe.init();
        $('#loading').hide();
    });
    FBC.Auth.updateUserState(); // this calls the above
    // Execute hash commands (deprecated)
    var hash = window.location.hash.substring(1);
    if (hash) {
        var kvs = hash.split('&');
        $.each(kvs, function(idx, val) {
            var kv = val.split('=');
            if (kv[0] == 'join') {
                // TODO: use RoomManager.joinRoomName
                FBC.API.roomFromName(kv[1], function(data) {
                    FBC.ColumnManager.appendColumn('room', data);
                });
            }
        });
        // Don't do this if there wasn't a hash,
        // because it adds an empty one:
        window.location.hash = '';
    }

    // Join rooms from GET param
    for (var i=0; i<roomsToJoin.length;i++) {
        FBC.RoomManager.joinRoomName(roomsToJoin[i]);
    }
    setTimeout(function() {
        // This is janky. At some point the ColumnManager animation should
        // be fixed. The problem case seems to be when you're doing something 
        // fast that turns on+off or off+on tabs/columns mode.
        $(window).trigger('resize');
    }, 1000);

    window.onbeforeunload = FBC.Strophe.disconnect;
}

init();
