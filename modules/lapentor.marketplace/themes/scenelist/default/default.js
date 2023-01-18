// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistDefault', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/default/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $window, $rootScope, $timeout) {
                var vm = this,
                    parentScope = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper;
                vm.isToggle = false;
                vm.project = $scope.project;
                vm.config = scenelistHelper.getConfig();
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                vm.featuredColor = vm.config.active_scene_bg_color; // Featured color

                // functions
                vm.changeScene = changeScene;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.toggleMenu = toggleMenu;

                // apply config
                try {
                    if (vm.config.is_minimize == "1" && !vm.config.sticky_bottom) vm.isToggle = true;
                    vm.themeStyle = {
                        background: vm.config.bg_color,
                        color: vm.config.text_color,
                        left: vm.config.offset_left + 'px',
                        top: vm.config.offset_top + 'px'
                    };

                    if (angular.isDefined(vm.config.offset_left)) {
                        vm.themeStyle.right = 'auto';
                    }

                    $timeout(function() {
                        angular.element('#scenelist-ghost .group-list li.active').css('background', vm.config.active_scene_bg_color);
                    });
                } catch (e) {
                    console.error(e);
                }

                jQuery(window).resize(function() {
                    enableCustomScrollbar();
                });

                /////////

                function toggleMenu() { 
                    vm.isToggle = !vm.isToggle;
                    enableCustomScrollbar();
                }

                function minimizeWhenClickOutside() {
                    if (vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = true;
                    }
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function enableCustomScrollbar() {
                    // Apply scroll for mobile or small screen devices
                    var axis = 'y';
                    if ((isMobile.any || $window.innerWidth <= 640) && vm.config.sticky_bottom) {
                      axis = 'x';
                    }
                    $timeout(function() {
                        jQuery('#scenelist-ghost .group-list').mCustomScrollbar('destroy');

                        $timeout(function() {
                            jQuery('#scenelist-ghost .group-list').mCustomScrollbar({
                                axis: axis,
                                advanced: { autoExpandHorizontalScroll: 'x' }
                            });
                        }, 500);
                    }, 500);
                }
            }
        };
    });
