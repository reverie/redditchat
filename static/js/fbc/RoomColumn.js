FBC.RoomColumn = function() {
    var that = this,
        _numOnline,
        _userMenu,
        _showDelays=true,
        _hasSeenDelays=false,
        _usersPresent = {}, // nodeName -> true
        _nicknameToNode = {}, // nickname -> node/username/remote_id
        _showJoinLeave = true, // whether to show people arriving/leaving
        _myAffiliation;

    this.addMenuItem = function(text, callback) {
        var menu = $('.room_menu ul', this.element);
        var li = $('<li>').text(text).click(function() {
            $('.room_menu', this.element).removeClass('active');
            callback.apply(this, arguments);
        });
        menu.append(li);
        $('li:not(:first)', menu).css('borderTop', '1px solid #ccc');
    };

    this.clearMenu = function() {
        $('.room_menu li', this.element).remove();
    };

    this.init = function(type, room) {
        this.room = room; // Must set up room before calling init
        FBC.ColumnPrototype.init.apply(this, arguments);
        $(document).bind('FBC_reRender.' + this.objId, this.resize);
        $(document).bind('FBC_tabSelect.' + this.objId, function(ev, objId) {
            // Resize when our tab is selected
            if (objId === that.objId) {
                that.resize();
            }
        });
        FBC.RoomManager.registerListener(this.room.getId(), this.tell);
        // Gank focus
        setTimeout(function() { $('.msg_text', this.element).focus();}, 0);
    };

    this.tellWho = function() {
        var container = document.createElement('div');
        container.appendChild(document.createTextNode('In this room: '));
        var items = [];
        var numGuests = 0;
        var info, isYou, name;
        $.each(_usersPresent, function(user, x) {
            if (user.indexOf('guest') === 0) {
                numGuests++;
            } else {
                info = FBC.Strophe.unpackUser(user);
                isYou = FBC.User.isYou(info.remote_id);
                items.push(that.renderName(isYou, info.remote_id).get(0));
            }
        });
        if (numGuests) {
            items.push($('<span>').text(numGuests + ' guest' + ((numGuests==1) ? '' : 's')).get(0));
        }
        console.log(items);
        $.each(items, function(idx, item) {
            container.appendChild(item);
            if (items.length >= 2) {
                if (idx == items.length - 2) { // second to last
                    container.appendChild(document.createTextNode(" and "));
                } else if (idx != items.length - 1) {
                    container.appendChild(document.createTextNode(", "));
                }
            }
        });
        container.appendChild(document.createTextNode("."));
        that.append($(container));
    };

    this.toggleJoinLeave = function(ev) {
        _showJoinLeave = !_showJoinLeave;
        $(this).remove();
        that.addJoinLeaveMenuItem();
    };

    this.addJoinLeaveMenuItem = function() {
        if (_showJoinLeave) {
            this.addMenuItem("Hide joins/leaves", this.toggleJoinLeave);
        } else {
            this.addMenuItem("Show joins/leaves", this.toggleJoinLeave);
        }
    };

    this.populateMenu = function() {
        this.addMenuItem('Link to this room', function() {
            var m = $('.url_link_modal', that.element);
            $('input:text', m).val(that.room.getUrl());
            FBC.Globals.modal = m.modal();
        });
        this.addMenuItem("Who's in here?", this.tellWho);
        this.addJoinLeaveMenuItem();
    };

    this.userUpdated = function(opt_eventData) {
        if (!this.room.readable()) {
            return this.leave();
        }
        if (this.room.writable()) {
            $('input', this.element).removeAttr('disabled');
            $(':text', this.element).val('');
            $('.nowrite', this.element).hide();
        } else {
            $('input', this.element).attr('disabled', true);
            $('.nowrite', this.element).show();
        }
        this.resize();
        this.clearMenu();
        this.populateMenu();
    };

    this.leave = function() {
        if (that.element.hasClass('left')) {
            // we already left;
            return;
        }
        that.element.addClass('left');
        $('input', that.element).attr('disabled', true);
        $('.remove_on_leave', that.element).remove();
        FBC.RoomManager.leave(this.room);
    };

    this.close = function() {
        that.leave();
        //FBC.ColumnManager.replaceColumn(that.pub, 'roompicker');
        FBC.ColumnManager.deleteColumn(that.pub);
        FBC.RoomManager.rememberRooms();
    };

    this.resize = function() {
        //console.log('resize called on', that.type, that.objId);
        var ic = $('.inner_container', that.element);
        var title = $('.title', ic);
        var messages = $('.messages', ic);
        var send = $('.send', ic);
        // Size input field -- must come before Size messages, or else it's jumpy when reducing on FF
        $('.msg_text', ic).width(send.width() - $('.msg_submit', ic).width() - 30); // TODO: why 30? (was 24)

        // Size messages
        var roomLeft = ic.height() - parseInt(messages.css('marginTop'), 10) - parseInt(messages.css('marginBottom'), 10) - parseInt(messages.css('paddingTop'), 10) - parseInt(messages.css('paddingBottom'), 10) - title.height() - send.height() - 8; // TODO: why 8?
        //console.log('setting room height', roomLeft);
        if (isNaN(roomLeft) || roomLeft < 0) {
            // On first init, marginTop/marginBottom can return NaN in IE7 somehow
            roomLeft = 0;
        }
        messages.height(roomLeft);
        messages.scrollTop(messages.prop('scrollHeight'));
    };

    this.displayOwnMsg = function(msg) {
        var fakeMsg = {
            type: 'message',
            value: {
                room_id: this.room.getId(),
                content: msg,
                sender: FBC.User.me()
            }
        };
        fakeMsg.value.sender.is_you = true;
        console.log('fakemsg', fakeMsg);
        that.append(that.renderMsg(fakeMsg));
    };

    this.handleOwnCommand = function(cmd) {
        // Handle commands, i.e. messages that start with /
        // For example, /who, or /me ...
        // Some will be purely local, others will be sent
        // across the wire.
        assert(cmd.indexOf('/')===0, "Invalid command");
        var parts = cmd.split(' ');
        var cmdName = parts[0].slice(1).toLowerCase();
        var args = parts.slice(1);
        if (cmdName === 'who' || cmdName == 'w') {
            this.tellWho();
            return;
        }
        if (cmdName == 'join' || cmdName == 'j') {
            var roomName = args.join(' ');
            FBC.RoomManager.joinRoomName(roomName);
            return;
        }
        // The above commands are strictly local. All
        // other commands get sent across the wire,
        // and are handled on this client and receiving
        // clients by renderMsg.
        if (cmdName == 'me' || cmdName == 'slap') {
            that.room.send(cmd);
            that.displayOwnMsg(cmd);
        } else {
            that.append($('<div>').text("Unknown command: " + cmdName));
        }
    };

    this.submit = function() {
        console.log('SENDING');
        var msg = $('.msg_text', that.element).val();
        if (msg) {
            $('.msg_text', that.element).val('');
            if (msg.indexOf('/') === 0) {
                that.handleOwnCommand(msg);
            } else {
                that.room.send(msg);
                that.displayOwnMsg(msg);
            }
        }
        $('.msg_text', this.element).focus();
    };

    this.hideUserMenu = function() {
        if (_userMenu) {
            _userMenu.remove();
            _userMenu = null;
        }
    };


    this.showUserMenu = function(ev) {
        if ($(ev.target).closest('.column').get(0) != that.element.get(0)) {
            // Live event was triggered for a username in a different column
            return;
        }
        // Hide previous menu, if any
        that.hideUserMenu();

        // Gather data
        var nametag = $(ev.target);
        var remote_id = nametag.data('remote_id');
        var profile_url = FBC.User.makeProfileUrl(remote_id);
        var userInfo = {
            remote_id: remote_id
        };

        // Initialize menu
        var menu = $('<ul>').addClass('user-menu');
        menu.css('top', nametag.position().top + nametag.height());
        menu.css('left', nametag.position().left);

        // Add items
        menu.append($('<li>').text(remote_id).addClass('title'));
        if (profile_url) {
            menu.append($('<li>').addClass('link').text('View profile').click(function() {
                window.open(profile_url);
            }));
        }
        if (FBC.User.is_authenticated()) {
            menu.append($('<li>').addClass('link').text('Send private message').click(function() {
                FBC.ColumnManager.openPM(userInfo);
            }));
        } else {
            menu.append($('<li>').addClass('link disabled').text('Sign in to send private message'));
        }
        if (_myAffiliation == 'owner' || _myAffiliation == 'admin') {
            // TODO: don't show option if user is unbannable (admin or owner)
            menu.append($('<li>').addClass('link').text('Ban from this room').click(function() {
                that.room.banUser(userInfo, function() {
                    // TODO: different message if the ban fails
                    var msg = "· " + remote_id + " has been banned.";
                    that.append($('<div>').text(msg).addClass('presence-msg'));
                });
            }));
        }
        

        // Record, style, and insert
        _userMenu = menu;
        $('li:not(:first)', menu).css('borderTop', '1px solid #ccc');
        console.log('putting usermenu in', $('.messages', that.element));
        $('.messages', that.element).append(menu);
    };

    this.setupEvents = function() {
        $('.msg_submit', that.element).click(that.submit);
        $(that.element).click(function(e) {
            that.hideUserMenu();
            if (Helpers.getSelText().length) {
                return;
            }
            $('.msg_text', that.element).focus();
        });
        $('.msg_text', that.element).keypress(function(e) {
            if (e.which == 13) { // ENTER
                that.submit();
            } 
        });
        $('.msg_text', that.element).keydown(function(e) {
            if (e.which == 9) {
                e.preventDefault();
                that.tabComplete();
            }
        });
        //$('.msg_text', that.element).keyup(function(e) {
        //    // Use keyup b/c we need length on first char
        //    var hasLength = Boolean(this.value.length);
        //    that.room.announceTyping(hasLength);
        //});
        $('.closer', that.element).click(that.close);
        $(document).bind('FBC_reRender', function() {
            var m = $('.messages', that.element);
            m.scrollTop(m.prop('scrollHeight'));
        });
        //$('.login-link', this.element).click(function(){
        //    $.event.trigger('FBC_login_link_click');
        //});
        $('.room_menu', that.element).mouseenter(function(){
            // Reactivate menu when we mouse over the title.
            // (It gets deactivated when clicking an item.)
            $(this).addClass('active');
        });

        // User info
        $('.username-auth.username-them').live('click', that.showUserMenu); // We can't limit this to the column (restriction of .live)
    };

    this.render = function() {
        FBC.ColumnPrototype.render.call(this);
        console.log('specialized render called on', this.type, this.objId);
        console.log(this.room);
        var title = this.room.displayName();
        $('.title', this.element).text(title);
    };

    this.renderName = function(is_you, remoteId) {
        console.log('renderName got', arguments);
        var nametag = $('<span class="username"></span>');
        nametag.text(remoteId);
        nametag.addClass(is_you ? 'username-you' : 'username-them');
        nametag.addClass('username-auth');
        if (!is_you) {
            nametag.attr('title', 'Show menu...');
        }
        nametag.data('remote_id', remoteId);
        return nametag;
    };

    this.tabComplete = function() {
        // TODO: make it cycle through names instead of just picking one
        // TODO: make it use a <username> tag
        //console.log('tabcomplete starting');
        var m = $('.msg_text', this.element);
        var t = m.val();
        //console.log('val', t);
        var words = t.split(" ");
        if (!words.length) {
            return
        }
        var lastWord = words[words.length - 1];
        //console.log('lastword', lastWord);
        var userNames = [];
        $.each(_usersPresent, function(user, _x) {
            if (user.indexOf('guest') !== 0) {
                var info = FBC.Strophe.unpackUser(user);
                userNames.push(info.remote_id);
            }
        });
        //console.log('userNames', userNames);
        var potentialMatches = [];
        $.each(userNames, function(_idx, name) {
            if (name.indexOf(lastWord) === 0) {
                potentialMatches.push(name);
            }
        });
        //console.log('potentialMatches', potentialMatches);
        if (potentialMatches.length == 1) {
            console.log("replacing!");
            var match = potentialMatches[0];
            if (words.length == 1) {
                // Add a colon if the first word of a line
                match = match + ': ';
            }
            words[words.length - 1] = match;
            m.val(words.join(' '));
        }
    };

    this.msgTextToNodes = function(content, result) {
        // Renders any special attributes in `content`, currently
        // links and <username> tags, turning the text into a sequence
        // of DOM elements which are appended to the `result` container node
        linkify(content, {
            callback: function(text, opt_href) {
                if (opt_href) {
                    // Handle links
                    result.append($('<a target="_blank" href="' + opt_href +'">' + text + '</a>'));
                } else {
                    // Handle non-link text: parse for username mentions to render:
                    if (text.indexOf("<username>") == -1) {
                        // Usual case: no mentions to render:
                        result.append(document.createTextNode(text));
                    } else {
                        // There are username mentions:
                        var startIdx, endIdx, lowText, piece,
                            START_TAG = '<username>',
                            END_TAG = '</username>';
                        while (text) {
                            lowText = text.toLowerCase();
                            startIdx = lowText.indexOf(START_TAG);
                            if (startIdx == -1) {
                                result.append(document.createTextNode(text));
                                break;
                            } else if (startIdx > 0) {
                                piece = text.slice(0, startIdx);
                                result.append(document.createTextNode(piece));
                                text = text.slice(startIdx);
                            } else {
                                assert(startIdx==0);
                                endIdx = lowText.indexOf(END_TAG);
                                piece = text.slice(START_TAG.length, endIdx);
                                result.append(that.renderName(FBC.User.isYou(piece), piece));
                                text = text.slice(endIdx + END_TAG.length);
                            }
                        }
                    }
                }
            }
        });
    };

    this.renderMsg = function(msg) {
        // given a <Data Container> with type 'message',
        // return a DOM node to be inserted into the chatroom
        console.log('rendering msg', msg);
        msg = msg.value;
        var container = $('<div/>');
        var nametag = this.renderName(msg.sender.is_you, msg.sender.remote_id);
        container.append(nametag);
        var content = msg.content;
        if (content.indexOf("/me ") === 0) {
            content = content.slice(3); // 3 keeps the space
        } else if (content.indexOf("/slap ") === 0) {
            content = ' throws a paper airplane at ' +  content.slice(5);
        } else {
            content = ': ' + content;
        }
        var result = $('<span>').addClass('message');
        this.msgTextToNodes(content, result);
        container.append(result);
        return container;
    };

    this.append = function(ele) {
        ele = $(ele).css('paddingTop', '3px');
        var messages = $('.messages', this.element);
        messages.append(ele);
        // +1 to slowly account for creation of scrollbar when it happens
        messages.scrollTop(messages.scrollTop()+ele.height() + 5);
    };

    this.setNumOnline = function(numOnline) {
        _numOnline = parseInt(numOnline);
        if (_numOnline === 0) {
            _numOnline = 1;
        }
        $('.room_numonline', that.element).text(_numOnline + ' Online').show();
    };

    this.nickNameToSender = function(nickname) {
        console.log("nickNameToSender got", nickname);
        assert(_nicknameToNode[nickname]);
        var u = {
            remote_id: _nicknameToNode[nickname]
        };
        u.is_you = FBC.User.isYou(u.remote_id);
        console.log("nickNameToSender returning", u);
        return u;
    };

    this.tell = function(newmsg) {
        // Take action based on a received <Data Container>
        var type = newmsg.type,
            value = newmsg.value;
        if (type == 'message') {
            if (!value.delayed) {
                // if value.delayed, message is required to include sender already
                value.sender = that.nickNameToSender(value.nickname);
            }
            if (value.sender.is_you && !value.delayed) {
                // We rendered these when they were sent.
                return;
            }
            if (value.delayed) {
                if (!_hasSeenDelays) {
                    _hasSeenDelays = true;
                }
                if (!_showDelays) {
                    console.log('ignoring delayed message');
                    return;
                }
                // Takes effect after we have seen this batch of messages:
                setTimeout(function(){_showDelays=false;}, 0);
            } else if (_hasSeenDelays) {
                _showDelays = false;
            }

            FBC.UI.notify('New message...');
            FBC.ColumnManager.notify(that.pub, 'New message...');
            that.append(that.renderMsg(newmsg));
            // they aren't typing no more.
            // a couple race conditions here.
            //$('.typing', that.element).hide();
        } else if (type == 'presence') {
            console.log("room got presence", value);
            // Data prep
            console.log("mapping nickname:", value.nickname, value.user);
            _nicknameToNode[value.nickname] = value.user;
            var packedUser = value.user,
                present = value.value,
                username = FBC.Strophe.unpackUser(packedUser).remote_id,
                isYou = FBC.User.isYouPacked(packedUser);
            // Update our database of who's in this room
            if (present) {
                _usersPresent[packedUser] = true;
                console.log(packedUser, 'is', value.affiliation, value.role);
            } else {
                delete _usersPresent[packedUser];
            }
            // Set num online
            console.log("setting num online...");
            var count = 0;
            for (k in _usersPresent) if (_usersPresent.hasOwnProperty(k)) count++;
            that.setNumOnline(count || 1);
            // Optionally show join/leave msg
            if (_showJoinLeave && !(packedUser.indexOf('guest') === 0)) {
                console.log("logging msg...");
                var msg = [' ·', username, 'has', present ? 'joined' : 'left', 'the room.'].join(' ');
                that.append($('<div>').text(msg).addClass('presence-msg'));
            }
            // If room is newly created, configure it.
            // This makes it "persistent" so that we can add and remove admins
            // in the database
            if (value.newCreated) {
                assert(isYou);
                console.log('Calling configure');
                that.room.configure();
            }
            // Show a message if someone just got banned
            if (isYou && value.banned) {
                that.append($('<div>').text("· You were banned from the room :(").addClass('presence-msg'));
            } else if (value.banned) {
                var msg = "· " + username + " was banned from the room";
                that.append($('<div>').text(msg).addClass('presence-msg'));
            }
            // Record your affiliation
            if (FBC.User.isYouPacked(packedUser)) {
                _myAffiliation = value.affiliation;
                if (value.affiliation == 'owner' || value.affiliation == 'admin') {
                    // Notify you if you're an admin
                    that.append($('<div>').text("· You are a moderator in this room.").addClass('presence-msg'));
                }
            }
        } else if (type == 'error') {
            var msg = "· " + value.text;
            that.append($('<div>').text(msg).addClass('presence-msg'));
        } else {
            throw new Error('Unknown message type in', newmsg);
        }
    };

    this.getRoom = function() {
        // don't modify it >:|
        return that.room;
    }

    this.toMakePub.push('getRoom');

}
FBC.RoomColumn.prototype = FBC.ColumnPrototype;
