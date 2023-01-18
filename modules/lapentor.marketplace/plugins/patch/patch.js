angular.module('lapentor.marketplace.plugins')
    .directive('pluginPatch', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $rootScope, LptHelper) {

                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                var statusAddNadir = false;
                vm.config.distorted = vm.config.distorted || 'yes';

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    krpano.set('hotspot[logo].visible', false);
                    if (vm.config && vm.config.scenes) {
                        // Apply Nadir if this scene is selected on Config page
                        try {
                            if ((vm.config.scenes[$scope.scene._id] && vm.config.scenes[$scope.scene._id] == true)) {
                                if(statusAddNadir == false){
                                    statusAddNadir = true;
                                    addNadir();
                                }else{
                                    krpano.set('hotspot[logo].visible', true);
                                }

                            }
                        } catch (e) {
                            console.error(e);
                        }
                        try {
                            if (vm.config.scenes.indexOf($scope.scene._id) != -1) {
                                if(statusAddNadir == false){
                                    statusAddNadir = true;
                                    addNadir();
                                }else{
                                    krpano.set('hotspot[logo].visible', true);
                                }
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });


                function addNadir() {
                    var image = vm.config.icon ? vm.config.icon : '';
                    image += '?' + new Date().getTime();
                    krpano.set('hotspot[logo].style', 'image');
                    krpano.set('hotspot[logo].url', image);
                    krpano.set('hotspot[logo].ath', 0);
                    krpano.set('hotspot[logo].atv', 90);
                    krpano.set('hotspot[logo].visible', true);
                    krpano.set('hotspot[logo].ishtml',false);
                    krpano.set('hotspot[logo].distorted', vm.config.distorted == 'yes'?true:false);
                    krpano.set('hotspot[logo].scale', vm.config.scale ? vm.config.scale : 0.85);
                    krpano.set('hotspot[logo].rotate', 0.0);
                    krpano.set('hotspot[logo].rotatewithview', false);
                    krpano.set('hotspot[logo].enabled', false);
                    krpano.set('hotspot[logo].link', false);
                    if(vm.config.link){
                        krpano.set('hotspot[logo].link', true);
                        if(!krpano.get('webvr.isenabled')) {
                            krpano.set('hotspot[logo].enabled', true);
                        }
                        krpano.set('hotspot[logo].onclick', 'js(window.open("'+vm.config.link+'"))');
                    }

                    krpano.set('hotspot[logo].rotate', 0.0);
                    krpano.call('addhotspot(logo)');
                }
            }
        }
    });
