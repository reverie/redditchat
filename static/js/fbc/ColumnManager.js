FBC.ColumnManager = (function() {
    var pub = {};
    var _columns = []; // list of Column.pub objects in display-order
    var _cc = $('#col-container');
    var _tc = $('#tab-controls');
    var _displayMode = 'columns'; // columns or tabs
    var _selectedTab; // a column object

    var MARGIN = 8;
    var TABS_WIDTH = 180;

    function columnsByType(colType) {
        // Returns array of Column objects of given type
        var ar = [];
        $.each(_columns, function(idx, val) {
            if (val.getType() == colType) {
                ar.push(val);
            }
        });
        return ar;
    }

    function targetColWidth(numShown, totalWidth) {
        var remaining = totalWidth - MARGIN*(numShown-1);
        return Math.floor(remaining/numShown) - 1; // Why -1 on firefox? So annoying.
    };

    function getContentHeight() {
        var tbMargins = parseInt(_cc.css('marginTop'), 10) + parseInt(_cc.css('marginBottom'), 10);
        return $(window).height() - $('#header').height() - tbMargins;
    }

    function setSelectedTab(column) {
        // Must be called after at least one reRenderTabs
        _selectedTab = column;
        $('.column', _cc).hide();
        _selectedTab.getElement().show();
        $('span', _tc).removeClass('active');
        $.data(column, 'tab').addClass('active').removeClass('notify').get(0).scrollIntoView();
        $.event.trigger('FBC_tabSelect', column.getObjId());
    }

    function reRenderTabs() {
        var h = getContentHeight();
        console.log('setting tc height', h);
        _tc.height(h);
        _tc.empty();
        $.each(_columns, function(idx, col) {
            var li = $('<li>');
            var span = $('<span>');
            span.text($('h1.title', col.getElement()).text());
            li.append(span);
            _tc.append(li);
            li.click(function() {
                setSelectedTab(col);
            });
            if (col == _selectedTab) {
                span.addClass('active');
            }
            if (idx == _columns.length - 1) {
                span.addClass('last');
            }
            $.data(col, 'tab', span); // li would make sense, but we only need span
        });
    }

    function reRender(opt_newColumn, opt_noAnimate) {
        // If we are animating, knowing opt_newColumn helps. Required when adding a column.
        // opt_noAnimate prevents animated resizing
        //
        // In tabs mode, uses 'activeTab' class on all visible columns

        // Cancel prior animations. If you don't do this, animations will continue
        // after switching to tabs mode, and columns will end up the wrong width.
        $('.column', _cc).stop(true);

        //// Set height
        var height = getContentHeight()
        $('.column', _cc).height(height);
        // Set inner-container height:
        var icMargins = parseInt($('.inner_container:first', _cc).css('marginTop'), 10) + parseInt($('.inner_container:first', _cc).css('marginBottom'), 10);
        $('.inner_container', _cc).height(height - icMargins);

        //// Get and handle display-mode
        var numTotal = _columns.length;
        var newMode = (numTotal <= 5 ) ? 'columns' : 'tabs';
        if (newMode == 'tabs') {
            opt_noAnimate = true; // overridden if we are switching, below
        }
        // Handle switching:
        var ccWidth = _cc.width();
        if (_displayMode == 'tabs' && newMode == 'columns') {
            //cc.css('marginLeft', MARGIN);
            //$('#tab-controls').width(0);
            _cc.animate({'marginLeft': MARGIN + 'px'}, 200, 'swing');
            ccWidth += TABS_WIDTH;
            _tc.animate({'width': '0px'}, 200, 'swing');
            $('.column', _cc).show().width(1); // can't animate showing b/c we rely on :visible to indicate displayedness below (same for setSelectedTab)
            _selectedTab = null;
        } else if (_displayMode == 'columns' && newMode == 'tabs') {
            opt_noAnimate = false;
            if (!opt_newColumn) {
                throw new Error('How did we switch to tabs mode without appending a column?');
            }
            var ccMarginLeft = (TABS_WIDTH + MARGIN) + 'px';
            //cc.css('marginLeft', ccMarginLeft);
            //$('#tab-controls').width(TABS_WIDTH);
            _cc.animate({'marginLeft': ccMarginLeft}, 200, 'swing');
            ccWidth -= TABS_WIDTH;
            _tc.animate({'width': TABS_WIDTH + 'px'}, 200, 'swing');
        }
        _displayMode = newMode;
        // Other display mode logic:
        // reRenderTabs must come before setSelectedTab, for first exec
        if (_displayMode == 'tabs') {
            reRenderTabs();
        }
        if (_displayMode == 'tabs' && opt_newColumn) {
            setSelectedTab(opt_newColumn);
        }

        //// Set margins and calculate width
        var visibleCols = $('.column:visible', _cc);
        visibleCols.css('marginRight', MARGIN);
        visibleCols.filter(':last').css('marginRight', 0);
        var numShown = visibleCols.length;
        var width = targetColWidth(numShown, ccWidth);

        // Set widths
        if (opt_noAnimate || !FBC.UI.initted()) {
            visibleCols.width(width);
        } else {
            if (opt_newColumn) {
                // This initial skinnying serves gets rid of flickering when adding a column.
                var oldwidth = targetColWidth(numShown - 1, ccWidth);
                var change = Math.ceil(50 / (numShown - 1));
                visibleCols.width(oldwidth - change);
                opt_newColumn.getElement().width(0);
            }
            visibleCols.animate({'width': width+'px'}, 200, 'swing', function() {
                // Double-trigger of this event should be ok.
                // Necessary for width-dependent column resizers such as room input
                $.event.trigger('FBC_reRender');
            });
        }
        // Take care of hidden columns, in tab mode:
        $('.column:not(:visible)', _cc).width(width).css('marginRight', 0);

        // Trigger event
        $.event.trigger('FBC_reRender');
    }

    function newColumn(position, type, opt_args, opt_noAnimate) {
        console.log('new col at', position, type);
        // Creates a new column. It will be the
        // 0-indexed 'position'th column.
        var col = FBC.Column(type, opt_args);
        _columns.splice(position, 0, col);
        //$.each(_columns, function(idx, val) { console.log(val.getType(), val.getObjId()); });
        var element = col.getElement();
        console.log(element);
        if (position === 0) {
            console.log('newcol prepending');
            _cc.prepend(element);
        } else if (position == (_columns.length - 1)) {
            // subtract 1 because we already appended this one to _columns
            console.log('newcol appending');
            _cc.append(element);
        } else {
            console.log('newcol inserting');
            _columns[position - 1].getElement().after(element);
        }
        reRender(col, opt_noAnimate);
        return col;
    }

    function appendColumn(type, opt_args) {
        console.log('appendcol args', arguments);
        var position = _columns.length - columnsByType('about').length;
        var col = newColumn(position, type, opt_args);
        console.log('appended', col.getType(), col.getObjId());
        return col;
    }

    function deleteColumn(col, opt_noAnimate) {
        console.log('delete col', col.getObjId());
        var position = _columns.indexOf(col);
        console.log('delete from position', position);
        if (position == -1) {
            throw new Error("Column to delete not found in _columns.");
        }
        if (col == _selectedTab) {
            if (_displayMode != 'tabs') {
                throw new Error('How is this col the selected tab in columns mode?');
            }
            // We are necessarily in tabs mode
            if (position == _columns.length - 1) {
                // We have at least 5 cols, so this works:
                setSelectedTab(_columns[position - 1]);
            } else {
                setSelectedTab(_columns[position + 1]);
            }
        }
        col.preDelete();
        _columns.splice(position, 1);
        var element = col.getElement();
        element.remove(); // this gets the events as well
        reRender(undefined, opt_noAnimate);
    }

    function replaceColumn(col, newType, opt_args) {
        console.log('replacecol');

        // Delete column 'element', create a new one of
        // type newType, and replace the old one with the
        // new one in the same position
        var position = _columns.indexOf(col);
        if (position == -1) {
            throw new Error('replacing nonexistent column');
        }
        deleteColumn(col, true);
        newColumn(position, newType, opt_args, true);
    }

    function onLogin() {
        console.log('columnmanager onlogin');
        var loginCols = columnsByType('login');
        if (loginCols.length != 1) {
            loginCols = columnsByType('login2');
            if (loginCols.length != 1) {
                console.log(loginCols);
                throw new Error('How did we login w/o a window?');
            }
        }
        var login = loginCols[0];
        if (_columns[0] != login) {
            throw new Error('How was login not the first window?');
        }
        //replaceColumn(login, 'picker');
        deleteColumn(login);
        if (!_columns.length) {
            var q = Helpers.parseUri(window.location).queryKey;
            if (!q.join) {
                // In the case of q.join, we *only* put them in the
                // appropriate room, and do not encourage other rooms
                // Note that there ought to be the other column, but
                // there's a race condition where if you arrive on the
                // page authentication, login finishes before you're
                // done fetching the info of the other room to join it.
                appendColumn('roompicker');
            }
        }
    }

    function onLogout() {
        console.log('columnmanager onlogout');
        // User logged out: create a login window.
        if ((columnsByType('roompicker').length >= 2) && (_columns[0].getType() == 'roompicker')) {
            // Replace first column, if it's a picker
            replaceColumn(_columns[0], 'login');
        } else {
            // Otherwise just stick a new one at the beginning
            newColumn(0, 'login');
        }
    }

    function checkMinimumWindows() {
        if (!_columns.length) {
            appendColumn('roompicker');
            appendColumn('about');
        }
        //if ((_columns.length < 1) && (!columnsByType('picker').length)) {
        //    appendColumn('picker');
        //}
    }

    function toggleAbout() {
        var abouts = columnsByType('about');
        if (abouts.length) {
            deleteColumn(abouts[0]);
        } else {
            appendColumn('about');
        }
    }

    function forceAbout() {
        // Ensures that the About/Help column is visible
        // returns the about columns
        var abouts = columnsByType('about');
        if (abouts.length) {
            return abouts[0];
        }
        return appendColumn('about');
    }

    function showAboutItem(anchorName) {
        var col = forceAbout();
        col.showItem(anchorName);
    }

    function notify(col, msg) {
        if (_displayMode != 'tabs') {
            return;
        }
        if (col != _selectedTab) { 
            console.log('adding notify class');
            $.data(col, 'tab').addClass('notify');
        }
    }

    function openPM(userInfo) {
        var pmCol;
        $.each(columnsByType('pm'), function(idx, col) {
            // Make and use FBC.User.equal
            if (col.getUser().remote_id == userInfo.remote_id) {
                pmCol = col;
                return false;
            }
        });
        if (!pmCol) {
            pmCol = appendColumn('pm', userInfo);
        } 
        //else if (_displayMode == 'tabs') {
        //    setSelectedTab(pmCol);
        //}
        console.log('returning pmcol', pmCol);
        return pmCol;
    }

    function init() {
        // Put all general init stuff in here
        $(document).bind('FBC_authLogin', onLogin);
        $(document).bind('FBC_authLogout', onLogout);
        $(window).resize(function() {
            //console.log('calling rerender from window.resize event');
            reRender(undefined, true);
        });
    }

    pub.init = init;
    pub.appendColumn = appendColumn;
    pub.columnsByType = columnsByType;
    pub.deleteColumn = function() {
        // Internal version does not call cMW because it 
        // might be called by replaceColumn.
        deleteColumn.apply(this, arguments);
        checkMinimumWindows();
    };
    pub.replaceColumn = replaceColumn;
    pub.About = {
        toggle: toggleAbout,
        showItem: showAboutItem
    };
    pub.notify = notify;
    pub.openPM = openPM;
    return pub;
})();
