FBC.LoginColumn = function() {
    var col = this.element;
    var that = this;
    function formSubmitter(path, onSuccess) {
        // Returns a function that handles ajax submission of a form to `path`
        return function() {
            var form = $(this);
            var params = form.serializeArray();
            $('.errors', col).hide(); // Hide errors on *both* forms
            $('input:submit', form).attr('disabled', 'disabled');
            $('.form-msg', form).text('Submitting...');
            $.ajax({
                type: 'POST',
                url: path,
                data: params,
                dataType: 'json',
                success: function(data) {
                    $('.form-msg', form).text('');
                    $('input:submit', form).removeAttr('disabled');
                    if (data.success) {
                        onSuccess(form);
                    } else {
                        Helpers.setFormErrors(form, data.errors);
                    }
                }
            });
            return false;
        };
    }

    this.onRegSubmit = formSubmitter('/d/register/', function(form) {
        var username = $('input[name=username]', form).val();
        var password = $('input[name=password]', form).val();
        $('input:not(:submit)', form).val('');
        $('.login-login', col).show();
        $('.login-reg', col).hide();
        form = $('.login-login', col);
        $('input[name=username]', form).val(username);
        $('input[name=password]', form).val(password);
        $('.form-msg', form).text('Registration was successful! Whew. You can log in now.');
    });

    this.onLoginSubmit = formSubmitter('/d/login/', FBC.Auth.updateUserState);

    this.verifyRedditCodePosted = function() {
        if (!that.redditCode) {
            throw new Error('Verify without reddit code');
        }
        if (!that._verifyCodePostedInfo) {
            that._verifyCodePostedInfo = {
                started: new Date().getTime()
            };
        }
        $.ajax({
            type: 'POST',
            url: '/d/verifyredditcodeposted/',
            data: that.redditCode, // code, sig
            dataType: 'json',
            success: function(result) {
                // {
                //   success: bool,
                //   username: str, (optional -- present if success)
                //  }
                if (result.success) {
                    var form = $('.login-reg', that.element);
                    $('input[name=usersig]', form).val(result.usersig);
                    $('input[name=username]', form).val(result.username);
                    $('input[name=fake-username]', form).val(result.username);
                    $('input[name=password]', form).removeAttr('disabled');
                    $('input:submit', form).removeAttr('disabled');
                    $('.reddit_code_posted_msg', that.element).text('Code found! Please complete your registration below.').css('color', 'green');
                } else {
                    if ((new Date().getTime()) - that._verifyCodePostedInfo.started > 60*1000) {
                        console.log('reddit code verifier timed out');
                        $('.reddit_code_posted_msg', that.element).text('Your code was not found. Please refresh and try again. If you think this is an error, please contact you@gmail.com').css('color', 'red');
                    } else {
                        // Not found yet -- try again
                        setTimeout(that.verifyRedditCodePosted, 5000);
                    }
                }
            },
            error: FBC.GlobalError
        });
    };

    this.setupEvents = function() {
        console.log('setting up login window events');
        $('.switch-login', this.element).click(function() {
            $('.login-login', this.element).show();
            $('.login-reg', this.element).hide();
        });
        $('.switch-reg', this.element).click(function() {
            $('.login-login', this.element).hide();
            $('.login-reg', this.element).show();
        });
        $('.form-reg', this.element).submit(this.onRegSubmit);
        $('.form-login', this.element).submit(this.onLoginSubmit);
        $('.reddit_code_posted', this.element).click(function() {
            $('.reddit_code_posted', that.element).val("Fetching...");
            $('.reddit_code_posted', that.element).attr('disabled', 'disabled');
            $('.reddit_code_posted_msg', that.element).show();
            that.verifyRedditCodePosted();
            return false;
        });
    };

    this.gotRedditCode = function(result) {
        // {
        //  code: str,
        //  sig: str
        // }
        console.log('Got reddit code');
        that.redditCode = result;
        $('.reddit_code', this.element).text(result.code);
        $('.reddit_code_posted', this.element).removeAttr('disabled');
    };

    this.init = function() {
        console.log('logincolumn init');
        FBC.ColumnPrototype.init.apply(this, arguments);
        console.log('logincolumn init called super');
        $.ajax({
            type: 'POST',
            url: '/d/redditcode/',
            dataType: 'json',
            success: this.gotRedditCode
        });
        console.log('logincolumn init did ajax');
    };
};
FBC.LoginColumn.prototype = FBC.ColumnPrototype;
