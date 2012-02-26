FBC.User = (function() {
    var pub = {};
    var _authenticated = false;
    var _user; //  See API file <User>

    function set(opt_user) {
        console.log('User.set', opt_user);
        var newAuth = !!(opt_user);
        var authChanged = (newAuth != _authenticated);
        _authenticated = newAuth;
        _user = opt_user;
        var msg = {
            'authenticated': _authenticated,
            'user': _user // TODO: change 'types' to 'user'
        };
        $.event.trigger('FBC_authStatus', msg);
        if (authChanged && _authenticated) {
            $.event.trigger('FBC_authLogin', msg);
        }
        if (authChanged && !_authenticated) {
            $.event.trigger('FBC_authLogout', msg);
        }
    }

    function isYou(remote_id) {
        return remote_id == FBC.Strophe.getNode();
    }

    function isYouPacked(packedUser) {
        // deprecated
        // packedUser is now a remote_id
        // i.e. a reddit username
        return isYou(packedUser);
    }

    function makeProfileUrl(remote_id) {
        return "http://reddit.com/user/" + remote_id;
    }

    pub.is_authenticated = function(){ return _authenticated;};
    pub.set = set;
    pub.isYou = isYou;
    pub.isYouPacked = isYouPacked;
    pub.makeProfileUrl = makeProfileUrl;
    pub.me = function() {
        return {
            remote_id: _user.remote_id
        };
    };
    return pub;
})();

