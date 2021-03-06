'use strict';
var api = api || 'http://api.opensight.cn/api/ivc/v1/';
angular.module('app.controller', [])

.controller('header', [
  '$scope', '$rootScope', '$http', '$timeout',
  function($scope, $rootScope, $http, $timeout) {
    $scope.username = $rootScope.$jwt.get().aud;
    $scope.project = {
      list: []
    };
    $scope.selected = 'default';
    $rootScope.$on('$stateChangeSuccess', function(e, toState, toParams, fromState, fromParams) {
      if ('default' === toState.name) {
        $scope.selected = 'default';
      } else if (undefined !== toParams.project) {
        $scope.selected = toParams.project;
      }
    });
    $scope.url = api + "users/" + $scope.username + '/projects';
    // $scope.url = api + 'projects';

    $scope.logout = function() {
      if (true === confirm('是否退出登录？')) {
        jwt.logout();
      }
    };

    $http.get($scope.url, {}).success(function(response) {
      $scope.project = response;
      $rootScope.project = response;
      $rootScope.$broadcast('projectChangeSuccess', response);
    }).error(function(response, status) {
      console.log('error');
    });
    $rootScope.$on('responseErrorStart', function(rejection) {
      console.log('responseErrorStart');
    });


    $scope.message = {
      bshow: false,
      list: [],
      timer: undefined,
      remove: function(idx) {
        $scope.message.list.splice(idx, 1);
        if (0 === $scope.message.list.length) {
          $scope.message.hide();
        }
      },
      show: function(msg) {
        $scope.message.clear();
        $scope.message.list = [msg];
        $scope.message.bshow = true;
        $scope.message.autohide();
        // $scope.$apply();
      },
      hide: function() {
        $scope.message.list = [];
        $scope.message.bshow = false;
        $scope.message.clear();
        // $scope.$apply();
      },
      clear: function() {
        if (undefined === $scope.message.timer) {
          return;
        }
        $timeout.cancel($scope.message.timer);
        $scope.message.timer = undefined;
      },
      push: function(msg) {
        $scope.message.clear();
        $scope.message.list.push(msg);
        $scope.message.bshow = true;
        $scope.message.autohide();
        // $scope.$apply();
      },
      autohide: function() {
        $scope.message.timer = $timeout(function() {
          $scope.message.timer = undefined;
          $scope.message.hide();
        }, 5000);
      }
    };
    $rootScope.$on('messageShow', function(event, data) {
      console.log('messageShow');
      $scope.message.show(data);
    });
    $rootScope.$on('messageHide', function(event) {
      console.log('messageHide');
      $scope.message.hide();
    });
    $rootScope.$on('messagePush', function(event, data) {
      $scope.message.push(data);
      console.log('messagePush');
    });
  }
])

.controller('project', [
  '$scope', '$rootScope', '$http',
  function($scope, $rootScope, $http) {
    $scope.project = $rootScope.$stateParams.project;
    $scope.boolFalse = false;
    $scope.boolTrue = true;

    $http.get(api + "projects/" + $scope.project, {}).success(function(response) {
      $scope.info = response;
    }).error(function(response, status) {
      console.log('error');
    });

    $scope.save = function() {
      var data = {
        title: $scope.info.title,
        media_server: $scope.info.media_server,
        is_public: $scope.info.is_public,
        desc: $scope.info.desc,
        long_desc: $scope.info.long_desc
      };
      $http.put(api + "projects/" + $scope.project, data).success(function() {
        console.log('success');
      }).error(function(response, status) {
        console.log('error');
      });
    };
  }
])

.controller('camera', [
  '$scope', '$rootScope', '$http', '$uibModal', 'flagFactory', 'pageFactory',
  function($scope, $rootScope, $http, $uibModal, flagFactory, pageFactory) {
    $scope.project = $rootScope.$stateParams.project;

    $scope.camera = {
      start: 0,
      total: 10,
      list: []
    };
    $scope.params = {
      filter_key: 'name',
      filter_value: ''
    };
    var query = function(params) {

      $http.get(api + "projects/" + $scope.project + '/cameras', {
        params: params
      }).success(function(response) {
        for (var i = 0, l = response.list.length; i < l; i++) {
          var bitmap = flagFactory.getBitmap(response.list[i].flags, 8);
          var flags = flagFactory.parseCamera(bitmap);
          response.list[i].ability = flags.ability;
          response.list[i].live = flags.live;
          response.list[i].ptz = flags.ptz;
          if (0 !== response.list[i].ability.length) {
            response.list[i].quality = response.list[i].ability[0].text;
          }
        }
        $scope.camera = response;
        pageFactory.set(response, params);
        $rootScope.cameraCurPageTmp = $scope.page.curr;
        }).error(function(response, status) {
        console.log('error');
      });
    };
    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });
    $scope.query = function() {
      var params = {
        start: 0,
        limit: $scope.page.limit
      };
      if (undefined !== $scope.params.filter_value && '' !== $scope.params.filter_value) {
        params.filter_key = $scope.params.filter_key;
        params.filter_value = $scope.params.filter_value;
      }
      if ($rootScope.cameraCurPageMark > 1){
        params.start = ($rootScope.cameraCurPageMark-1) * params.limit;
        $rootScope.cameraCurPage = 1;
      }

      query(params);
    };

    $scope.enable = function(cam, enabled) {
      var tip = enabled ? '允许直播后可以远程观看直播，是否继续？' : '禁止直播后无法远程观看，同时会停止正在播放的直播，是否继续？';
      if (false === confirm(tip)) {
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
    $scope.select = function(cam, quality) {
      cam.quality = quality;
    };
    $scope.preview = function(cam, format) {
      cam.format = format;
      $scope.cam = cam;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: path + 'views/sessionModalContent.html',
        controller: 'session',
        size: 'lg modal-player',
        resolve: {
          caminfo: function() {
            return $scope.cam;
          }
        }
      });
    };

    $scope.restart = function(camera_id) {
      if (false === confirm('确定重启摄像机？')) {
        return;
      }
      $http.post(api + "projects/" + $scope.project + '/cameras/' + camera_id + '/reboot', {}).success(function(response) {
        $rootScope.$emit('messageShow', { succ: true, text: '重启成功。' });
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '重启失败。' });
      });
    };

    $scope.query();
  }
])

.controller('camera-tab', [
  '$scope', '$rootScope', '$http', 'flagFactory','pageFactory',
  function($scope, $rootScope, $http, flagFactory, pageFactory) {
    $scope.caminfo = {};
    $scope.isOnline = !($rootScope.$stateParams.isOnline === '0');
    $rootScope.cameraCurPageMark = $rootScope.cameraCurPageTmp;
  }
])

.controller('camera-detail', [
  '$scope', '$rootScope', '$http', '$uibModal', 'flagFactory',
  function($scope, $rootScope, $http, $uibModal, flagFactory) {
    $scope.bFirst = true;
    $scope.bLast = true;
    var project = $rootScope.$stateParams.project;
    $scope.camera = $rootScope.$stateParams.camera;
    var url = api + "projects/" + project + '/cameras/' + $scope.camera;

    var live_ability, preview_ability;

    $scope.refresh = function(enabled) {
        $http.get(url, {}).success(function(response) {
          $scope.info = response;
          $scope.info.preview += '?_=' + new Date().getTime();
          var bitmap = flagFactory.getBitmap(response.flags, 8);
          var flags = flagFactory.parseCamera(bitmap);
          $scope.info.ability = flags.ability;
          $scope.info.live_ability = flags.live;
          live_ability = flags.live;
          $scope.info.ptz_ability = flags.ptz;
          if (0 !== response.ability.length) {
            response.quality = response.ability[0].text;
          }

          $scope.info.preview_ability = flags.preview;
          preview_ability = flags.preview;
          $scope.$parent.caminfo = $scope.info;
        }).error(function(response, status) {
          console.log('error');
        });

        $scope.rtmp_publish_url = undefined;
        $http.get(url + '/rtmp_publish_url', {}).success(function(response) {
          $scope.rtmp_publish_url = response.url;
        }).error(function(response, status) {
          console.log('error');
        });
    };

    $scope.enable = function(enabled) {
      var tip = enabled ? '允许直播后可以远程观看直播，是否继续？' : '禁止直播后无法远程观看，同时会停止正在播放的直播，是否继续？';
      if (false === confirm(tip)) {
        return;
      }
      var data = {
        enable: enabled
      };
      var text = enabled ? '禁用' : '启用';
      $http.post(url + '/stream_toggle', data).success(function(response) {
        console.log('success');
        $scope.info.live_ability = enabled;
        $rootScope.$emit('messagePush', { succ: true, text: text + '直播成功。' });
      }).error(function(response, status) {
        $rootScope.$emit('messagePush', { succ: false, text: text + '直播失败。' });
        console.log('error');
      });
    };
    $scope.infoEdit = function() {
      var basicUrl =  url + '/basic_info';
      var data = {
        name: $scope.info.name
      };

      $rootScope.$emit('messageHide');
      $http.put(basicUrl, data).success(function(response) {
        console.log('success');
        $rootScope.$emit('messagePush', { succ: true, text: '修改摄像机信息成功。' });
      }).error(function(response, status) {
          console.log('error');
          $rootScope.$emit('messagePush', { succ: false, text: '修改摄像机信息失败。' });
        });
      //if (live_ability === $scope.info.live_ability) {
      //  return;
      //}
      //$scope.enable($scope.info.live_ability);
    };
    $scope.save = function() {
      var data = {
        flags: $scope.info.flags,
        desc: $scope.info.desc,
        long_desc: $scope.info.long_desc,
        longitude: $scope.info.longitude,
        latitude: $scope.info.latitude,
        altitude: $scope.info.altitude
      };
      $rootScope.$emit('messageHide');
      $http.put(url, data).success(function(response) {
        console.log('success');
        $rootScope.$emit('messagePush', { succ: true, text: '修改摄像机信息成功。' });
      }).error(function(response, status) {
        console.log('error');
        $rootScope.$emit('messagePush', { succ: false, text: '修改摄像机信息失败。' });
      });
      if (live_ability === $scope.info.live_ability) {
        return;
      }
      $scope.enable($scope.info.live_ability);
    };

    $scope.preview = function(cam, format) {
      cam.format = format;
      $scope.cam = cam;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: path + 'views/sessionModalContent.html',
        controller: 'session',
        size: 'lg modal-player',
        resolve: {
          caminfo: function() {
            return $scope.cam;
          }
        }
      });
    };

    $scope.refresh();
  }
])

.controller('camera-alarm', [
    '$scope', '$rootScope', '$http', 'flagFactory',
    function($scope, $rootScope, $http, flagFactory) {

      var project = $rootScope.$stateParams.project;
      $scope.camera = $rootScope.$stateParams.camera;
      var url = api + "projects/" + project + '/cameras/' + $scope.camera + '/alarm/linkage_config';

      $scope.refresh = function() {
        $http.get(url, {}).success(function(response) {
          $scope.info = response;
          if ($scope.info.start !== undefined){
            $scope.info.startHH = parseInt($scope.info.start/(60*60),10);
            $scope.info.startMM = parseInt($scope.info.start%(60*60)/60,10);
          }
          if ($scope.info.end !== undefined){
            $scope.info.endHH = parseInt($scope.info.end/(60*60),10);
            $scope.info.endMM = parseInt($scope.info.end%(60*60)/60,10);
          }
        }).error(function(response, status) {
            console.log('error');
          });
      };

      $scope.save = function() {
        $scope.info.start = parseInt($scope.info.startHH, 10)*60*60;
        $scope.info.start += parseInt($scope.info.startMM, 10)*60;
        $scope.info.end = parseInt($scope.info.endHH, 10)*60*60;
        $scope.info.end += parseInt($scope.info.endMM, 10)*60;
        var data = {
          start: $scope.info.start,
          end: $scope.info.end,
          move_detect_enabled: $scope.info.move_detect_enabled,
          external_alarm_enabled: $scope.info.external_alarm_enabled
        };
        $rootScope.$emit('messageHide');
        $http.put(url, data).success(function(response) {
          console.log('success');
          $rootScope.$emit('messagePush', { succ: true, text: '修改摄像机报警联动配置成功。' });
        }).error(function(response, status) {
            console.log('error');
            $rootScope.$emit('messagePush', { succ: false, text: '修改摄像机报警联动配置失败。' });
          });
      };

      $scope.refresh();
    }
  ])

.controller('camera-detect', [
    '$scope', '$rootScope', '$http', 'flagFactory',
    function($scope, $rootScope, $http, flagFactory) {

      var project = $rootScope.$stateParams.project;
      $scope.camera = $rootScope.$stateParams.camera;
      var url = api + "projects/" + project + '/cameras/' + $scope.camera + '/remote_config/move_detect';

      $scope.refresh = function() {
        $http.get(url, {}).success(function(response) {
          $scope.info = response;
          if ($scope.info.start !== undefined){
            $scope.info.startHH = parseInt($scope.info.start/(60*60),10);
            $scope.info.startMM = parseInt($scope.info.start%(60*60)/60,10);
          }
          if ($scope.info.end !== undefined){
            $scope.info.endHH = parseInt($scope.info.end/(60*60),10);
            $scope.info.endMM = parseInt($scope.info.end%(60*60)/60,10);
          }
        }).error(function(response, status) {
            console.log('error');
          });
      };

      $scope.save = function() {
        $scope.info.start = parseInt($scope.info.startHH, 10)*60*60;
        $scope.info.start += parseInt($scope.info.startMM, 10)*60;
        $scope.info.end = parseInt($scope.info.endHH, 10)*60*60;
        $scope.info.end += parseInt($scope.info.endMM, 10)*60;
        var data = {
          enable: $scope.info.enable,
          start: $scope.info.start,
          end: $scope.info.end,
          sensibility: $scope.info.sensibility,
          delay: $scope.info.delay
        };
        $rootScope.$emit('messageHide');
        $http.put(url, data).success(function(response) {
          console.log('success');
          $rootScope.$emit('messagePush', { succ: true, text: '修改摄像机移动侦测配置成功。' });
        }).error(function(response, status) {
            console.log('error');
            $rootScope.$emit('messagePush', { succ: false, text: '修改摄像机移动侦测配置失败。' });
          });
      };

      $scope.refresh();
    }
  ])


.controller('camera-record-plan', [
  '$scope', '$rootScope', '$http', 'flagFactory',
  function($scope, $rootScope, $http, flagFactory) {
    $scope.boolFalse = false;
    $scope.boolTrue = true;
    var project = $rootScope.$stateParams.project;
    $scope.camera = $rootScope.$stateParams.camera;
    var url = api + "projects/" + project + '/cameras/' + $scope.camera + '/record/configure';

    $scope.refresh = function() {
        $http.get(url, {}).success(function(response) {
          $scope.info = response;
        }).error(function(response, status) {
          console.log('error');
        });
    };

    $http.get(api + "projects/" + project + '/record/schedules', {
      params: {
        include_global: true
      }
    }).success(function(response) {
      $scope.schedules = response;
    }).error(function(response, status) {
      $rootScope.$emit('messageShow', { succ: false, text: '获取录像计划失败' });
      console.log('error');
    });

    $scope.save = function() {
      var schedule_id = $scope.info.schedule_id;
      if ('number' !== typeof schedule_id) {
        schedule_id = -1;
      }
      var data = {
        stream_quality: $scope.info.stream_quality.toLowerCase(),
        schedule_id: schedule_id,
        record_lifecycle: $scope.info.record_lifecycle,
        move_detect_enable: $scope.info.move_detect_enable
      };
      $rootScope.$emit('messageHide');
      $http.post(url, data).success(function(response) {
        console.log('success');
        $rootScope.$emit('messagePush', { succ: true, text: '修改摄像机录像计划成功。' });
      }).error(function(response, status) {
        console.log('error');
        $rootScope.$emit('messagePush', { succ: false, text: '修改摄像机录像计划失败。' });
      });
    };

      $scope.startRec = function(duration) {
          if (duration === 0){
              $scope.modShow = true;
              $scope.recTime = "";
          }
          else if (duration === -1){
              if ($scope.recTime <= 0){
                  $rootScope.$emit('messageShow', { succ: false, text: '录像时间请填写大于0的正整数' });
                  return;
              }
              $scope.startRec($scope.recTime);
          }
          else{
              $scope.modShow = false;
              $http.post(api + 'projects/' + project + '/cameras/' + $scope.camera + '/record/manual', {
                  duration: duration
              }).success(function(response) {
                      $scope.refresh();
                  }).error(function(response, status) {
                      $rootScope.$emit('messageShow', { succ: false, text: '启动手动录像失败' });
                      console.log('error');
                  });
          }
      };

      $scope.stopRec = function() {
          $http.delete(api + 'projects/' + project + '/cameras/' + $scope.camera + '/record/manual', {}).success(function(response) {
              $rootScope.$emit('messageShow', { succ: true, text: '停止手动录像成功' });
              $scope.refresh();
          }).error(function(response, status) {
                  $rootScope.$emit('messageShow', { succ: false, text: '停止手动录像失败' });
                  console.log('error');
              });
      };
      $scope.refresh();
  }
])

.controller('camera-replay', [
  '$scope', '$rootScope', '$http', '$uibModal', 'playerFactory', 'dateFactory',
  function($scope, $rootScope, $http, $uibModal, playerFactory, dateFactory) {
    $scope.camname = $rootScope.$stateParams.camname;
    $rootScope.cameraCurPageMark = $rootScope.cameraCurPageTmp;
    var url = api + "projects/" + $rootScope.$stateParams.project + '/cameras/' + $rootScope.$stateParams.camera + '/record/search';

    (function() {
      $scope.options = {
        minDate: new Date('2016-01-01'),
        showWeeks: false
      };
      $scope.hidden = true;
      $scope.dt = new Date();
      $scope.opened = false;

      //$scope.timepicker = {
      //  start: '00:00:00',
      //  end: '23:59:59'
      //};
      //$scope.timepicker.startdt = dateFactory.str2time($scope.timepicker.start, true);
      //$scope.timepicker.enddt = dateFactory.str2time($scope.timepicker.end, false);

      $scope.timepicker = {
        startHH: 0,
        startMM: 0,
        startSS: 0,
        endHH: 23,
        endMM: 59,
        endSS: 59
      };
      $scope.seglength = '60';
    })();

    $scope.query = function() {
      $scope.timepicker.start = dateFactory.hmsFormat($scope.timepicker.startHH, $scope.timepicker.startMM, $scope.timepicker.startSS);
      $scope.timepicker.end = dateFactory.hmsFormat($scope.timepicker.endHH, $scope.timepicker.endMM, $scope.timepicker.endSS);
      $scope.timepicker.startdt = dateFactory.str2time($scope.timepicker.start, true);
      $scope.timepicker.enddt = dateFactory.str2time($scope.timepicker.end, false);
      $http.get(url, {
        params: {
          start: dateFactory.getms($scope.dt, $scope.timepicker.startdt),
          end: dateFactory.getms($scope.dt, $scope.timepicker.enddt),
          seglength: parseInt($scope.seglength, 10)
        }
      }).success(function(response) {
        $scope.record = response;
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '查询录像失败。' });
        console.log('error');
      });
    };

    $scope.play = function(it) {
      it.camname = $scope.camname;
      $scope.selected = it;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: path + 'views/replayModalContent.html',
        controller: 'replayModalController',
        size: 'lg modal-player',
        resolve: {
          record: function() {
            return $scope.selected;
          }
        }
      });
    };
    $scope.backup = function(it) {
      it.camname = $scope.camname;
      it.camera_id = $rootScope.$stateParams.camera;
      $scope.selected = it;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: 'backupModalContent.html',
        controller: 'backupModalController',
        size: 'lg',
        resolve: {
          record: function() {
            return $scope.selected;
          }
        }
      });
    };

    $scope.merge = function() {
      var u = api + "projects/" + $rootScope.$stateParams.project + '/cameras/' + $rootScope.$stateParams.camera +
        '/record/playlist.ts?start=' + $scope.record.segments[0].start +
        '&end=' + $scope.record.segments[$scope.record.segments.length - 1].start +
        '&jwt=' + $rootScope.$jwt.get().jwt;
      window.open(u);
    };

    $scope.merge_backup = function(){
      var info = angular.copy($scope.record.segments[0]);
      info.end = $scope.record.segments[$scope.record.segments.length - 1].end;
      $scope.backup(info);
    };

    $scope.query();

    // $scope.download = function(it){
    //   $http.get(it.ts, {
    //     timeout: 86400000
    //   }).success(function(response){
    //     var blob = new Blob([response], {
    //       type: 'application/application/x-mpegurl, video/mp2t'
    //     });
    //     saveAs(blob, 'aaa.mp4');
    //   });
    //   var file = new File(["Hello, world!"], "hello world.txt", {type: "text/plain;charset=utf-8"});

    // };
  }
])

.controller('replayModalController', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'playerFactory', 'record',
  function($scope, $rootScope, $http, $uibModalInstance, playerFactory, record) {
    var playerId = 'replayPlayer';
    $scope.ok = function() {
      playerFactory.stop(playerId);
      $uibModalInstance.close();
    };

    $scope.record = record;
    setTimeout(function() {
      playerFactory.load(record.hls, playerId);
    }, 0);
  }
])


    .controller('showReplayModalController', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'playerFactory', 'record',
        function($scope, $rootScope, $http, $uibModalInstance, playerFactory, record) {
            var playerId = 'replayPlayer';
            $scope.ok = function() {
                playerFactory.stop(playerId);
                $uibModalInstance.close();
            };

            $scope.record = record;
            setTimeout(function() {
                playerFactory.load(record.record_url, playerId);
            }, 0);
        }
    ])

.controller('backupModalController', [
  '$scope', '$rootScope', '$http', '$uibModalInstance', 'dateFactory', 'record',
  function($scope, $rootScope, $http, $uibModalInstance, dateFactory, record) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/record/events';
    $scope.info = {
      start: record.start,
      end: record.end,
      camera_id: record.camera_id,
      desc: record.camname + dateFactory.format(record.start, '_MMdd'),
      long_desc: ''
    };
    $scope.camname = record.camname;
    $scope.ok = function() {
      $uibModalInstance.close();
    };

    $scope.save = function() {
      $http.post(url, $scope.info).success(function() {
        $scope.ok();
        $rootScope.$emit('messageShow', { succ: true, text: '录像备份成功。' });
      }).error(function() {
        /* Act on the event */
        $rootScope.$emit('messageShow', { succ: false, text: '录像备份失败。' });
        console.log('error');
      });;
    };
  }
])

.controller('schedule', [
  '$scope', '$rootScope', '$http', '$uibModal', 'flagFactory',
  function($scope, $rootScope, $http, $uibModal, flagFactory, pageFactory) {
    $scope.project = $rootScope.$stateParams.project;
    var url = api + "projects/" + $scope.project + '/record/schedules';

    $scope.query = function() {
      $http.get(url, {
        params: {
          include_global: true
        }
      }).success(function(response) {
        $scope.schedules = response;
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '获取录像计划失败' });
        console.log('error');
      });
    };

    $scope.remove = function(item, index) {
      if (false === confirm('确认删除录像计划模板 "' + item.name + '" 吗？')) {
        return;
      }
      $http.delete(url + '/' + item.id, {}).success(function(response) {
        $scope.schedules.list.splice(index, 1);
        $rootScope.$emit('messageShow', { succ: true, text: '删除录像模板成功。' });
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '删除录像模板失败。' });
        console.log('error');
      });
    };

    $scope.query();
  }
])

.controller('add-schedule', [
  '$scope', '$rootScope', '$http', 'dateFactory',
  function($scope, $rootScope, $http, dateFactory) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/record/schedules';

    $scope.boolFalse = false;
    $scope.boolTrue = true;
    $scope.datepicker = [];
    $scope.timepicker = [];
    $scope.info = {
      name: '',
      desc: '',
      long_desc: '',
      entries: []
    };
    $scope.typechange = function(type) {
      $scope.type = type;
      $scope.info.entries = [];
      var l = 'weekday' === type ? 7 : 31;
      for (var i = 1; i <= l; i++) {
        $scope.addItem(i);
      }
    };

    $scope.weekdays = [
      { name: '请选择星期', value: 0 },
      { name: '星期一', value: 1 },
      { name: '星期二', value: 2 },
      { name: '星期三', value: 3 },
      { name: '星期四', value: 4 },
      { name: '星期五', value: 5 },
      { name: '星期六', value: 6 },
      { name: '星期天', value: 7 }
    ];
    $scope.monthdays = [
      { name: '请选择日期', value: 0 }
    ];
    for (var i = 1; i < 32; i++) {
      $scope.monthdays.push({ name: i + '日', value: i });
    }

    $scope.addItem = function(idx) {
      idx = idx || 1;
      var it = {
        date: '',
        weekday: idx,
        monthday: idx,
        start: '00:00:00',
        end: '23:59:59',
        prerecord: false
      };
      if ('weekday' !== $scope.type) {
        it.weekday = 0;
      } else {
        it.monthday = 0;
      }

      $scope.info.entries.push(it);
      $scope.datepicker.push(false);

      var t = {
        startHH: 0,
        startMM: 0,
        startSS: 0,
        endHH: 23,
        endMM: 59,
        endSS: 59
      };
      $scope.timepicker.push(t);
    };

    $scope.removeItem = function(it, index) {
      // if (false ==== confirm('确定要删除此条记录？')){
      //   return;
      // }
      $scope.info.entries.splice(index, 1);
      $scope.datepicker.splice(index, 1);
      $scope.timepicker.splice(index, 1);
    };

    $scope.timeGather = function() {
      for (var i = 0, l = $scope.info.entries.length; i < l; i++) {
        $scope.info.entries[i].start = dateFactory.hmsFormat($scope.timepicker[i].startHH, $scope.timepicker[i].startMM, $scope.timepicker[i].startSS);
        $scope.info.entries[i].end = dateFactory.hmsFormat($scope.timepicker[i].endHH, $scope.timepicker[i].endMM, $scope.timepicker[i].endSS);
      }
    };

    $scope.add = function() {
      $scope.timeGather();
      $http.post(url, $scope.info).success(function(response) {
        $rootScope.$emit('messageShow', { succ: true, text: '添加成功。' });
        $scope.typechange('weekday');
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '添加失败。' });
        console.log('error');
      });
    };
    $scope.typechange('weekday');
  }
])

.controller('schedule-detail', [
  '$scope', '$rootScope', '$http', 'dateFactory',
  function($scope, $rootScope, $http, dateFactory) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/record/schedules/' + $rootScope.$stateParams.schedule;

    $scope.boolFalse = false;
    $scope.boolTrue = true;
    $scope.datepicker = [];
    $scope.timepicker = [];
    $scope.info = {
      name: '',
      desc: '',
      long_desc: '',
      entries: []
    };
    $scope.type = 'weekday';
    $scope.typechange = function(type) {
      $scope.type = type;
      $scope.info.entries = [];
      var l = 'weekday' === type ? 7 : 31;
      for (var i = 1; i <= l; i++) {
        $scope.addItem(i);
      }
    };

    $scope.weekdays = [
      { name: '请选择星期', value: 0 },
      { name: '星期一', value: 1 },
      { name: '星期二', value: 2 },
      { name: '星期三', value: 3 },
      { name: '星期四', value: 4 },
      { name: '星期五', value: 5 },
      { name: '星期六', value: 6 },
      { name: '星期天', value: 7 }
    ];
    $scope.monthdays = [
      { name: '请选择日期', value: 0 }
    ];
    for (var i = 1; i < 32; i++) {
      $scope.monthdays.push({ name: i + '日', value: i });
    }

    $scope.addItem = function(idx) {
      idx = idx || 1;
      var it = {
        date: '',
        weekday: idx,
        monthday: idx,
        start: '00:00:00',
        end: '23:59:59',
        prerecord: false
      };
      if ('weekday' !== $scope.type) {
        it.weekday = 0;
      } else {
        it.monthday = 0;
      }

      $scope.info.entries.push(it);
      $scope.datepicker.push(false);

      var t = {
        startHH: 0,
        startMM: 0,
        startSS: 0,
        endHH: 23,
        endMM: 59,
        endSS: 59
      };
      $scope.timepicker.push(t);
    };

    $scope.removeItem = function(it, index) {
      // if (false ==== confirm('确定要删除此条记录？')){
      //   return;
      // }
      $scope.info.entries.splice(index, 1);
      $scope.datepicker.splice(index, 1);
      $scope.timepicker.splice(index, 1);
    };

    $scope.timeGather = function() {
      for (var i = 0, l = $scope.info.entries.length; i < l; i++) {
        $scope.info.entries[i].start = dateFactory.hmsFormat($scope.timepicker[i].startHH, $scope.timepicker[i].startMM, $scope.timepicker[i].startSS);
        $scope.info.entries[i].end = dateFactory.hmsFormat($scope.timepicker[i].endHH, $scope.timepicker[i].endMM, $scope.timepicker[i].endSS);
      }
    };

    $scope.modify = function() {
      $scope.timeGather();
      delete $scope.info.project_name;
      delete $scope.info.id;
      $http.put(url, $scope.info).success(function(response) {
        $rootScope.$emit('messageShow', { succ: true, text: '修改录像计划模板成功。' });
        // $scope.typechange('weekday');
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '修改录像计划模板失败。' });
        console.log('error');
      });
    };

    (function() {
      $http.get(url, {}).success(function(response) {
        $scope.info = response;
        if (response.entries.length !== 0 &&
          (0 === response.entries[0].weekday || null === response.entries[0].weekday)) {
          $scope.type = 'monthday';
        }
        for (var i = 0, l = $scope.info.entries.length; i < l; i++) {
          if ($scope.info.entries[i].monthday === null || $scope.info.entries[i].monthday === "") $scope.info.entries[i].monthday = 0;
          if ($scope.info.entries[i].weekday === null || $scope.info.entries[i].weekday === "") $scope.info.entries[i].weekday = 0;
          if ($scope.info.entries[i].date === null) $scope.info.entries[i].date = "";
          var start = $scope.info.entries[i].start.split(':');
          var end = $scope.info.entries[i].end.split(':');

          var t = {
            startHH: parseInt(start[0],10),
            startMM: parseInt(start[1],10),
            startSS: parseInt(start[2],10),
            endHH: parseInt(end[0],10),
            endMM: parseInt(end[1],10),
            endSS: parseInt(end[2],10)
          };
          $scope.timepicker.push(t);
        }
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '获取信息失败。' });
        console.log('error');
      });
    })();
  }
])

.controller('log', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
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
  $scope.params = { limit: 100 };
  $scope.bFirst = true;
  $scope.bLast = true;
  $scope.open = function(opts) {
    opts.opened = true;
  };

  $scope.sum = {
    total: 0,
    per_quality: {
      ld: 0,
      sd: 0,
      hd: 0,
      fhd: 0
    }
  };

  $scope.query = function(opts) {
    $scope.params.start_from = format($scope.start.dt) + 'T00:00:00';
    $scope.params.end_to = format($scope.end.dt) + 'T23:59:59';
    $scope.params.reverse = false;
    $scope.params.last_end_time = undefined;
    $scope.params.last_session_id = undefined;
    $scope.bFirst = true;

    get($scope.params, function() {
      $scope.bLast = true;
    });
    $scope.bLast = false;

    sum({ start_from: $scope.params.start_from, end_to: $scope.params.end_to });
  };

  $scope.next = function() {
    $scope.params.reverse = false;
    $scope.params.last_end_time = $scope.list[$scope.list.length - 1].end;;
    $scope.params.last_session_id = $scope.list[$scope.list.length - 1].uuid;
    get($scope.params, function() {
      $scope.bLast = true;
    });
    $scope.bFirst = false;
  };
  $scope.prev = function() {
    $scope.params.reverse = true;
    $scope.params.last_end_time = $scope.list[0].end;;
    $scope.params.last_session_id = $scope.list[0].uuid;
    get($scope.params, function() {
      $scope.bFirst = true;
    });
    $scope.bLast = false;
  };

  var getFileName = function() {
    var s = format($scope.start.dt);
    var e = format($scope.end.dt);
    if (e === s) {
      return s + '.csv';
    } else {
      return s + '_' + e + '.csv';
    }
  };
  $scope.download = function() {
    $http({
      url: api + "projects/" + $scope.project + '/session_logs_csv',
      method: "GET",
      params: {
        start_from: $scope.params.start_from,
        end_to: $scope.params.end_to
      }
    }).success(function(response) {
      var blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      saveAs(blob, getFileName());
    }).error(function(response, status) {
      $rootScope.$emit('messageShow', { succ: false, text: '导出直播记录失败。' });
      console.log('error');
    });
  };

  var sum = function(params) {
    $http({
      url: api + "projects/" + $scope.project + '/session_logs_sum',
      method: "GET",
      params: params
    }).success(function(response) {
      $scope.sum.total = response.total;
      angular.extend($scope.sum.per_quality, response.per_quality);
    }).error(function(response, status) {
      console.log('error');
    });
  };

  var get = function(params, fn) {
    $http({
      url: api + "projects/" + $scope.project + '/session_logs',
      method: "GET",
      params: params
    }).success(function(response) {
      $scope.list = response.list;
      if (response.list.length !== params.limit) {
        fn();
      }
    }).error(function(response, status) {
      console.log('error');
    });
  };
  var format = function(dt) {
    return [dt.getFullYear(), dt.getMonth() + 1, dt.getDate()].join('-');
  };
}])

.controller('default', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
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
}])

.controller('user-info', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;

  $http.get(api + "users/" + $scope.username, {}).success(function(response) {
    $scope.info = response;
  }).error(function(response, status) {
    console.log('error');
  });
}])

.controller('user-passwd', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.old_password = '';
  $scope.new_password = '';
  $scope.repeat_password = '';
  $scope.salt = "opensight.cn";

  $scope.save = function() {
    if ($scope.new_password !== $scope.repeat_password) {
      alert('确认密码输入不一致');
      return false;
    }
    var data = {
      old_password: sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2($scope.old_password, $scope.salt, 10000)),
      new_password: sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2($scope.new_password, $scope.salt, 10000))
    }
    $http.put(api + "users/" + $scope.username + '/password', data).success(function(response) {
      console.log('success');
    }).error(function(response, status) {
      console.log('error');
    });
  };
}])

.controller('key', [
  '$scope', '$rootScope', '$http', '$uibModal', 'pageFactory',
  function($scope, $rootScope, $http, $uibModal, pageFactory) {
    $scope.username = $rootScope.$jwt.get().aud;
    $scope.url = api + "users/" + $scope.username + '/access_keys';

    var query = function(params) {
      $http.get($scope.url, {
        params: params
      }).success(function(response) {
        $scope.keys = response;
        pageFactory.set(response, params);
      }).error(function(response, status) {
        console.log('error');
      });
    };

    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });

    $scope.query = function() {
      query({
        start: 0,
        limit: $scope.page.limit
      });
    };

    $scope.open = function(key_id) {
      $scope.key_id = key_id;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: 'secretModalContent.html',
        controller: 'secret',
        resolve: {
          access_key: function() {
            return $scope.key_id;
          }
        }
      });
    };
    $scope.del = function(key_id) {
      if (false === confirm('是否删除密匙？')) {
        return;
      }
      $http.delete(api + 'access_keys/' + key_id, {}).success(function(response) {
        $scope.query();
        alert('删除成功。');
      }).error(function(response, status) {
        alert('删除失败。');
        console.log('error');
      });
    };

    $scope.query();
  }
])

.controller('add-key', ['$scope', '$rootScope', '$http', '$uibModal', function($scope, $rootScope, $http, $uibModal) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.url = api + "users/" + $scope.username + '/access_keys';
  $scope.boolFalse = false;
  $scope.boolTrue = true;
  $scope.number0 = 0;
  $scope.number1 = 1;

  var init = function() {
    $scope.info = {
      key_type: 0,
      enabled: true,
      desc: ''
    };
  };
  init();

  $scope.add = function() {
    $http.post($scope.url, $scope.info).success(function(response) {
      alert('添加成功。');
      init();
    }).error(function(response, status) {
      alert('添加失败。');
      console.log('error');
    });
  };
}])

.controller('key-detail', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
  $scope.key = $rootScope.$stateParams.key;
  $scope.boolFalse = false;
  $scope.boolTrue = true;
  var url = api + 'access_keys/' + $scope.key;

  $http.get(url, {}).success(function(response) {
    $scope.info = response;
  }).error(function(response, status) {
    console.log('error');
  });

  $scope.save = function() {
    var data = {
      enabled: $scope.info.enabled,
      desc: $scope.info.desc
    };
    $http.put(url, data).success(function(response) {
      console.log('success');
    }).error(function(response, status) {
      console.log('error');
    });
  };
}])

.controller('secret', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'access_key', function($scope, $rootScope, $http, $uibModalInstance, access_key) {
  $scope.username = $rootScope.$jwt.get().aud;
  $scope.url = api + 'access_keys/' + access_key + '/secret';

  $http.get($scope.url, {}).success(function(response) {
    $scope.secret = response.secret;
  }).error(function(response, status) {
    console.log('error');
  });
  $scope.ok = function() {
    $uibModalInstance.close();
  };
}])

.controller('session', [
  '$scope', '$rootScope', '$http', '$uibModalInstance', '$timeout', '$interval', 'playerFactory', 'caminfo',
  function($scope, $rootScope, $http, $uibModalInstance, $timeout, $interval, playerFactory, caminfo) {
    $scope.cam = caminfo;
    $scope.sec = 10;

    var user = $rootScope.$jwt.get().aud;
    var project = $rootScope.$stateParams.project;
    var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/sessions';
    var tiptimer = undefined;
    var alivetimer = undefined;
    var playerId = 'videoPlayer';

    var create = function() {
      $http.post(url, {
        format: caminfo.format.toLowerCase(),
        quality: caminfo.quality.toLowerCase(),
        create: true,
        user: user
      }).success(function(response) {
        $scope.id = response.session_id;
        playerFactory.load(response.url, playerId);
          setTimeout(function() {
            var lbufTime = playerFactory.getBuf(playerId);
            if (lbufTime !== undefined) $scope.bufTime = lbufTime;
          }, 1500);
        keepalive(response);
        if (tiptimer) {
          $interval.cancel(tiptimer);
          tiptimer = undefined;
        }
      }).error(function(response, status) {
        console.log('error');
      });
    };

    var keepalive = function(info) {
      if (undefined !== alivetimer) {
        $interval.cancel(alivetimer);
        alivetimer = undefined;
      }
      var duration = 2 * 60 * 60 * 1000;
      var intrvl = 20 * 1000;
      var count = duration / intrvl;
      alivetimer = $interval(function() {
        if (0 === count) {
          $scope.ok();
          return;
        } else {
          count--;
        }
        $http.post(url + '/' + info.session_id, {}).success(function(response) {

        }).error(function(response, status) {
          console.log('error');
        });
      }, intrvl);
    };
    var stop = function() {
      playerFactory.stop(playerId);
      if (undefined !== alivetimer) {
        $interval.cancel(alivetimer);
        alivetimer = undefined;
      }
      if (undefined === $scope.id) {
        return;
      }
      $http.delete(url + '/' + $scope.id, {});
    };
    var updateTip = function() {
      tiptimer = $interval(function() {
        if (1 === $scope.sec && undefined !== tiptimer) {
          $interval.cancel(tiptimer);
          tiptimer = undefined;
          return;
        }
        $scope.sec--;
        // $scope.$apply();
      }, 1000);
    };
    create();
    updateTip();

    $scope.speed = 50;
    $scope.options = {
      from: 0,
      to: 100,
      step: 10,
      dimension: ''
    };
    var moving = false;
    $scope.ptzmouseout = function() {
      if (false === moving) {
        return
      }
      $scope.ptzStop('stop');
    };
    $scope.ptzStart = function(op) {
      if (true === moving) {
        return;
      }
      ptz(op);
      moving = true;
    };
    $scope.ptzStop = function() {
      // alert(op);
      ptz('stop');
      moving = false;
    };
    var ptz = function(op) {
      var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/ptz/op';
      $http.post(url, { op: op, value: parseInt($scope.speed, 10) }).success(function(response) {}).error(function(response, status) {
        console.log('error');
      });
    };

    (function() {
      var list = {};
      $scope.selected = 'preset';

      var init = function(list) {
        $scope.ptzlist = list;
        if (list instanceof Array && 0 !== $scope.ptzlist.length) {
          $scope.token = $scope.ptzlist[0].token;
        } else {
          $scope.token = undefined;
        }
      };
      $scope.ptzchange = function() {
        $scope.token = undefined;
        if ('patrol' === $scope.selected) {
          return;
        } else if (undefined !== list[$scope.selected]) {
          init(list[$scope.selected]);
          return;
        }
        var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/ptz/' + $scope.selected;
        $http.get(url, {}).success(function(response) {
          list[$scope.selected] = response;
          init(response);
        }).error(function(response, status) {
          console.log('error');
        });
      };

      $scope.cruise = function(op) {
        var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/ptz/' + $scope.selected;
        if ('patrol' === $scope.selected) {
          url += '/op';
        } else {
          url += '/' + $scope.token + '/op';
        }
        var params = { op: op };
        if ('preset' === $scope.selected) {
          params = {};
        }
        $http.post(url, params).success(function(response) {}).error(function(response, status) {
          console.log('error');
        });
      };
      if (true === $scope.cam.ptz) {
        $scope.ptzchange();
      }
    })();

    (function() {
      var url = api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/record/manual';
      $scope.recording = caminfo.record_state === 2;
      $scope.startRecord = function(duration) {
        $http.post(api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/record/manual', {
          duration: duration
        }).success(function(response) {
          $scope.recording = true;
        }).error(function(response, status) {
          $rootScope.$emit('messageShow', { succ: false, text: '启动手动录像失败' });
          console.log('error');
        });
      };

      $scope.stopRecord = function() {
        $http.delete(api + 'projects/' + project + '/cameras/' + caminfo.uuid + '/record/manual', {}).success(function(response) {
          $rootScope.$emit('messageShow', { succ: true, text: '停止手动录像成功' });
          getRecordStatus();
        }).error(function(response, status) {
          $rootScope.$emit('messageShow', { succ: false, text: '停止手动录像失败' });
          console.log('error');
        });
        $scope.recording = false;
      };

      var getRecordStatus = function() {
        $http.get(api + 'projects/' + project + '/cameras/' + caminfo.uuid, {}).success(function(response) {
          $scope.recording = response.record_state === 2;
        }).error(function(response, status) {
          console.log('error');
        });
      };

      var timer = $interval(function() {
        getRecordStatus();
      }, 10000);

      $scope.stopGetRecordStatus = function() {
        $interval.cancel(timer);
      };
    })();

    $scope.ok = function() {
      stop();
      $scope.stopGetRecordStatus();
      $uibModalInstance.close();
    };

    //buf scope
    var bufTime = $.cookie('buffTime');
    if (bufTime === null || bufTime === undefined || bufTime === ''){
      $scope.bufTime = 4;
    }else $scope.bufTime = bufTime;

    $scope.setBuf = function(duration) {
      $.cookie('buffTime', duration, {
        expires: 10000
      });
      playerFactory.setBuf(playerId, duration);
      setTimeout(function() {
        var mbufTime = playerFactory.getBuf(playerId);
        if (mbufTime !== undefined) $scope.bufTime = mbufTime;
      }, 1000);

    };
  }
])

.controller('user', [
  '$scope', '$rootScope', '$http', 'pageFactory',
  function($scope, $rootScope, $http, pageFactory) {
    var pro = $rootScope.$stateParams.project;

    $scope.users = {
      start: 0,
      total: 10,
      list: []
    };
    $scope.params = {
      filter_key: 'username',
      filter_value: ''
    };

    var query = function(params) {
      $http.get(api + "projects/" + pro + '/users', {
        params: params
      }).success(function(response) {
        $scope.users = response;
        pageFactory.set(response, params);
      }).error(function(response, status) {
        console.log('error');
      });
    };
    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });
    $scope.query = function() {
      var params = {
        start: 0,
        limit: $scope.page.limit
      };
      if (undefined !== $scope.params.filter_value && '' !== $scope.params.filter_value) {
        params.filter_key = $scope.params.filter_key;
        params.filter_value = $scope.params.filter_value;
      }
      query(params);
    };

    $scope.query();
  }
])

.controller('session-status', [
  '$scope', '$rootScope', '$http', 'pageFactory',
  function($scope, $rootScope, $http, pageFactory) {
    var pro = $rootScope.$stateParams.project;

    $scope.sessions = {
      start: 0,
      total: 10,
      list: []
    };
    var query = function(params) {
      $http.get(api + "projects/" + pro + '/sessions', {
        params: params
      }).success(function(response) {
        $scope.sessions = response;
        pageFactory.set(response, params);
      }).error(function(response, status) {
        console.log('error');
      });
    };
    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });
    $scope.query = function() {
      var params = {
        start: 0,
        limit: $scope.page.limit
      };
      query(params);
    };
    $scope.query();
  }
])

.controller('bill', [
  '$scope', '$rootScope', '$http', 'dateFactory', 'pageFactory',
  function($scope, $rootScope, $http, dateFactory, pageFactory) {
    var pro = $rootScope.$stateParams.project;

    $scope.start = {
      dt: new Date(),
      opened: false
    };
    $scope.end = {
      dt: new Date(),
      opened: false
    };
    $scope.open = function(opts) {
      opts.opened = true;
    };
    $scope.bills = {
      start: 0,
      total: 10,
      list: []
    };

    var query = function(params) {
      $http.get(api + "projects/" + pro + '/bills', {
        params: params
      }).success(function(response) {
        $scope.bills = response;
        pageFactory.set(response, params);
      }).error(function(response, status) {
        console.log('error');
      });
    };
    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });

    $scope.query = function() {
      var params = {
        start_from: dateFactory.getStart($scope.start.dt),
        end_to: dateFactory.getEnd($scope.end.dt),
        start: 0,
        limit: $scope.page.limit
      };
      query(params);
    };

    (function() {
      $http.get(api + "projects/" + pro + '/account', {}).success(function(response) {
        $scope.account = response;
      }).error(function(response, status) {
        console.log('error');
      });
    })();

    $scope.query();
  }
])

.controller('bill-detail', [
  '$scope', '$rootScope', '$http',
  function($scope, $rootScope, $http) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/bills/' + $rootScope.$stateParams.bill;

    $scope.boolFalse = false;
    $scope.boolTrue = true;

    (function() {
      $http.get(url, {}).success(function(response) {
        $scope.info = response;
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '获取账单信息失败。' });
        console.log('error');
      });
    })();
  }
])

.controller('record-event', [
  '$scope', '$rootScope', '$http', '$uibModal', 'pageFactory',
  function($scope, $rootScope, $http, $uibModal, pageFactory) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/record/events';

    $scope.events = {
      start: 0,
      total: 10,
      list: []
    };
    var query = function(params) {
      $http.get(url, {
        params: params
      }).success(function(response) {
        $scope.events = response;
        pageFactory.set(response, params);
      }).error(function(response, status) {
        pageFactory.set($scope.events, params);
        $rootScope.$emit('messageShow', { succ: false, text: '获取备份录像列表失败。' });
        console.log('error');
      });
    };
    $scope.page = pageFactory.init({
      query: query,
      jumperror: function() {
        alert('页码输入不正确。');
      }
    });
    $scope.query = function() {
      var params = {
        start: 0,
        limit: $scope.page.limit
      };
      query(params);
    };

    $scope.play = function(it) {
      $scope.selected = angular.copy(it);
      $scope.selected.camname = it.camera_name;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: path + 'views/replayModalContent.html',
        controller: 'replayModalController',
        size: 'lg modal-player',
        resolve: {
          record: function() {
            return $scope.selected;
          }
        }
      });
    };

    $scope.remove = function(item, index) {
      if (false === confirm('确认删除备份录像 "' + item.desc + '" 吗？')) {
        return;
      }
      $http.delete(url + '/' + item.event_id, {}).success(function(response) {
        $scope.events.list.splice(index, 1);
        $rootScope.$emit('messageShow', { succ: true, text: '删除备份录像成功。' });
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '删除备份录像失败。' });
        console.log('error');
      });
    };

    $scope.query();
  }
])

.controller('record-event-detail', [
  '$scope', '$rootScope', '$http', '$uibModal',
  function($scope, $rootScope, $http, $uibModal) {
    var url = api + "projects/" + $rootScope.$stateParams.project + '/record/events/' + $rootScope.$stateParams.event;

    $http.get(url, {}).success(function(response) {
      $scope.info = response;
    }).error(function(response, status) {
      $rootScope.$emit('messageShow', { succ: false, text: '获取备份录像信息失败。' });
      console.log('error');
    });

    $scope.save = function() {
      var data = {
        desc: $scope.info.desc,
        long_desc: $scope.info.long_desc
      };
      $http.put(url, data).success(function(response) {
        $rootScope.$emit('messageShow', { succ: true, text: '修改备份录像信息成功。' });
        console.log('success');
      }).error(function(response, status) {
        $rootScope.$emit('messageShow', { succ: false, text: '修改备份录像信息失败。' });
        console.log('error');
      });
    };

    $scope.play = function(info) {
      $scope.selected = angular.copy(info);
      $scope.selected.camname = info.camera_name;
      var modalInstance = $uibModal.open({
        backdrop: 'static', 
        keyboard: false,
        templateUrl: path + 'views/replayModalContent.html',
        controller: 'replayModalController',
        size: 'lg modal-player',
        resolve: {
          record: function() {
            return $scope.selected;
          }
        }
      });
    };
  }
])


.controller('live', [
    '$scope', '$rootScope', '$http', '$uibModal', 'flagFactory', 'pageFactory',
        function($scope, $rootScope, $http, $uibModal, flagFactory, pageFactory) {
            $scope.project = $rootScope.$stateParams.project;

            $scope.live = {
                start: 0,
                total: 10,
                list: []
            };

            $scope.params = {
                filter_key: 'name',
                filter_value: ''
            };

            var query = function(params) {
                $http.get(api + "projects/" + $scope.project + '/live_shows', {
                    params: params
                }).success(function(response) {
                        $scope.live = response;
                        pageFactory.set(response, params);
                    }).error(function(response, status) {
                        console.log('error');
                    });
            };

            $scope.page = pageFactory.init({
                query: query,
                jumperror: function() {
                    alert('页码输入不正确。');
                }
            });

            $scope.query = function() {
                var params = {
                    start: 0,
                    limit: $scope.page.limit
                };
                if (undefined !== $scope.params.filter_value && '' !== $scope.params.filter_value) {
                    params.filter_key = $scope.params.filter_key;
                    params.filter_value = $scope.params.filter_value;
                }
                query(params);
            };

            $scope.remove = function(item, index) {
                if (false === confirm('确认移除活动直播 "' + item.name + '" 吗？')) {
                    return;
                }
                $http.delete(api + "projects/" + $scope.project + '/live_shows' + '/' + item.uuid , {}).success(function(response) {
                    $scope.live.list.splice(index, 1);
                    $rootScope.$emit('messageShow', { succ: true, text: '删除活动直播成功。' });
                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '删除活动直播失败。' });
                        console.log('error');
                    });
            };
            $scope.query();
        }
    ])

    .controller('add-live', [
        '$scope', '$rootScope', '$http', 'dateFactory',
        function($scope, $rootScope, $http, dateFactory) {
            var url = api + "projects/" + $rootScope.$stateParams.project + '/live_shows';
            var curl = api + "projects/" + $rootScope.$stateParams.project + '/cameras';
//            $scope.flags = true;

            $scope.info = {
                name: '',
                desc: '',
                long_desc: '',
                camera_id: '',
                flags: 1,
                web_url: '',
                wechat_url: '',
                cover_url: '',
                comment: ''
            };

            $scope.add = function() {
//                if ($scope.flags === true)  $scope.info.flags = 1;else $scope.info.flags = 0;
                $http.post(url, $scope.info).success(function(response) {
                    $rootScope.$emit('messageShow', { succ: true, text: '新建成功。' });
                    $rootScope.$state.go('project.live');
                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '新建失败。' });
                        console.log('error');
                    });
            };

            $scope.enable = function(enabled) {
                if (enabled === true) enabled = 1; else enabled = 0;
                $scope.info.flags = enabled;
            };

            (function() {
                $http.get(curl, {}).success(function(response) {
                    $scope.cameras = response.list;

                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '获取相机信息失败。' });
                        console.log('error');
                    });
            })();
        }
    ])

    .controller('live-detail', [
        '$scope', '$rootScope', '$http', 'dateFactory', 'flagFactory', '$uibModal',
        function($scope, $rootScope, $http, dateFactory, flagFactory, $uibModal) {
            var url = api + "projects/" + $rootScope.$stateParams.project + '/live_shows/'+ $rootScope.$stateParams.showid;


            $scope.modify = function() {
                $scope.subinfo = {
                    name: $scope.info.name,
                    desc: $scope.info.desc,
                    long_desc: $scope.info.long_desc,
                    flags: $scope.info.flags,
                    web_url: $scope.info.web_url,
                    wechat_url: $scope.info.wechat_url,
                    record_url: $scope.info.record_url,
                    cover_url: $scope.info.cover_url,
                    comment: $scope.info.comment
                };
                if ($scope.subinfo.name === $scope.old.name) delete $scope.subinfo.name;
                if ($scope.subinfo.desc === $scope.old.desc) delete $scope.subinfo.desc;
                if ($scope.subinfo.long_desc === $scope.old.long_desc) delete $scope.subinfo.long_desc;
                if ($scope.subinfo.flags === $scope.old.flags) delete $scope.subinfo.flags;
                if ($scope.subinfo.web_url === $scope.old.web_url) delete $scope.subinfo.web_url;
                if ($scope.subinfo.wechat_url === $scope.old.wechat_url) delete $scope.subinfo.wechat_url;
                if ($scope.subinfo.record_url === $scope.old.record_url) delete $scope.subinfo.record_url;
                if ($scope.subinfo.cover_url === $scope.old.cover_url) delete $scope.subinfo.cover_url;
                if ($scope.subinfo.comment === $scope.old.comment) delete $scope.subinfo.comment;
//                if ($scope.subinfo === null) return;
                $http.put(url, $scope.subinfo).success(function(response) {
                    $rootScope.$emit('messageShow', { succ: true, text: '设置成功。' });

                    // $scope.typechange('weekday');
                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '设置失败。' });
                        console.log('error');
                    });
            };

            $scope.op = function(operation, mes) {
                var tip = "确认要 " + mes + " 活动直播吗？";
                if (false === confirm(tip)) {
                    return false;
                }
                $scope.act = {
                  op: operation
                };
                $http.post(url, $scope.act).success(function(response) {
                    $rootScope.$emit('messageShow', { succ: true, text: '操作成功。' });
                    $scope.getLiveDetail();
                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '操作失败。' });
                        console.log('error');
                    });
            };

            $scope.enable = function(enabled) {
                if (enabled === true) enabled = 1; else enabled = 0;
                $scope.info.flags = enabled;
            };

            $scope.refresh = function() {
                $scope.getLiveDetail();
            };



            $scope.preview = function(cam, format) {
                    $scope.cam =  $scope.cInfo;
                    $scope.cam.format = format;
                    var modalInstance = $uibModal.open({
                        backdrop: 'static',
                        keyboard: false,
                        templateUrl: path + 'views/sessionModalContent.html',
                        controller: 'session',
                        size: 'lg modal-player',
                        resolve: {
                            caminfo: function() {
                                return $scope.cam;
                            }
                        }
                    });

            };


            $scope.recview = function(it) {
                $scope.selected = it;
                var modalInstance = $uibModal.open({
                    backdrop: 'static',
                    keyboard: false,
                    templateUrl: path + 'views/showReplayModalContent.html',
                    controller: 'showReplayModalController',
                    size: 'lg modal-player',
                    resolve: {
                        record: function() {
                            return $scope.selected;
                        }
                    }
                });
            };

            $scope.getCameraInfo = function(cid) {
                var myurl = api + "projects/" + $rootScope.$stateParams.project + '/cameras/'+ cid;
                var live_ability, preview_ability;

                $http.get(myurl, {}).success(function(response) {
                    $scope.cInfo = response;
                    $scope.cInfo.preview += '?_=' + new Date().getTime();
                    var bitmap = flagFactory.getBitmap(response.flags, 8);
                    var flags = flagFactory.parseCamera(bitmap);
                    $scope.cInfo.ability = flags.ability;
                    $scope.cInfo.live_ability = flags.live;
                    live_ability = flags.live;
                    $scope.cInfo.ptz_ability = flags.ptz;
                    if (0 !== response.ability.length) {
                        response.quality = response.ability[0].text;
                    }
                    $scope.cInfo.preview_ability = flags.preview;
                }).error(function(response, status) {
                        console.log('error');
                    });
            };

            $scope.getLiveDetail = function() {
                $http.get(url, {}).success(function(response) {
                    $scope.info = response;
                    $scope.old = angular.copy(response);

                    if ($scope.info.camera_uuid !== ""){
                        $scope.getCameraInfo($scope.info.camera_uuid);
                    }
                }).error(function(response, status) {
                        $rootScope.$emit('messageShow', { succ: false, text: '获取活动信息失败。' });
                        console.log('error');
                    });
            };
            $scope.getLiveDetail();
        }
    ]);

