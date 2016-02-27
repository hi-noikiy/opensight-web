'use strict';
var api = 'http://121.41.72.231:5001/api/ivc/v1/';
angular.module('app.controller', []).controller('header', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.project = {
    list: []
  };
  $scope.selected = 'default';
  $rootScope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams) {
    if ('default' === toState.name){
      $scope.selected = 'default';
    } else if (undefined !== toParams.project){
      $scope.selected = toParams.project;
    }
  });
  $scope.url = api + "users/" + $scope.username + '/projects';
  $scope.url = api + 'projects';

  $http.get($scope.url, {}).success(function(response) {
    $scope.project = response;
    $rootScope.project = response;
    $rootScope.$broadcast('projectChangeSuccess', response);
  }).error(function(response, status) {
    console.log('error');
  });
  $scope.$on('responseErrorStart', function(rejection) {
    console.log('responseErrorStart');
  });
}]).controller('project', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.project = $rootScope.$stateParams.project;
  $scope.boolFalse = false;
  $scope.boolTrue = true;

  $http.get(api + "projects/" + $scope.project, {
  }).success(function(response) {
    $scope.info = response;
  }).error(function(response, status) {
    console.log('error');
  });

  $scope.save = function(){
    var data = {
      title: $scope.info.title,
      media_server: $scope.info.media_server,
      is_public: $scope.info.is_public,
      desc: $scope.info.desc,
      long_desc: $scope.info.long_desc,
    };
    $http.put(api + "projects/" + $scope.project, data).success(function(response) {
      console.log('success');
    }).error(function(response, status) {
      console.log('error');
    });
  };
}]).controller('camera', ['$scope', '$rootScope', '$http', '$uibModal', function ($scope, $rootScope, $http, $uibModal) {
  var getBitmap = function(f, bits) {
    var t = [];
    var i = 0;
    do {
      t[i] = f % 2;
      f = Math.floor(f / 2);
      i++;
    } while (f > 0);
    while (i < bits) {
      t[i] = 0;
      i++;
    }
    return t;
  };
  var parse = function(flags){
    var m = getBitmap(flags, 8);
    var ab = [{
      text: 'LD',
      title: '流畅',
      cls: '',
      idx: 0
    }, {
      text: 'SD',
      title: '标清',
      cls: '',
      idx: 1
    }, {
      text: 'HD',
      title: '高清',
      cls: '',
      idx: 2
    }, {
      text: 'FHD',
      title: '超清',
      cls: '',
      idx: 3
    }];
    var t = [];
    for (var i = 0, l = ab.length; i < l; i++){
      if (1 === m[ab[i].idx]){
        t.push(ab[i]);
      }
    }

    return {
      live: 0 === m[5],
      ability: t
    };
  };

  $scope.project = $rootScope.$stateParams.project;
  $scope.camera = {list:[]};

  $http.get(api + "projects/" + $scope.project + '/cameras', {}).success(function(response) {
    for (var i = 0, l = response.list.length; i < l; i++){
      var flags = parse(response.list[i].flags);
      response.list[i].ability = flags.ability;
      response.list[i].live = flags.live;
      if (0 !== response.list[i].ability.length){
        response.list[i].quality = response.list[i].ability[0].text;
      }
    }
    $scope.camera = response;
  }).error(function(response, status) {
    console.log('error');
  });

  $scope.enable = function(cam, enabled){
    var tip = enabled ? '允许直播后可以远程观看直播，是否继续？' : '禁止直播后无法远程观看，同时会停止正在播放的直播，是否继续？';
    if (false === confirm(tip)){
      return false;
    }
    var data = {
      enable: enabled
    };
    $http.post(api + "projects/" + $scope.project + '/cameras/' + cam.uuid + '/stream_toggle', data).success(function(response) {
      console.log('success');
      cam.live = enabled;
    }).error(function(response, status) {
      console.log('error');
    });
  };
  $scope.select = function(cam, quality){
    cam.quality = quality;
  };
  $scope.preview = function(cam, format){
    cam.format = format;
    $scope.cam = cam;
    var modalInstance = $uibModal.open({
      templateUrl: 'sessionModalContent.html',
      controller: 'session',
      resolve: {
        caminfo: function () {
          return $scope.cam;
        }
      }
    });
  };
}]).controller('camera-detail', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.project = $rootScope.$stateParams.project;
  $scope.camera = $rootScope.$stateParams.camera;
  $scope.url = api + "projects/" + $scope.project + '/cameras/' + $scope.camera;

  $http.get($scope.url, {
  }).success(function(response) {
    $scope.info = response;
  }).error(function(response, status) {
    console.log('error');
  });

  $scope.save = function(){
    var data = {
      flags: $scope.info.flags,
      desc: $scope.info.desc,
      long_desc: $scope.info.long_desc,
      longitude: $scope.info.longitude,
      latitude: $scope.info.latitude,
      altitude: $scope.info.altitude
    };
    $http.put($scope.url, data).success(function(response) {
      console.log('success');
    }).error(function(response, status) {
      console.log('error');
    });
  };
}]).controller('log', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.project = $rootScope.$stateParams.project;
  $scope.list = [];
  $scope.start = {
    dt: new Date(),
    opened: false
  };
  $scope.end = {
    dt: new Date(),
    opened: false
  };
  $scope.params = {limit: 100};
  $scope.bFirst = true;
  $scope.bLast = true;
  $scope.open = function(opts){
    opts.opened = true;
  };
  $scope.query = function(opts){
    $scope.params.start_from = format($scope.start.dt) + 'T00:00:00';
    $scope.params.end_to = format($scope.end.dt) + 'T23:59:59';
    $scope.params.reverse = false;
    $scope.params.last_end_time = undefined;
    $scope.params.last_session_id = undefined;
    $scope.bFirst = true;

    get($scope.params, function(){
      $scope.bLast = true;
    });
    $scope.bLast = false;
  };
  
  $scope.next = function(){
    $scope.params.reverse = false;
    $scope.params.last_end_time = $scope.list[$scope.list.length - 1].end;;
    $scope.params.last_session_id = $scope.list[$scope.list.length - 1].uuid;
    get($scope.params, function(){
      $scope.bLast = true;
    });
    $scope.bFirst = false;
  };
  $scope.prev = function(){
    $scope.params.reverse = true;
    $scope.params.last_end_time = $scope.list[0].end;;
    $scope.params.last_session_id = $scope.list[0].uuid;
    get($scope.params, function(){
      $scope.bFirst = true;
    });
    $scope.bLast = false;
  };

  var get = function(params, fn){
    $http({
      url: api + "projects/" + $scope.project + '/session_logs', 
      method: "GET",
      params: params
    }).success(function(response) {
      $scope.list = response.list;
      if (response.list.length !== params.limit){
        fn();
      }
    }).error(function(response, status) {
      console.log('error');
    });
  };
  var format = function(dt){
    return [dt.getFullYear(), dt.getMonth(), dt.getDate()].join('-');
  };
}]).controller('default', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.project = $rootScope.project;

  $http.get(api + "users/" + $scope.username, {}).success(function(response) {
    $scope.userinfo = response;
  }).error(function(response, status) {
    console.log('error');
  });
  $scope.$on('projectChangeSuccess', function(event, data) {
    $scope.project = data;
    console.log('projectChangeSuccess');
  });
}]).controller('user-info', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;

  $http.get(api + "users/" + $scope.username, {}).success(function(response) {
    $scope.info = response;
  }).error(function(response, status) {
    console.log('error');
  });
}]).controller('user-passwd', ['$scope', '$rootScope', '$http',function ($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.old_password = '';
  $scope.new_password = '';
  $scope.repeat_password = '';

  $scope.save = function(){
    if ($scope.new_password !== $scope.repeat_password){
      alert('确认密码输入不一致');
      return false;
    }
    var data = {
      old_password: $scope.old_password,
      new_password: $scope.new_password
    }
    $http.put(api + "users/" + $scope.username + '/password', data).success(function(response) {
      console.log('success');
    }).error(function(response, status) {
      console.log('error');
    });
  };
}]).controller('key', ['$scope', '$rootScope', '$http', '$uibModal', function ($scope, $rootScope, $http, $uibModal) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.url = api + "users/" + $scope.username + '/access_keys';

  $http.get($scope.url, {}).success(function(response) {
    $scope.keys = response;
  }).error(function(response, status) {
    console.log('error');
  });

  $scope.open = function(key_id){
    $scope.key_id = key_id;
    var modalInstance = $uibModal.open({
      templateUrl: 'secretModalContent.html',
      controller: 'secret',
      resolve: {
        access_key: function () {
          return $scope.key_id;
        }
      }
    });
  };
}]).controller('secret', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'access_key', function ($scope, $rootScope, $http, $uibModalInstance, access_key) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.url = api + 'access_keys/' + access_key + '/secret';

  $http.get($scope.url, {}).success(function(response) {
    $scope.secret = response.secret;
  }).error(function(response, status) {
    console.log('error');
  });
  $scope.ok = function(){
    $uibModalInstance.close();
  };
}]).controller('session', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'caminfo', function ($scope, $rootScope, $http, $uibModalInstance, caminfo) {
  $scope.cam = caminfo;
  $scope.sec = 10;

  var user = $rootScope.$jwt.get().aud;
  var project = $rootScope.$stateParams.project;
  var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/sessions';
  var tiptimer = undefined;
  var alivetimer = undefined;

  var create = function(){
    $http.post(url, {format: caminfo.format.toLowerCase(), quality: caminfo.quality.toLowerCase(), create: true, user: user}).success(function(response) {
      $scope.id = response.session_id;
      if ('' === document.createElement('video').canPlayType('application/x-mpegURL')) {
        loadFlash(response);
      } else {
        addVideoTag(response);
      }
      keepalive(response);
      if (tiptimer) {
        clearInterval(tiptimer);
        tiptimer = undefined;
      }
    }).error(function(response, status) {
      console.log('error');
    });
  };
  var loadFlash = function(info){
    var flashvars = {
      // src: 'http://www.opensight.cn/hls/camera1.m3u8',
      src: info.url,
      plugin_hls: "flashlsOSMF.swf",
      // scaleMode: 'none',
      autoPlay: true
    };

    var params = {
      allowFullScreen: true,
      allowScriptAccess: "always",
      wmode: 'opaque',
      bgcolor: "#000000"
    };
    var attrs = {
      name: "videoPlayer"
    };

    swfobject.embedSWF("GrindPlayer.swf", "videoPlayer", "100%", "100%", "10.2", null, flashvars, params, attrs);
  };
  var addVideoTag = function(info){};
  var keepalive = function(info){
    if (undefined !== alivetimer){
      clearInterval(alivetimer);
      alivetimer = undefined;
    }
    alivetimer = setInterval(function(){
      $http.post(url + '/' + info.session_id, {}).success(function(response) {

      }).error(function(response, status) {
        console.log('error');
      });
    }, 30000);
  };
  var stop = function(){
    if (undefined !== alivetimer){
      clearInterval(alivetimer);
      alivetimer = undefined;
    }
    if (undefined === $scope.id){
      return;
    }
    $http.delete(url + '/' + $scope.id, {}).success(function(response) {

    }).error(function(response, status) {
      console.log('error');
    });
  };
  var updateTip = function(){
    tiptimer = setInterval(function(){
      if (1 === $scope.sec && undefined !== tiptimer){
        clearInterval(tiptimer);
        tiptimer = undefined;
        return;
      }
      $scope.sec--;
    }, 1000);
  };

  create();
  updateTip();
  $scope.ok = function(){
    stop();
    $uibModalInstance.close();
  };
}]);
