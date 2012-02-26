FBC.ColumnPrototype = {
    init: function(type) {
        var that = this;
        this.objId = ++(FBC.Globals.ObjectId);
        this.type = type;
        console.log('column init', this.type, this.objId);
        this.render();
        this.setupEvents();
        this.userUpdated();
        $(document).bind('FBC_authStatus.' + this.objId, function(){that.userUpdated();});
        // setup 'pub'
        var pub = {};
        $.each(this.toMakePub, function(idx, val) {
            pub[val] = function(){return that[val].apply(that, arguments);};
        });
        this.pub = pub;
    },

    render: function() {
        var that=this;
        console.log('render called on', this.type, this.objId);
        var prototype = $('#col_prototype_' + this.type);
        if (!prototype) {
            throw new Error('Column type has no prototype');
        }
        console.log('my prototype:', prototype);
        if (this.element) {
            throw new Error('Overwriting element');
        }
        this.element = prototype.clone();
        this.element.removeAttr('id');
        // Set up labels
        $('.label_pair', this.element).each(function(index) {
            var container = $(this);
            var id = [that.type, that.objId, 'opt', index].join('_');
            $('input', container)[0].id = id;
            $('label', container)[0].htmlFor = id;
        });
    },

    preDelete: function() {
        $(document).unbind('.' + this.objId);
    },

    // common interface stubs:
    element: null,
    pub: null,
    userUpdated: function(){},
    setupEvents: function(){},
    getType: function(){return this.type;},
    getElement: function(){
        //console.log('getelement called on', this.type, this.objId);
        return this.element;
    },
    getObjId: function(){return this.objId;},
    toMakePub: ['preDelete', 'getType', 'getElement', 'getObjId']
};
