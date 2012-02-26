var FBC = {};

if (!window.console) {
    window.console = {
        log: function(){}
    };
}

function assert(val, opt_msg) {
    if (!val) {
        throw new Error(opt_msg || "Assertion failed");
    }
}
