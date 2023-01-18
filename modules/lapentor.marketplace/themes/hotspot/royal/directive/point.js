/**
 * Theme: bubble
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalPoint', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/point.html',
            controllerAs: 'vm',
            controller: function(LptHelper, $scope, $rootScope, $state, $timeout) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                vm.onclick = onclick;

                vm.onmouseover = onmouseover;
                vm.onmouseout = onmouseout;
                vm.isActive = false;

                ///////////////

                function onmouseover() {
                    $timeout(function() {
                        vm.isActive = true;
                    }, 800);
                }

                function onmouseout() {
                    vm.isActive = false;
                }

                var targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                // $scope.lptsphereinstance.addHotspotEventCallback('c-'+vm.hotspot.name, 'onclick', onclick);
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);
                ///////////////

                // Goto target scene
                function onclick() {
                    if (vm.hotspot.target_scene_id) {
                        if (vm.hotspot.target_view) {
                            targetScene.target_view = vm.hotspot.target_view;
                        }
                        $rootScope.$emit('evt.livesphere.changescene', targetScene);
                    }
                }
            }
        };
    });
