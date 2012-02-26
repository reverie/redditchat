FBC.API = (function() {
    var pub = {};

    pub.roomFromName = function(name, success) {
        $.ajax({
            type: 'GET',
            url: '/d/getroom/',
            data: {shortname: name},
            dataType: 'json',
            success: success,
            error: FBC.GlobalError
        });
    };

    pub.normalizeShortname = function(s) {
        return s.replace(/ /g, '').toLowerCase();
    };

    return pub;
})();
