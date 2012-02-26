// Rooms that we are currently in

FBC.RoomManager = (function() {
    var pub = {};

    var _rooms = {}; // id->pub
    var _roomListeners = {}; // id->callback (not list)

    function collectRoomIds() {
        var roomIds = [];
        $.each(_rooms, function(rid, room) { 
            roomIds.push(rid); 
        });
        return roomIds;
    }

    function joinRoom(data, opt_col) {
        if (opt_col) {
            FBC.ColumnManager.replaceColumn(opt_col, 'room', data);
        } else {
            FBC.ColumnManager.appendColumn('room', data);
        }
        rememberRooms();
    }

    function joinRoomName(roomName, opt_col) {
        // this eventually calls createAndJoin below
        FBC.API.roomFromName(roomName, function(data) {
            joinRoom(data, opt_col);
        });
    }

    function leave(room) {
        delete _rooms[room.getId()];
        delete _roomListeners[room.getId()];
        FBC.Strophe.leave(room.getId());
    }

    function createAndJoin(data) {
        if (_rooms[data.id]) {
            throw new Error('attempting to recreate ' + data.id);
        }
        FBC.Strophe.join(data.id);
        _rooms[data.id] = FBC.Room(data);
        return _rooms[data.id];
    }

    function getRooms() {
        return collectRoomIds();
    }

    function inRoom(id) {
        return Boolean(_rooms[id]);
    }

    function registerListener(id, callback) {
        if (_roomListeners[id]) {
            throw new Error("Duplicate room listener on " + id);
        }
        _roomListeners[id] = callback;
    }

    function tellMsg(id, msg) {
        if (!_roomListeners[id]) {
            return;
        }
        _roomListeners[id](msg);
    }

    function rememberRooms() {
        // use ColumnManager to get the order of columns right.
        var roomColumns = FBC.ColumnManager.columnsByType('room');
        var roomsJSON = [];
        $.each(roomColumns, function(i, roomColumn) { 
            if (roomColumn.getRoom) {
                var room = roomColumn.getRoom();
                roomsJSON.push({id:room.getId(), title:room.getTitle(), shortname:room.getShortname()});
            }
        });
        $.cookie(FBC.Globals.ROOMS_COOKIE, JSON.stringify(roomsJSON));
        return roomColumns;
    }

    function recallRooms() {
        try {
            var roomsJSON = JSON.parse($.cookie(FBC.Globals.ROOMS_COOKIE)||'[]');
            for (var i=0; i<roomsJSON.length; i++) {
                joinRoom(roomsJSON[i]);
            }
            return roomsJSON;
        } catch (err) {
            $.cookie(FBC.Globals.ROOMS_COOKIE, '[]');
            return [];
        }
    }

    pub.createAndJoin = createAndJoin;
    pub.getRooms = getRooms;
    pub.inRoom = inRoom;
    pub.leave = leave;
    pub.registerListener = registerListener;
    pub.tellMsg = tellMsg;
    pub.joinRoom = joinRoom;
    pub.joinRoomName = joinRoomName;
    pub.rememberRooms = rememberRooms;
    pub.recallRooms = recallRooms;
    return pub;
})();
