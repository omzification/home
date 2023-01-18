// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistCrystal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/crystal/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $window, $timeout) {
                var vm = this,
                    parentVm = $scope.$parent;

                vm.initScrollbar = initScrollbar;
                vm.project = $scope.project;
                vm.config = vm.project.theme_scenelist.config;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;
                vm.config.position = vm.config.position || 'bottom';
                vm.isOpenGroupList = false;
                vm.showAll = false;
                vm.allScenes = {};
                angular.forEach(vm.groups, function(g) {
                    angular.extend(vm.allScenes, vm.allScenes, g.scenes);
                })
                initScrollbar();

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                try {
                    vm.currentGroup = vm.groups[0];
                } catch (e) {
                    console.error(e);
                }

                vm.changeScene = changeScene;
                vm.scrollLeft = scrollLeft;
                vm.scrollRight = scrollRight;

                vm.posX = 0;

                /////////
                
                function scrollLeft() {
                    vm.posX -= 100;
                    jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar('scrollTo', vm.posX + 'px')
                }

                function scrollRight() {
                    vm.posX += 100;
                    jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar('scrollTo', vm.posX + 'px')
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function initScrollbar() {
                    $timeout(function() {
                        jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar({
                            axis: 'x',
                            advanced: { autoExpandHorizontalScroll: 'x' }
                        });
                    }, 500);
                }

                $rootScope.$on('evt.onsphereclick', function() {
                    if ($('#scenelist-crystal').hasClass('off')) {
                        vm.isOpenGroupList = false;
                        $('#scenelist-crystal').removeClass('off');
                    } else {
                        vm.isOpenGroupList = false;
                        $('#scenelist-crystal').addClass('off');
                    }
                });
                vm.toggleGroupList = function() {
                    vm.isOpenGroupList = !vm.isOpenGroupList;
                }
            }
        };
    });