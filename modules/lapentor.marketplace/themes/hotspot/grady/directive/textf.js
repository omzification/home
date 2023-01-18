/**
 * Theme: grady
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGradyTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/grady/tpl/textf.html',
            controllerAs: 'vm',
            controller: function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.updatePopoverPosition = updatePopoverPosition;
                vm.togglePopover = togglePopover;

                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);
                $scope.lptsphereinstance.on('onviewchange', updatePopoverPosition, vm.hotspot.name);
                
                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                    updatePopoverPosition();
                }

                function updatePopoverPosition() {
                    LptHelper.stickElementWithHotspot('#textf' + vm.hotspot.name, vm.hotspot.name, $scope.lptsphereinstance, 25, -24);
                }
            }
        };
    });
