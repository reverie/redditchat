FBC.GlobalError = function() {
    console.log("shouldn't happen. connectivity error?");
    var msg = $('<span>').text('Connection error. ');
    var refresh = $('<span>Try refreshing.</span>');
    refresh.css('textDecoration', 'underline');
    refresh.css('cursor', 'pointer');
    refresh.click(function() {
        window.location.replace(window.location);
    });
    msg.append(refresh);
    FBC.UI.showButter(msg);
}

