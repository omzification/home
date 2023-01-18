angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneDoubleflip', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/doubleflip/tpl.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }
        }
    });
