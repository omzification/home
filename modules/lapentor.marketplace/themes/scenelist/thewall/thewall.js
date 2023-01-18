// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistThewall', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/thewall/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout) {
                var vm = this,
                    parentVm = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper,
                    config = scenelistHelper.getConfig();

                vm.project = $scope.project;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;
                vm.config = config;
                
                vm.allGroupIsEmpty = true;
                angular.forEach(vm.groups, function (g) {
                    if(g.scenes.length) {
                        vm.allGroupIsEmpty = false;
                        return;
                    }
                });

                // declare functions
                vm.toggleScenelistClass = toggleScenelistClass;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.changeScene = changeScene;

                // Main
                // Watch for change scene, change currentscene object to current scene
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                // Apply theme config
                if (vm.config.is_minimize == 1) {
                    vm.isToggle = false;
                } else {
                    vm.isToggle = true;
                }

                // Scene list Background color
                vm.listStyle = {
                    'background-color': config.bg_color
                };

                /////////

                function toggleScenelistClass() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function minimizeWhenClickOutside() {
                    if(vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = false;
                    }
                }

            }
        };
    });
