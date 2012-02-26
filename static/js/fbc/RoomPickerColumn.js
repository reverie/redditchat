FBC.RoomPickerColumn = function() {
    var that = this;

    var _suggestedRooms = {}, // presence of key used to avoid duplicates
        _gotTop10 = false,
        _gotPages = false,
        _top10 = {},
        _pages = {}; // for some reason suggested rooms (not top 10) are called "pages"... i don't remember. maps shortName -> bool. oh yeah, because they were FB pages.


    this.joinRoom = function(data) {
        FBC.RoomManager.joinRoom(data, that.pub);
    };

    this.joinRoomName = function(roomName) {
        // roomName is a shortname, i.e. a subreddit like "pics" or "wtf"
        FBC.RoomManager.joinRoomName(roomName, that.pub);
    };

    this.roomLinkLi = function(room, numonline, callback) {
        // `room` is an API <Room>, not a FBC.Room object
        var li = $('<li>');
        if (room.image_url) {
            li.append($('<img src="' + room.image_url + '">').addClass('room_icon'));
        }
        var div = $('<div>').appendTo(li);
        var title = FBC.Room(room).displayName();
        div.append($('<span>').addClass('fakelink').text(title));
        div.append($('<br>'));
        var numOnlineMsg;

        // Got rid of this case because we always have numonline
        // for rooms that exist, since the get top 10 fetched
        // all rooms info.
        //if ((numonline === null) || (numonline === undefined)) {
        //    numOnlineMsg = '&nbsp;';
        //} else if (!numonline) {
        
        if (!numonline) {
            numOnlineMsg = 'Get this room started';
        } else {
            numOnlineMsg = numonline + ' online'
        }
        div.append($('<span>').html(numOnlineMsg).css('color', '#666666'));
        li.click(callback);
        return li;
    };

    this.gotTop10 = function(rooms) {
        // `rooms` is a list of [<Room>, numonline] tuples
        console.log('gotTop10 got', rooms);
        _gotTop10 = true;
        _top10 = {};
        var ul = $('.top_rooms ul', that.element);
        ul.empty();
        var numSuggested = 0;
        $.each(rooms, function(_idx, roomPair) {
            var room = roomPair[0],
                numOnline = roomPair[1];
            var normName = FBC.API.normalizeShortname(room.shortname);
            if (_pages[normName]) {
                // We already suggested this room
                return;
            }
            if (FBC.RoomManager.inRoom(room.id)) {
                return;
            }
            numSuggested++;
            _top10[normName] = true;
            var li = that.roomLinkLi(
                room,
                numOnline,
                function() { that.joinRoom(room); }
            );
            ul.append(li);
        });
        if (numSuggested) {
            $('.top_rooms', that.element).show();
        }
        if (_gotTop10 && _gotPages) {
            $('.loading_suggestions', this.element).hide();
        }
    };

    this.gotRoomSuggestions = function(rooms) {
        // TODO: factor out w/above
        console.log('gotRoomSuggestions ', rooms);
        _gotPages = true;
        _pages = {};
        var ul = $('.interest_rooms ul', that.element);
        ul.empty();
        var numSuggested = 0;
        $.each(rooms, function(_idx, room) {
            // val is (<Room>, subreddit_id) tuple
            if (_top10[room.shortname]) {
                return;
            }
            if (FBC.RoomManager.inRoom(room.id)) {
                return;
            }
            numSuggested++;
            _pages[room.shortname] = true;
            var li = that.roomLinkLi(
                room, 
                FBC.RoomDB.numOnline(room.id),
                function() { that.joinRoom(room); }
            );
            ul.append(li);
        });
        if (numSuggested) {
            $('.interest_rooms', that.element).show();
        }
        if (_gotTop10 && _gotPages) {
            $('.loading_suggestions', this.element).hide();
        }
    };

    this.userUpdated = function() {
        /* Suggest Reddit rooms to all Users:*/
        if (FBC.User) {
            $('.loading_suggestions', this.element).show();
            _gotPages = false;
            $('.interest_rooms', that.element).hide();
            $.ajax({
                type: 'GET',
                url: '/d/roomsuggestions/',
                dataType: 'json',
                success: function(data){
                    FBC.RoomDB.whenReady(
                        function() {
                            try {
                                that.gotRoomSuggestions(data);
                            } catch(e) {
                                console.log("ERROR when suggesting:");
                                console.log(e);
                            }
                        }
                    );
                },
                error: FBC.GlobalError
            });
        } else {
            _gotPages = true;
            if (_gotTop10) {
                $('.loading_suggestions', this.element).hide();
            }
        }
    };

    this.setupEvents = function() {
        $('.closer', this.element).click(function() {
            FBC.ColumnManager.deleteColumn(that.pub);
        });
        $('form', this.element).submit(function() {
            var roomName = $('input:text', this).val();
            // DON'T normalize; do it server-side so as to maintain case
            roomName = $.trim(roomName);
            if (!roomName.length) {
                return false;
            }
            $('input', this).attr('disabled', 'disabled');
            that.joinRoomName(roomName);
            return false;
        });
    };

    this.init = function() {
        FBC.ColumnPrototype.init.apply(this, arguments);
        FBC.RoomDB.getTop10(this.gotTop10);
    }
}
FBC.RoomPickerColumn.prototype = FBC.ColumnPrototype;
