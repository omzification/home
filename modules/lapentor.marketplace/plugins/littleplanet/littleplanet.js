angular.module('lapentor.marketplace.plugins')
    .directive('pluginLittleplanet', function() {
        return {
            restrict: 'E',
            // controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout) {
                var vm = $scope.pluginVm,
                    krpano = vm.lptsphereinstance.krpano(),
                    canRun = false, // determine if this scene have little planet effect
                    autorotate = false,
                    isOn = false; // is little planet turn on or off
                    var x = 0;
                    var y = 0;
                    var fov = 90;
                vm.config = vm.config || {};
                if (angular.isUndefined(vm.config.timeout) || isNaN(vm.config.timeout) || vm.config.timeout == null) vm.config.timeout = 2; //default timeout is 2 second
                if (angular.isUndefined(vm.config.scenes)) { vm.config.scenes = {} };
                angular.forEach(vm.config.scenes, function(val, choosedSceneId) {
                    if (choosedSceneId == vm.scene._id && val == true) {
                        canRun = true;
                        return;
                    }
                });

                // Only run little planet effect on choosed scene
                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    try{
                        x = krpano.get('view.vlookat'); y = krpano.get('view.hlookat'); fov = krpano.get('view.fov');
                        if (vm.config.scenes[$scope.scene._id] && vm.config.scenes[$scope.scene._id] == true && !krpano.get('webvr.isenabled')) {
                            // angular.element('scene-list').addClass('hide');
                            makeLittlePlanetEffect();
                            // Reset to normal view after 2 second
                            $timeout(reset, vm.config.timeout * 1000);
                        }
                    }catch(e){

                    }
                }

                // Listen for button click on control bar
                $rootScope.$on('evt.controlbar.' + vm.plugin.slug + 'littleplanet-toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        // Run little planet effect
                        if (isOn) {
                            reset();
                            isOn = false;
                        } else {
                            makeLittlePlanetEffect(true);

                            isOn = true;
                        }
                    }
                });

                function makeLittlePlanetEffect(isTween) {
                    // vm.lptsphereinstance.set('view.stereographic', true);
                    var vlookat = 90, hlookat = 90;
                    if (vm.scene.default_view) {
                        hlookat = vm.scene.default_view.hlookat;
                    }

                    if (isTween) {
                        vm.lptsphereinstance.tween('view.fov', 150);
                        vm.lptsphereinstance.tween('view.fisheye', 1.0);
                        vm.lptsphereinstance.tween('view.vlookat', vlookat);
                        vm.lptsphereinstance.tween('view.hlookat', hlookat);
                    } else {
                        vm.lptsphereinstance.set('view.fov', 150);
                        vm.lptsphereinstance.set('view.fisheye', 1.0);
                        vm.lptsphereinstance.set('view.vlookat', vlookat);
                        vm.lptsphereinstance.set('view.hlookat', hlookat);
                    }

                    if( krpano.get('krpano.arrows') ) {
                        krpano.call('removechevrons()');
                    }

                    canRun = false;
                }

                function reset() {

                    if (vm.scene.default_view) {
                        vm.lptsphereinstance.tween('view.vlookat', x, 2.5, 'easeInOutQuad');
                        vm.lptsphereinstance.tween('view.hlookat', y, 2.5, 'easeInOutQuad');
                    } else {
                        vm.lptsphereinstance.tween('view.vlookat', x, 2.5, 'easeInOutQuad');
                        vm.lptsphereinstance.tween('view.hlookat', y, 2.5, 'easeInOutQuad');
                    }

                    vm.lptsphereinstance.tween('view.fov', fov, 2.5, 'easeInOutQuad');
                    vm.lptsphereinstance.tween('view.fisheye', 0, 2.5, 'easeInOutQuad');


                    $timeout(function() {
                        angular.element('scene-list').removeClass('hide');
                        if( krpano.get('krpano.arrows') ){
                            krpano.call('addchevrons');
                        }
                        if ( krpano.get('krpano.autorotate') ) {
                            krpano.set('autorotate.enabled', true);
                        }
                    }, 3000);

                }
            }
        };
    });
