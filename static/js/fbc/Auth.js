FBC.Auth = (function() {
    var pub = {};

    function noCookies() {
        console.log('ERROR: cookies disabled!');
        var parsed = Helpers.parseUri(window.location);
        // Try refreshing:
        var cookieFailParam = 'cookiefail';
        if (!parsed.queryKey[cookieFailParam]) {
            Helpers.replaceGetParam([cookieFailParam], 1);
        } else {
            FBC.UI.showButter('Cookies must be enabled');
        }
    }

    function assertSession() {
        if (!$.cookie(FBC.Globals.SESSION_COOKIE)) {
            noCookies();
        }
    }
 
    function getAuth(callback) {
        console.log('getauth');
        $.ajax({
            type: 'POST',
            url: '/d/getauth/',
            dataType: 'json',
            success: callback,
            error: FBC.GlobalError
        });
    }

    function updateUserState() {
        console.log('updateuserstate');
        getAuth(function(authResponse) {
            FBC.User.set(authResponse);
        });
    }

    function innerLogout() {
        // MUST delete session cookies, or else Django auth will still consider you logged in.
        // Also clears various signed permissions.
        console.log('innerlogout called');
        $.each(document.cookie.split(';'), function(idx, val) {
                console.log('deleting', val.split('=')[0]);
                $.cookie(val.split('=')[0], null);
        });
        console.log('calling updateuserstate');
        FBC.Auth.updateUserState();
    }

    function logout() {
        console.log('logout called');
        innerLogout();
    }

    pub.logout = logout;
    pub.updateUserState = updateUserState;
    pub.assertSession = assertSession;
    return pub;
})();

