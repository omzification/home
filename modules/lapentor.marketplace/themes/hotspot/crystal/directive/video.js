/**
 * Theme: Transparent
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystalVideo', function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $state, $sce) {
                var vm = this;
                var modal = null;
                vm.hotspot = $scope.hotspot;
                vm.onclick = onclick;
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);


                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;
                    
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/video.html',
                        scope: $scope,
                        controller: function($scope, $uibModalInstance, $filter) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                            if ($filter('parseEmbed')(vm.hotspot.src)) {
                                vm.hotspot.src = $filter('parseEmbed')(vm.hotspot.src);
                                vm.hotspot.src = $sce.trustAsHtml(vm.hotspot.src);
                            }
                        }
                    });
                }
            }
        };
    });
