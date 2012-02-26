FBC.Room = function(args) {
    // args must have: id, shortname
    // id and shortname are identical for historical reasons
    // args can have: title, shortname_display, image_url
    console.log('called Room', arguments);
    var pub = {},
        _reqId = 0;

    var _id = args.id,
        _shortname = args.shortname,
        _title = args.title,
        _shortname_display = args.shortname_display,
        _image_url = args.image_url;

    var _typing; // The last announced state of user typing-or-not.

    if (!_id || _shortname===undefined) {
        throw new Error('Room missing parameter');
    }

    function writable() {
        return FBC.User.is_authenticated();
    }

    function readable() {
        // Deprecated.
        return true;
    }

    function roomJid() {
        // TODO: DRY with Strophe.makeRoomJid
        return _id + '@' + FBC.Strophe.XMPP_MUC_DOMAIN;
    }

    function send(msg) {
        var msg = $msg({to:roomJid(), 
                        from:FBC.Strophe.getJid(), 
                        type:'groupchat',
                        xmlns:Strophe.NS.CLIENT}).c('body', msg);
        FBC.Strophe.send(msg.tree());
        window.sentmsg = msg;
    }

    function delCookies() {
        $.each(document.cookie.split(';'), function(idx, val) {
            var cookie_name = val.split('=')[0];
            if (cookie_name.indexOf(_id) != -1) {
                console.log('deleting cookie', cookie_name);
                $.cookie(cookie_name, null);
            }
        });
    }

    function getUrl() {
        var url = window.location.href;
        if (url.indexOf('#') != -1) {
            url = url.substring(0, url.indexOf('#'));
        }
        url += '#join=' + (_shortname_display || _shortname);
        return url;
    }

    function configure() {
        // Accept the default configuration. See:
        // http://xmpp.org/extensions/xep-0045.html#createroom-instant
        console.log('Configure called');
        var msg = $iq({
            from: FBC.Strophe.getJid(), 
            id: 'configure_' + _id, 
            to: roomJid(), 
            type:'set'
        }).c('query', {
            xmlns: 'http://jabber.org/protocol/muc#owner'
        }).c('x', {xmlns: 'jabber:x:data', 'type':'submit'});
        FBC.Strophe.send(msg.tree());
        window.sentconfig = msg;
    }

    function banUser(userInfo, opt_callback) {
        var bannee = FBC.Strophe.jidFromUser(userInfo);
        var id = "banuser" + _reqId++;
        var iq = $iq({
            from: FBC.Strophe.getJid(), 
            id:id,
            to: roomJid(), 
            type:"set"
        }).c('query', {
            xmlns:'http://jabber.org/protocol/muc#admin'
        }).c('item', {
            affiliation:'outcast', 
            jid: bannee
        });
        if (opt_callback) {
            FBC.Strophe.addTempHandler(opt_callback, null, null, null, 
                    id, null, null);
        }
        FBC.Strophe.send(iq.tree());
    }

    function displayName() {
        var sn = _shortname_display || _shortname;
        var ret = sn + (sn && _title ? ' – ' : '') + _title;
        return ret || "Chat";
    }

    pub.getId = function(){return _id;};
    pub.getTitle = function(){return _title;};
    pub.getShortname = function(){return _shortname;};
    pub.getUrl = getUrl;
    pub.writable = writable;
    pub.readable = readable;
    pub.send = send;
    pub.delCookies = delCookies;
    pub.configure = configure;
    pub.banUser = banUser;
    pub.displayName = displayName;
    return pub;
};

