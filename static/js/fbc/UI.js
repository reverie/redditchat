// Handles global UI features including column adder, logout, about, and titlebar notifications

FBC.UI = (function(){
    
    var pub = {};

    var _initted = false;

    // Notification stuff (flash title bar):
    var _origTitle;
    var _lastActivity;
    var _notifyMsg;
    var _notifyOn = false;
    var _hasUnseenMsg = false;

    function flashNotify() {
        if (_notifyOn) {
            document.title = _origTitle;
            _notifyOn = false;
        } else {
            var isInactive = ((new Date().getTime()) - _lastActivity) > 5000;
            if (_hasUnseenMsg && isInactive) {
                _notifyOn = true;
                document.title = _notifyMsg;
            }
        }
    }
    function activity() {
        _lastActivity = new Date().getTime();
        _hasUnseenMsg = false;
    }

    function notify(msg) {
        // Announce an event. This will be flashed in the titlebar if the user is inactive.
        _notifyMsg = msg;
        _hasUnseenMsg = true;
    }
    
    function setNumOnline(num) {
        num = parseInt(num) || 1;
        $('#num-online').text(num + ' Online').show();
    }

    function showButter(msg) {
        // Shows a message at the top of the page (like the 'Loading' msg, though
        // that's a separate system so it can be there when the page first appears)
        var d = $('<div>').addClass('banner');
        var s = $('<span>').addClass('contents').html(msg);
        d.append(s);
        $('body').append(d);
        return d;
    }

    function init() {
        if (_initted) {
            throw new Error('UI double init');
        }
        _initted = true;
        $(document).bind('FBC_authStatus', function(e, newStatus) {
            console.log('ui new status', newStatus);
            if (newStatus.authenticated) {
                var u = newStatus.user;
                $('#auth-username').text(u.remote_id);
                $('#auth-type-logo').attr('src', '/images/favicon.ico');
                $('#logged_in').show();
                $('#not_logged_in').hide();
                $('#logout-container').show();
            } else {
                $('#logged_in').hide();
                $('#not_logged_in').show();
                $('#logout-container').hide();
            }
        });
        $('#logout').click(FBC.Auth.logout);
        $('#about').click(FBC.ColumnManager.About.toggle);
        $('#column_adder').click(function(){
            FBC.ColumnManager.appendColumn('roompicker');
        });
        $(document).bind('keydown click mousemove', activity);
        _origTitle = document.title;
        setInterval(flashNotify, 3000);
        console.log('bound!');

        // # online:
        //updateNumOnline();
        //setInterval(updateNumOnline, 30*1000); // 2 secs
    }

    pub.init = init;
    pub.initted = function(){return _initted;};
    pub.notify = notify;
    //pub.tellMsg = tellMsg;
    pub.showButter = showButter;
    return pub;
})();

