FBC.AboutColumn = function() {
    var that = this;
    this.setupEvents = function() {
        $('.closer', this.element).click(function() {
            FBC.ColumnManager.deleteColumn(that.pub);
        });
    };

    this.showItem = function(anchorName) {
        // Highlights a particular FAQ item
        $('a.target.highlight', that.element).removeClass('highlight');
        var selector = 'a[name|=' + anchorName + ']';
        console.log('showItem', selector);
        var a = $(selector, that.element);
        if (a.length != 1) {
            console.log('ERROR: showitem anchorname not found');
            return;
        }
        a[0].scrollIntoView();
        a.addClass('highlight');
    };

    this.toMakePub.push('showItem');
};
FBC.AboutColumn.prototype = FBC.ColumnPrototype;
