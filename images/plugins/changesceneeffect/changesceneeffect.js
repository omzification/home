angular.module('lapentor.marketplace.plugins')
    .directive('pluginChangesceneeffect', function() {
        return {
            restrict: 'E',
            controller: function($scope, $rootScope) {
                var vm = $scope.pluginVm;
                try {
                    if (vm.config.effect_type) {
                        if(vm.config.effect_type == 'simple-crossblending'){
                            $rootScope.changeSceneEffect = 'BLEND('+(vm.config.time || '1.0')+', easeInCubic)';
                        }else if(vm.config.effect_type == 'zoom-blend'){
                            $rootScope.changeSceneEffect = 'ZOOMBLEND('+(vm.config.time || '2.0')+', 2.0, easeInOutSine)';
                        }else if(vm.config.effect_type == 'black-out'){
                            $rootScope.changeSceneEffect = 'COLORBLEND('+(vm.config.time || '2.0')+', 0x000000, easeOutSine)';
                        }else if(vm.config.effect_type == 'white-flash'){
                            $rootScope.changeSceneEffect = 'LIGHTBLEND('+(vm.config.time || '1.0')+', 0xFFFFFF, 2.0, linear)';
                        }else if(vm.config.effect_type == 'right-to-left'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 0.0, 0.2, linear)';
                        }else if(vm.config.effect_type == 'top-to-bottom'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 90.0, 0.01, linear)';
                        }else if(vm.config.effect_type == 'diagonal'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 135.0, 0.4, linear)';
                        }else if(vm.config.effect_type == 'circle-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', 0.0, 0.2, 0.0, linear)';
                        }else if(vm.config.effect_type == 'vertica-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '0.7')+', 1.0, 0.1, 0.0, linear)';
                        }else if(vm.config.effect_type == 'horizontal-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', -1.0, 0.3, 0.0, linear)';
                        }else if(vm.config.effect_type == 'elliptic-zoom'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', -0.5, 0.3, 0.8, linear)';
                        }else{
                            $rootScope.changeSceneEffect = vm.config.effect_type;
                        }

                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };
    });
