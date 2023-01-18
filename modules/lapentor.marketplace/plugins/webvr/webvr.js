angular.module('lapentor.marketplace.plugins')
    .directive('pluginWebvr', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $rootScope) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {

                    krpano.set('plugin[WebVR].keep', true);
                    krpano.set('plugin[WebVR].devices', 'html5');
                    krpano.set('plugin[WebVR].url', (krpano.get('version')=="1.19-pr16")?"bower_components/krpano/plugins/webvr1.js":"bower_components/krpano/plugins/webvr.js");
                    krpano.set('plugin[WebVR].multireslock.desktop', true);
                    krpano.set('plugin[WebVR].multireslock.mobile.or.tablet', false);
                    krpano.set('plugin[WebVR].mobilevr_support', true);
                    krpano.set('plugin[WebVR].mobilevr_fake_support', true);
                    krpano.set('plugin[WebVR].onavailable', "removelayer(webvr_enterbutton);");
                    krpano.call('addplugin(WebVR)');
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    if (krpano.get('webvr.isenabled')) {
                        krpano.call("for(set(i,0), i LT hotspot.count, inc(i),if( (hotspot[get(i)].lpttype != 'point') AND (hotspot[get(i)].name != 'vr_cursor') AND (hotspot[get(i)].name != 'logo') AND (hotspot[get(i)].name != 'lensflare') ,set(hotspot[get(i)].visible, false);); if( (hotspot[get(i)].lpttype == 'point') AND (hotspot[get(i)].sceneId != krpano.sceneId) ,set(hotspot[get(i)].visible, false););if( (hotspot[get(i)].lpttype == 'point') AND (hotspot[get(i)].sceneId == krpano.sceneId) ,set(hotspot[get(i)].visible, true););if( (hotspot[get(i)].name == 'logo') AND (hotspot[get(i)].link == true),set(hotspot[get(i)].enabled, false););););");
                    }
                });

                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'webvr-';
                $rootScope.$on(eventPrefix + 'start', function(event, eventType) {
                    if (eventType == 'click') {
                        krpano.call('webvr.enterVR();');
                        krpano.set('autorotate.enabled', false);
                    }
                });
            }
        };
    });
