/**
 * Theme: bubble
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubblePoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function(LptHelper, $scope, $rootScope, $state, $timeout) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                vm.onclick = onclick;

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