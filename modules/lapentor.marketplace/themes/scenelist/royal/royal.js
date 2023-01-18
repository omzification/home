// Theme: royal
angular.module('lapentor.marketplace.themes')
    .directive('scenelistRoyal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/royal/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout, LptHelper) {
                var vm = this,
                    parentScope = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper;
                
                vm.project = $scope.project;
                vm.config = scenelistHelper.getConfig();

                vm.minimizedGroups = [];
                vm.isToggle = false;
                vm.allGroupIsEmpty = scenelistHelper.allGroupIsEmpty;
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                // functions
                vm.changeScene = changeScene; // change scene
                vm.nextScene = nextScene; // go to next scene
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.prevScene = prevScene; // go to prev scene
                vm.toggleGroup = toggleGroup; // Minimized/open a group

                // apply config
                try {
                    if (vm.config.is_minimize == 1) {
                    vm.isToggle = false;
                } else {
                    vm.isToggle = true;
                }
                    vm.config.color = vm.config.color ? vm.config.color : '#A1905D';
                } catch (e) {
                    console.error(e);
                }

                if(vm.config.is_minimize_group == 1) {
                    for (var i = vm.groups.length - 1; i >= 0; i--) {
                        vm.minimizedGroups.push({
                            id: vm.groups[i]._id,
                            toggle: true
                        });
                    }
                } 


                /////////

                function toggleGroup(id) {
                    $timeout(function () {
                        jQuery('#lpt-group-'+id).height(35+32*jQuery('#lpt-group-'+id).find('li').length).toggleClass('minimized');
                    });
                }

                function prevScene() {
                    var prevScene = LptHelper.getPrevScene(vm.currentscene, vm.project);
                    if (prevScene) {
                        changeScene(prevScene);
                    }
                }

                function nextScene() {
                    var nextScene = LptHelper.getNextScene(vm.currentscene, vm.project);
                    if (nextScene) {
                        changeScene(nextScene);
                    }
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function minimizeWhenClickOutside() {
                    if(angular.isUndefined(vm.config.minimize_clickoutside) || vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = true;
                    }
                }
            }
        };
    });
