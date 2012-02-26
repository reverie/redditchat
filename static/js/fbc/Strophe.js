// Gets messages from ejabberd and routes them to the appropriate components

FBC.Strophe = (function() {
    var pub={};

    var _onConnect = {}; // <Connection> -> [callbacks];
    var _onFirstConnect = []; // [callbacks] // used so we can take callbacks before init
    var _gotFirstConnect = false;
    var _connection;
    var _permHandlers = [];

    var XMPP_DOMAIN = 'chat.' + Helpers.parseUri(window.location).host;
    var XMPP_MUC_DOMAIN = 'conference.' + XMPP_DOMAIN;

    var packUser = function(u) {
        return u.remote_id;
    };

    var unpackUser = function(s) {
        return {
            remote_id: s
        };
    }

    function isMe(jid) {
        var myNode = Strophe.getNodeFromJid(_connection.jid);
        var msgResource = Strophe.getResourceFromJid(jid);
        return myNode == msgResource;
    }

    function getMsgRid(msg) {
        // Rid = room ID
        var jid = msg.attr('from');
        var node = Strophe.getNodeFromJid(jid);
        return node;
    }


    function isFromRoom(msg) {
        var from = msg.attr('from');
        if (!from) {
            return false;
        }
        return Strophe.getDomainFromJid(from) == XMPP_MUC_DOMAIN;
    }

    function validateAndParseMessage(msg) {
        var from = msg.attr('from');
        var domain = Strophe.getDomainFromJid(from);
        var apimsg = {type: 'message', value: {}};
        var packedUser, sender;
        if (domain == XMPP_MUC_DOMAIN) {
            // TODO: factor out w/below
            nickname = Strophe.getResourceFromJid(from);
            if (!nickname) {
                console.log('this message is from the room, not a user -- ignoring');
                return;
            }
            if (nickname.indexOf('guest') === 0) {
                // Prevents guests from showing up
                console.log('msg from guest -- investigate');
                return;
            }
            var rid = getMsgRid(msg);
            apimsg.value = {
                room_id: rid,
                content: msg.children('body').text(),
                delayed: Boolean(msg.children('delay').length),
                nickname: nickname
            };
            if (apimsg.value.delayed) {
                // TODO: assign a full user in this case, since we have it
                var delayFrom = msg.find('delay').attr('from');
                var delayFromNode = Strophe.getNodeFromJid(delayFrom);
                apimsg.value.sender = {
                    remote_id: delayFromNode,
                    is_you: FBC.User.isYou(delayFromNode)
                };
            }
            if (!apimsg.value.content) {
                console.log("message with no content, maybe a status change or typing from full XMPP client");
                return;
            }
        } else if (domain == XMPP_DOMAIN) {
            packedUser = Strophe.getNodeFromJid(from);
            if (packedUser.indexOf('guest') === 0) {
                console.log('msg from guest -- investigate');
                return;
            }
            sender = unpackUser(packedUser);
            apimsg.value = {
                content: msg.children('body').text(),
                delayed: Boolean(msg.children('delay').length),
                sender: sender
            };
            apimsg.value.sender.is_you = FBC.User.isYou(sender.remote_id);
            if (!apimsg.value.content) {
                console.log("message with no content, maybe a status change or typing from full XMPP client");
                return;
            }
        } else {
            throw new Error('Unknown msg domain', domain);
        }
        return apimsg;
    }

    function realHandler(msg) {
        console.log('got msg', msg);
        var type = msg.nodeName;
        msg = $(msg);
        var rid, apimsg = {type: type}, info;
        if (type == 'message') {
            apimsg = validateAndParseMessage(msg);
            if (!apimsg) {
                console.log('invalid message', msg);
                return;
            }
            rid = apimsg.value.room_id;
            if (rid) {
                // It's a MUC message
                console.log('telling roommanager', rid, apimsg);
                FBC.RoomManager.tellMsg(rid, apimsg);
            } else {
                // It's a private message
                FBC.ColumnManager.openPM(apimsg.value.sender).tell(apimsg);
            }
        } else if (type == 'presence') {
            var item = msg.find('item');
            if (isFromRoom(msg)) {
                rid = getMsgRid(msg);
                if (item.length) {
                    apimsg.value = {
                        user: Strophe.getNodeFromJid(item.attr('jid')),
                        nickname: Strophe.getResourceFromJid(msg.attr('from')),
                        value: !(msg.attr('type') == 'unavailable'),
                        role: item.attr('role'),
                        affiliation: item.attr('affiliation'),
                        // Presence includes 201 status code if we just created the room
                        // http://xmpp.org/extensions/xep-0045.html#createroom
                        // http://xmpp.org/registrar/mucstatus.html
                        newCreated: Boolean(msg.find('status[code=201]').length),
                        // Presence includes 301 status code if banned
                        banned: Boolean(msg.find('status[code=301]').length)
                    };
                } else {
                    // Error condition
                    assert(msg.attr('type') == 'error');
                    apimsg = {
                        type: 'error',
                        value: {
                            code: parseInt(msg.find('error').attr('code'), 10),
                            condition: msg.find('error').children()[0].nodeName,
                            text: msg.find('text').text()
                        }
                    };
                }
                console.log('sending presence to room', apimsg);
                FBC.RoomManager.tellMsg(rid, apimsg);
            } else {
                if (msg.attr('type') == 'subscribe') {
                    // They want to subscribe to our presence -- allow them
                    send($pres({
                        from: _connection.jid,
                        to: msg.attr('from'),
                        type:'subscribed'
                    }));
                }
            }
        }
    }

    function handler(msg) {
        // Handles all messages, for now
        try {
            realHandler(msg);
        } catch(e) {
            console.log('ERROR in handler:', e);
            // TODO: handle errors here
            window.e = e;
            window.msg = msg;
            throw e;
        }
        return true;
    }

    function makeNode() {
        if (FBC.User.is_authenticated()) {
            return packUser(FBC.User.me());
        } else {
            return 'guest' + parseInt(Math.random()*10000000000);
        }
    }

    function makeJid(opt_node) {
        var node = opt_node || makeNode();
        return node + '@' + XMPP_DOMAIN;
    }

    function addOnConnect(conn, f) {
        if (conn && conn.connected) {
            console.log('addonconnect executing');
            f();
        } else {
            _onConnect[conn] = _onConnect[conn] || [];
            _onConnect[conn].push(f);
        }
    }

    function makeOnStateChange(conn) {
        return function(code, opt_msg) {
            console.log('Strophe in state', arguments);
            if (code == Strophe.Status.CONNECTED) {
                _gotFirstConnect = true;
                $.each(_onConnect[conn], function(i,v) {v()});
                _onConnect[conn] = [];
            } else if (code == Strophe.Status.AUTHFAIL) {
                console.log("Authentication failed");
                FBC.Auth.logout();
            } else if (code == Strophe.Status.CONNFAIL) {
                if (opt_msg == 'conflict') {
                    console.log('You have signed on in another location.');
                    FBC.Auth.logout();
                } else {
                    console.log('Connection lost for unknown reason');
                    FBC.GlobalError();
                }
            } else if (code == Strophe.Status.DISCONNECTING || code == Strophe.Status.DISCONNECTED) {
                if (!conn.disconnectIntentional) {
                    console.log('Unintentional disconnect on Strophe connection.');
                    FBC.GlobalError();
                }
            }
        }
    }

    function makeRoomJid(rid) {
        // Use node Node as nickname. Can we enforce this server-side?
        return rid + '@' + XMPP_MUC_DOMAIN + '/' + makeNode();
    }

    function join(rid) {
        if (!_connection) {
            // We are initting. When the first connection is complete, this room will be
            // joined anyway.
            return;
        }
        addOnConnect(_connection, function() {
            send($pres({from:_connection.jid , to:makeRoomJid(rid)}).c('x',{'xmlns':Strophe.NS.MUC}).tree());
        });
    }

    function leave(rid) {
        // <presence to='room@service/nick'
        //           type='unavailable'>
        //   <status>comment</status>
        // </presence
        if (!_connection) {
            // We are initting. When the first connection is complete, this room won't be
            // joined anyway.
            return;
        }
        addOnConnect(_connection, function() {
            send($pres({from:_connection.jid , to:makeRoomJid(rid), type:'unavailable'}).c('x',{'xmlns':Strophe.NS.MUC}).tree());
        });
    }

    function reconnect() {
        console.log('reconnecting');
        var oldConn = _connection;
        var c = new Strophe.Connection('/http-bind');
        _connection = c;
        c.addHandler(handler, null, null, null, null, null);
        var jid = makeJid();
        console.log('jid', jid);
        var pass = $.cookie("s_mu_info");
        c.connect(jid, pass, makeOnStateChange(c));
        if (oldConn === undefined) {
            // This is our first connection. 
            for (var i=0; i<_onFirstConnect.length; i++) {
                addOnConnect(c, _onFirstConnect[i]);
            }
            // Prevent any more writes to _onFirstConnect:
            _onFirstConnect = null;
            // Detect if ejabberd is down:
            console.log('setting timeout for connect check');
            setTimeout(function() {
                console.log('running timeout for connect check');
                if (!_gotFirstConnect) {
                    console.log('failed timeout for connect check');
                    FBC.GlobalError();
                }
            }, 5000);
        }
        addOnConnect(c, function() {
            if (oldConn && oldConn.connected) {
                console.log('calling disconnect on oldconn');
                oldConn.disconnectIntentional = true;
                oldConn.disconnect();
            }
            console.log('onconnect executing');
            c.send($pres().c('show', 'chat').tree());
            $.each(FBC.RoomManager.getRooms(), function(idx, rid) {
                join(rid);
            });
            for (var i=0; i<_permHandlers.length; i++) {
                console.log('adding permHandler on new connection');
                c.addHandler.apply(c, _permHandlers[i]);
            }
        });
    }

    function getJid() {
        return _connection.jid;
    }

    function getNode() {
        var jid = getJid();
        return Strophe.getNodeFromJid(jid);
    }

    function disconnect() {
        _connection.disconnect(); 
        _connection.flush(); 
    }

    function send(msg) {
        addOnConnect(_connection, function() {
            _connection.send(msg);
        });
        console.log('sent to strophe...');
    }

    function init() {
        // authStatus because sessionid changes on both login AND logout

        $(document).bind('FBC_authStatus', reconnect);
        reconnect();
    }

    function addTempHandler() {
        // This is a *Temp* handler because it will
        // not be re-added on a reconnect
        //console.log('addTempHandler', arguments);
        if (!_connection) {
            throw new Error('addTempHandler before connection present');
        }
        _connection.addHandler.apply(_connection, arguments);
    }

    function addPermHandler() {
        console.log('addPermHandler', arguments);
        _permHandlers.push(arguments);
        if (_connection) {
            _connection.addHandler.apply(_connection, arguments);
        } // else, it will do it when it connects
    }
    
    function whenReady(cb) {
        if (_connection) {
            addOnConnect(_connection, cb);
        } else {
            _onFirstConnect.push(cb);
        }
    }

    function jidFromUser(userInfo) {
        // <User> -> JID
        var node = packUser(userInfo);
        return makeJid(node);
    }

    // All public functions should have the semantic
    // "execute this when the first or current
    // connection is ready"
    pub.init = init;
    pub.disconnect = disconnect;
    pub.getJid = getJid;
    pub.getNode = getNode;
    pub.send = send;
    pub.join = join;
    pub.leave = leave;
    pub.unpackUser = unpackUser;
    pub.packUser = packUser;
    pub.makeJid = makeJid;
    pub.addTempHandler = addTempHandler;
    pub.addPermHandler = addPermHandler;
    pub.whenReady = whenReady;
    pub.jidFromUser = jidFromUser;
    pub.XMPP_DOMAIN = XMPP_DOMAIN;
    pub.XMPP_MUC_DOMAIN = XMPP_MUC_DOMAIN;
    return pub;
})();

