// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistTremble', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/tremble/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout, $ocLazyLoad, $window) {
                var vm = this,
                    parentVm = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper,
                    config = scenelistHelper.getConfig();

                vm.config = config;
                vm.project = $scope.project;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                // init config
                vm.config.featured_color = vm.config.featured_color || '#6cccff';
                vm.isScenelistOpen = (vm.config.is_minimize == 0) || false;

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
                vm.toggleScenelist = toggleScenelist;

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

                // Load tremble effect
                $ocLazyLoad.load(['bower_components/scenelist-tremble-lib/charming.min.js',
                    'bower_components/scenelist-tremble-lib/anime.min.js',
                    'bower_components/scenelist-tremble-lib/ama.js']);

                // Active scroll
                $timeout(function () {
                    jQuery('#scenelist-tremble .scroller').mCustomScrollbar({
                        axis: 'y',
                    });
                });
                
                /////////

                function toggleScenelistClass() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                    vm.toggleScenelist('close');
                }

                function minimizeWhenClickOutside() {
                    if(vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = false;
                    }
                }
                function toggleScenelist(state) {
                    if(state) {
                        if(state == 'close') {
                            vm.isScenelistOpen = false;
                        }else{
                            vm.isScenelistOpen = true;
                        }    
                    }else{
                        vm.isScenelistOpen = !vm.isScenelistOpen;
                    }
                }

            }
        };
    });
