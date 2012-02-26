FBC.PMColumn = function() {
    var that = this; 

    this.init = function(type, user) {
        this.partnerPresent = true;
        this.user = user; // Must set up user before calling init
        this.packedUser = FBC.Strophe.packUser(user);
        this.jid = FBC.Strophe.makeJid(this.packedUser);
        FBC.ColumnPrototype.init.apply(this, arguments);
        $(document).bind('FBC_reRender.' + this.objId, this.resize);
        $(document).bind('FBC_tabSelect.' + this.objId, function(ev, objId) {
            // Resize when our tab is selected
            if (objId === that.objId) {
                that.resize();
            }
        });
        // Make it writable:
        $('input', this.element).removeAttr('disabled');
        $(':text', this.element).val('');
        $('.nowrite', this.element).hide();

        // subscribe to user's presence
        FBC.Strophe.send($pres({from: FBC.Strophe.getJid(), to:this.jid, type:'subscribe'}));
        // TODO: this reference is not cleaned up, prevent PMColumn GC
        FBC.Strophe.addPermHandler(
            that.handlePartnerPresence,
            null,
            'presence',
            null,
            null,
            this.jid,
            {matchBare: true}
        );

        // Gank focus
        setTimeout(function() { $('.msg_text', this.element).focus();}, 0);
    };

    this.setPartnerPresence = function(present) {
        if (this.partnerPresent && !present) {
            that.append($('<div style="font-style:italic">Chat partner signed off.</div>'));
        } else if (!this.partnerPresent && present) {
            that.append($('<div style="font-style:italic">Chat partner signed on.</div>'));

        }
        this.partnerPresent = present;
        if (present) {
            $('input', this.element).removeAttr('disabled');
        } else { 
            $('input', this.element).attr('disabled', 'disabled');
        }
    };

    this.handlePartnerPresence = function(msg) {
        console.log('handlePartnerPresence', msg);
        msg = $(msg);
        if (msg.attr('type') == 'unavailable') {
            that.setPartnerPresence(false);
        } else if (msg.children('show').text() == 'chat') {
            that.setPartnerPresence(true);
        } else {
            console.log('Unknown partner presence msg');
        }
        return true;
    };

    this.userUpdated = function(opt_eventData) {
        if (!FBC.User.is_authenticated()) {
            this.leave();
        }
    };

    this.leave = function() {
        if (that.element.hasClass('left')) {
            // we already left;
            return;
        }
        that.element.addClass('left');
        $('input', that.element).attr('disabled', true);
        $('.remove_on_leave', that.element).remove();
    };

    this.close = function() {
        that.leave();
        FBC.ColumnManager.deleteColumn(that.pub);
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
    };

    this.displayOwnMsg = function(msg) {
        var fakeMsg = {
            type: 'message',
            value: {
                content: msg,
                sender: FBC.User.me()
            }
        };
        fakeMsg.value.sender.is_you = true;
        console.log('fakemsg', fakeMsg);
        that.append(that.renderMsg(fakeMsg));
    };

    this.submit = function() {
        console.log('SENDING');
        var msg = $('.msg_text', that.element).val();
        if (msg) {
            $('.msg_text', that.element).val('');
            // TODO: send msg
            var stropheMsg = $msg({to:this.jid, 
                            from:FBC.Strophe.getJid(), 
                            type:'chat',
                            xmlns:Strophe.NS.CLIENT}).c('body', msg);
            FBC.Strophe.send(stropheMsg.tree());

            that.displayOwnMsg(msg);
        }
        $('.msg_text', this.element).focus();
    };

    this.setupEvents = function() {
        $('.msg_submit', that.element).click(that.submit);
        $(that.element).click(function(e) {
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
        $('.msg_text', that.element).keyup(function(e) {
            // Use keyup b/c we need length on first char
            var hasLength = Boolean(this.value.length);
            // TODO: announce typing
            // that.room.announceTyping(hasLength);
        });
        $('.closer', that.element).click(that.close);
        $(document).bind('FBC_reRender', function() {
            var m = $('.messages', that.element);
            m.scrollTop(m.attr('scrollHeight'));
        });
        //$('.login-link', this.element).click(function(){
        //    $.event.trigger('FBC_login_link_click');
        //});
        $('.room_menu', that.element).mouseenter(function(){
            // Reactivate menu when we mouse over the title.
            // (It gets deactivated when clicking an item.)
            $(this).addClass('active');
        });
    };

    this.render = function() {
        FBC.ColumnPrototype.render.call(this);
        console.log('specialized render called on', this.type, this.objId);
        var title = 'Private Message with ' + this.user.remote_id;
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

    this.renderMsg = function(msg) {
        console.log('rendering msg');
        msg = msg.value;
        var container = $('<div/>');
        var nametag = this.renderName(msg.sender.is_you, msg.sender.remote_id);
        container.append(nametag);
        var content;
        if (msg.content.indexOf("/me ") === 0) {
            content = msg.content.slice(3); // 3 keeps the space
        } else if (msg.content.indexOf("/slap ") === 0) {
            content = ' throws a paper airplane at ' +  msg.content.slice(5) + '.';
        } else {
            content = ': ' + msg.content;
        }
        var result = $('<span>').addClass('message');
        linkify(content, {
            callback: function(text, opt_href) {
                if (opt_href) {
                    result.append($('<a target="_blank" href="' + opt_href +'">' + text + '</a>'));
                } else {
                    result.append(document.createTextNode(text));
                }
            }
        });
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

    this.tell = function(newmsg) {
        console.log('PMColumn got new message of type', newmsg.type);
        if (newmsg.type == 'message') {
            if (newmsg.value.sender.is_you) {
                // We rendered these when they were sent.
                return;
            }
            FBC.UI.notify('New message...');
            console.log('sending notify msg');
            FBC.ColumnManager.notify(that.pub, 'New message...');
            that.append(that.renderMsg(newmsg));
            // they aren't typing no more.
            // a couple race conditions here.
            $('.typing', that.element).hide();
        } else if (newmsg.type == 'presence') {
            // close to reopen
        } else {
            throw new Error('Unknown message type in', newmsg);
        }
    };

    this.getUser = function() {
        // don't modify it >:|
        return that.user;
    }

    this.toMakePub.push('getUser');
    this.toMakePub.push('tell');
}
FBC.PMColumn.prototype = FBC.ColumnPrototype;
