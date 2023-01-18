// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistBreakline', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/breakline/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $rootScope) {
                var vm = this;
                var parentVm = $scope.$parent;

                vm.project = $scope.project;
                var config = vm.project.theme_scenelist.config;
                vm.position = config.position || 'center';

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                vm.themeStyle = {
                    'background-color': config.bg_color
                };

                vm.onMouseover = function(ev) {
                    vm.groupHoverClass = 'group-hover';
                    $timeout(function() {
                        angular.element(ev.currentTarget).css('background-color', config.bg_color);
                    });
                };

                vm.onMouseleave = function() {
                    angular.element('.group-hover').css('background-color', 'initial');
                    vm.groupHoverClass = '';
                };

                vm.toggleScenelistClass = function() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                vm.changeScene = changeScene;

                /////////

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

            }
        };
    });