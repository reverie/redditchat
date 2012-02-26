if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
        fromIndex = 0;
    } else if (fromIndex < 0) {
        fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex, j = this.length; i < j; i++) {
        if (this[i] === obj)
            return i;
    }
    return -1;
  };
}

$(function() {
	$('.js_activate').css('visibility', 'inherit');
});

window.Helpers = (function(){
    var pub = {};

    var parserOptions = {
        // (c) Steven Levithan <stevenlevithan.com>
        // from http://blog.stevenlevithan.com/archives/parseuri
        // MIT License

        strictMode: false,
        key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
        q:   {
            name:   "queryKey",
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    pub.parseUri = function(str) {
        // (c) Steven Levithan <stevenlevithan.com>
        // from http://blog.stevenlevithan.com/archives/parseuri
        // MIT License
        var o   = parserOptions;
            m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str)
            uri = {},
            i   = 14;

        while (i--) uri[o.key[i]] = m[i] || "";

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2;
        });

        return uri;
    };

    pub.replaceGetParam = function(key, newVal) {
        // Replaces window.location with the new value for the given GET parameter;
        var parsed = pub.parseUri(window.location);
        parsed.queryKey[key] = newVal;
        window.location.replace(parsed.path + '?' + $.param(parsed.queryKey));
    };

    pub.isEmpty = function(obj) {
        // from http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object-from-json
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop)) {
                return false;
            }
        }

        return true;
    };

    pub.setFormErrors = function(form, errors) {
        console.log('setformerrors', form, errors);
        $.each(errors, function(field, errList) {
            console.log('processing', field, errList);
            var elClass = (field == '__all__') ? '.form-errors' : ('.' + field + '-errors');
            var el = $(elClass, form);
            if (el.length != 1) {
                throw new Error('Expecting exactly one error container.');
            }
            // Allow HTML, e.g. for verification link
            el.html(errList[0]); // Only use first error for now
            el.show();
        });
    };

    pub.getSelText = function() {
        // http://www.codetoad.com/javascript_get_selected_text.asp
        if (window.getSelection) {
            return String(window.getSelection());
        } 
        if (document.selection) {
            return document.selection.createRange().text;
            }
        return '';
    };

    return pub
})();

// Fix for http://dev.jquery.com/ticket/6498
// Taken from http://forum.jquery.com/topic/object-doesn-t-support-this-property-or-method-from-jquery-1-4-1-in-ie7-only
$(function ()
    {
    $.ajaxSetup
        ({
        xhr: function()
            {
            if ($.browser.msie)
                {
                return new ActiveXObject("Microsoft.XMLHTTP");
                }
            else
                {
                return new XMLHttpRequest();
                }
            }
        })
    });


$(document).ajaxSend(function(event, xhr, settings) {
    function getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    function sameOrigin(url) {
        // url could be relative or scheme relative or absolute
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        // Allow absolute or scheme relative URLs to same origin
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            // or any other URL that isn't scheme relative or absolute i.e relative.
            !(/^(\/\/|http:|https:).*/.test(url));
    }
    function safeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }

    if (!safeMethod(settings.type) && sameOrigin(settings.url)) {
        xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
    }
});

