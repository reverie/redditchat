FBC.Column = function(type, opt_args) {
    console.log('Column');
    var maker = {
        room: FBC.RoomColumn,
        picker: FBC.PickerColumn,
        roompicker: FBC.RoomPickerColumn,
        login: FBC.LoginColumn,
        login2: FBC.LoginColumn2,
        about: FBC.AboutColumn,
        pm: FBC.PMColumn
    }[type];
    //console.log('maker is', maker);
    var col = new maker();
    console.log('the new column object:', col);
    var initArgs = [type];
    if (type == 'room') {
        // This doesn't belong here. Whole RoomColumn init API is janky.
        initArgs.push(FBC.RoomManager.createAndJoin(opt_args));
    } else if (opt_args) {
        initArgs.push(opt_args);
    }
    col.init.apply(col, initArgs);
    return col.pub;
}
