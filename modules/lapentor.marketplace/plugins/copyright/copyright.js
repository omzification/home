angular.module('lapentor.marketplace.plugins')
    .directive('pluginCopyright', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/copyright/tpl/copyright.html',
            controllerAs: 'vm',
            controller: function($scope,$ocLazyLoad, $timeout, $rootScope, LptHelper) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.config.position = vm.config.position || 'bottom-right';
                if(vm.config.url && vm.config.url.indexOf('http') == -1) {
                    vm.config.url = 'http://' + vm.config.url;
                }
                
                if(vm.config.fontfamily){
                    $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
                }
                vm.style = {
                    'font-family': vm.config.fontfamily || 'sans-serif',
                    'font-size': vm.config.fontsize || 14,
                    'color': vm.config.color || 'white'
                };

                switch(vm.config.position) {
                    case 'top-left':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.left = vm.config.offset_left || 0;
                        break;
                    case 'top-right':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.right = vm.config.offset_right || 0;
                        break;
                    case 'bottom-left':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.left = vm.config.offset_left || 0;
                        break;
                    case 'bottom-right':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.right = vm.config.offset_right || 0;
                        break;
                    case 'bottom-center':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        break;
                    default: // top-center
                        vm.style.top = vm.config.offset_top || 20;
                        break;
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.currentSceneTitle = $scope.scene.title;
                });
            }
        }
    });
