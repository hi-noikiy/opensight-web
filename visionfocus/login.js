var Login = function() {
  this.url = 'http://121.41.72.231/client/';
  this.api = 'http://api.opensight.cn/api/ivc/v1/';
  this.salt = "opensight.cn";
  this.timeInterval = 0;

  var params = this.getUrlParams();
  if (undefined !== params.page){
    this.url = params.page;
  }
};
Login.prototype = {
  login: function(u, p, r) {
    if (undefined === u || "" === u) {
      return false;
    }
    if (undefined === u || "" === u) {
      return false;
    }
    if (true === this.logining) {
      return false;
    }
    this.logining = true;
    var d = new Date();
    d.setHours(d.getHours() + 1);
    var e = Math.ceil(d.getTime() / 1000);

    var data = { username: u, password: p, expired: e };
    var _this = this;
    $.ajax({
      url: this.api + 'plaintext_login',
      data: data,
      type: 'POST',
      success: function(json) {
        if (true === r) {
          $.cookie('username', u, { expires: 30 });
          $.cookie('password', p, { expires: 30 });
        }
        var ui = Base64.encodeURI(JSON.stringify(data));
        window.location.replace(_this.url + '?jwt=' + json.jwt + '&ui=' + ui + '&url=' + window.location.href);
      }, 
      error: function() {
        /* Act on the event */
        _this.logining = false;
        alert('用户名或密码错误。');
      }
    });
    return false;
  },
  get: function() {
    var u = $.cookie('username');
    var p = $.cookie('password');
    if (undefined === u || undefined === p) {
      return null;
    }
    return { username: u, password: p };
  },
  getUrlParams: function() {
    var href = window.location.href;
    var start = href.indexOf('?') + 1;
    if (0 === start) {
      return {};
    }
    var stop = href.indexOf('#');
    if (-1 === stop) {
      stop = href.length;
    }
    var seach = href.substring(start, stop);
    var url = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', url);
    return this.parseStr(seach, '&');
  },
  parseStr: function(str, sp) {
    var arr = str.split(sp);
    var data = {};
    var idx = 0;
    for (var i = 0, l = arr.length; i < l; i++) {
      var tmp = arr[i].split('=');
      if (2 > tmp.length) {
        continue;
      }
      data[tmp[0]] = tmp[1];
      idx++;
    }
    return data;
  },
  crypt_get: function(u, p, r) {
    if (undefined === u || "" === u) {
      return false;
    }
    if (undefined === u || "" === u) {
      return false;
    }
    if (true === this.logining) {
      return false;
    }
    this.logining = true;
    var d = new Date();
    d.setHours(d.getHours() + 1);
    var e = Math.ceil(d.getTime() / 1000);

    var data = { 
      username: u, 
      password: sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(p, this.salt, 10000)),
      expired: e 
    };
    var _this = this;
    $.ajax({
      url: this.api + 'user_login',
      data: data,
      type: 'POST',
      success: function(json) {
        if (true === r) {
          $.cookie('username', u, { expires: 30 });
          $.cookie('password', p, { expires: 30 });
        }
        var ui = Base64.encodeURI(JSON.stringify(data));
        window.location.replace(_this.url + '?jwt=' + json.jwt + '&ui=' + ui);
      },
      error: function() {
        /* Act on the event */
        _this.logining = false;
        alert('用户名或密码错误。');
      }
    });
    return false;
  }
};

$(function() {
  var login = new Login();
  var userinfo = login.get();
  if (null !== userinfo) {
    setTimeout(function() {
      $('#username').val(userinfo.username);
      $('#password').val(userinfo.password);
      $('#remember').prop('checked', true);
    }, 100);
  }

  $('#form').submit(function(event) {
    /* Act on the event */
    var u = $('#username').val();
    var p = $('#password').val();
    var r = $('#remember').prop('checked');
    // login.login(u, p, r);
    login.crypt_get(u, p, r);
    return false;
  });
});