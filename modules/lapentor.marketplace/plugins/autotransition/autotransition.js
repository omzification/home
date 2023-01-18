angular.module('lapentor.marketplace.plugins')
    .directive('pluginAutotransition', function() {
        return {
            restrict: 'E',
            // controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                var scenes = [];

                if($scope.project.groups && $scope.project.groups.length > 0){
                    angular.forEach($scope.project.groups, function(group, key) {

                        if(group.scenes.length > 0){
                            angular.forEach(group.scenes, function(g_scene, key) {
                                angular.forEach($scope.project.scenes, function(scene, key) {
                                    if(g_scene._id == scene._id){
                                        scenes.push(scene);
                                    }
                                });
                            });
                        }
                    });
                }else{
                    scenes = $scope.project.scenes;

                }

                var time;

                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    $timeout.cancel(time);
                    var index = 0;

                    angular.forEach(scenes, function(scene, key) {
                        if($scope.scene._id == scene._id){
                            index = key;
                        }
                    });

                    var newScene = scenes[index+1];

                    if (!newScene) {
                        newScene = scenes[0];
                    }

                    krpano.set('krpano.autorotate', true);
                    if (vm.config.enabled) {
                        if( krpano.get('view.fisheye') != 0 || krpano.get('webvr.isenabled') ){

                            krpano.set('autorotate.enabled', false);
                        }else{
                            krpano.set('autorotate.enabled', true);
                        }
                        krpano.set('autorotate.waittime', vm.config.waittime ? vm.config.waittime : 2);
                        krpano.set('autorotate.speed', vm.config.speed ? vm.config.speed : 1);
                    }else{
                        krpano.set('krpano.autorotate', false);
                    }
                    if (vm.config.changeEnabled) {
                        if (scenes && scenes.length > 1) {
                            angular.element('html,body').on('mousedown mousewheel', function() {
                                $timeout.cancel(time);
                                nextScene(newScene);
                            });
                            nextScene(newScene);
                        }
                    }
                }


                function nextScene(scene) {

                    time = $timeout(function() {
                        if(!krpano.get('webvr.isenabled')){
                            $rootScope.$emit('evt.livesphere.changescene', scene);
                        }else{
                            nextScene(scene);
                        }
                    }, vm.config.changeWaittime ? parseInt(vm.config.changeWaittime + '000') : 10000)
                }
            }
        };
    });
