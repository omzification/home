// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistElegantz', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/elegantz/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $window, $timeout, $ocLazyLoad) {
                var vm = this,
                    parentVm = $scope.$parent;

                vm.isSmall = false;
                vm.initScrollbar = initScrollbar;
                vm.project = $scope.project;
                vm.config = vm.project.theme_scenelist.config;
                vm.config.position = vm.config.position || 'top';
                vm.config.is_minimize = vm.config.is_minimize || 0;
                vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;

                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                initScrollbar();
                if (vm.config.is_minimize == 1) {
                    vm.isSmall = true;
                } else {
                    vm.isSmall = false;
                }

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                try {
                    vm.currentGroup = vm.groups[0];
                } catch (e) {
                    console.error(e);
                }

                vm.changeScene = changeScene;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;

                /////////

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function initScrollbar() {
                    $timeout(function() {
                        jQuery('#scenelist-elegantz-scroll-wrapper .tab-nav').mCustomScrollbar({
                            axis: 'x',
                            advanced: { autoExpandHorizontalScroll: 'x' }
                        });
                    }, 500);
                    if (isMobile.any || $window.innerWidth <= 640) {
                        $timeout(function() {
                            jQuery('#scenelist-elegantz .group-titles').mCustomScrollbar({
                                axis: 'x',
                                advanced: { autoExpandHorizontalScroll: 'x' }
                            });
                        }, 500);
                    }
                }

                function minimizeWhenClickOutside() {
                    if (vm.config.minimize_clickoutside == 1) {
                        vm.isSmall = true;
                    }
                }
            }
        };
    });