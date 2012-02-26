FBC.RoomDB = (function(){
    var pub = {};
    var _roomsNumOnline = {}; // Maps rid -> numonline
    var _top10; // List of (room_id, numonline) for top 10 in descending order
    var _lastFetched; // timestamp of last fetch, or `undefined` for not yet
    var _onFirstFetch = []; // things to do after we get our first result

    var _roomInfo = {}; // roomid -> <Room>
    var _discoId = 0;

    function whenHaveInfo(rids, callback) {
        // Calls `callback` when we have titles and names for 
        // every rid in `rids`
        console.log('whenHaveInfo called', arguments);
        var missingRids = [];
        for (var i=0; i<rids.length; i++) {
            if (!_roomInfo[rids[i]]) {
                missingRids.push(rids[i]);
            }
        }
        console.log('wHI missingRids', missingRids);
        if (!missingRids.length) {
            console.log('wHT ending fast');
            callback();
        } else {
            console.log('wHI querying');
            $.ajax({
                type: 'GET',
                url: '/d/getrooms/',
                data: {rids: JSON.stringify(missingRids)},
                dataType: 'json',
                success: function(data) {
                    console.log('whenhaveinfo success got', data);
                    $.each(data, function(rid, val) {
                        _roomInfo[rid] = val;
                    });
                    console.log('wHI calling callback after success');
                    callback();
                },
                error: FBC.GlobalError
            });
        }
    }

    function _getTop10(callback) {
        // Passes list of [<Room>, numonline] to callback
        console.log('getTop10 called');
        var rids = [];
        for (var i=0; i<_top10.length; i++) {
            rids.push(_top10[i][0]);
        }
        whenHaveInfo(rids, function() {
            var rid;
            var result = [];
            for (i=0; i<_top10.length; i++) {
                rid = _top10[i][0];
                result.push([_roomInfo[rid], _top10[i][1]]);
            }
            callback(result);
        });
    }

    function getTop10(callback) {
        whenReady(function(){_getTop10(callback);});
    }

    function handleResult(msg) {
        // Set _roomsNumOnline and prep _top10
        console.log('handleResult', msg);
        var items = $('item', $(msg));
        _roomsNumOnline = {}; // Get rid of now-empty rooms
        _top10 = [];
        $.each(items, function(idx, item) {
            // name looks like "frontpage (2)"
            var parts = $(item).attr('name').split(' ');
            var rid = parts[0];
            var num = parts[1].slice(1,-1);
            num = parseInt(num, 10);
            if (!rid || !num) {
                // Case !rid: a persistent room created OOB whose jid does not match our expected format
                // Case !num: a persistent but empty room
                return;
            }
            _roomsNumOnline[rid] = num;
            _top10.push([rid, num]);
        });
        // Sort _top10 descending, numerically, by 2nd item
        _top10.sort(function(a,b){return b[1] - a[1]});
        _top10 = _top10.slice(0,10);
        //// Run _onFirstFetch
        var wasFirstTime = (_lastFetched === undefined); 
        // Must set _lastFetched before doing _onFirstFetches
        _lastFetched = new Date().getTime();
        if (wasFirstTime) {
            for (var i=0; i<_onFirstFetch.length; i++) {
                _onFirstFetch[i]();
            }
            _onFirstFetch = null;
        }
    }

    function _update() {
        console.log('updating update');
        _discoId++;
        var id = 'numonline' + _discoId;
        var iq = $iq({
            from: FBC.Strophe.getJid(), 
            id:id, 
            to:FBC.Strophe.XMPP_MUC_DOMAIN, 
            type:'get'
        }).c('query', {xmlns: 'http://jabber.org/protocol/disco#items'});
        FBC.Strophe.addTempHandler(handleResult, null, null, null, id, null, null);
        FBC.Strophe.send(iq.tree());
    }

    function update() {
        FBC.Strophe.whenReady(_update);
    }

    function whenReady(callback) {
        console.log('whenReady got callback');
        if (_lastFetched === undefined) {
            console.log('whenReady enqueueing');
            _onFirstFetch.push(callback);
        } else {
            console.log('whenReady fast finish');
            callback();
        }
    }

    function numOnline(rid) {
        return _roomsNumOnline[rid];
    }

    update(); // Load inital data
    setInterval(update, 60*1000); // Refresh every minute

    pub.getTop10 = getTop10;
    pub.whenReady = whenReady;
    pub.numOnline = numOnline;
    return pub;
})();

