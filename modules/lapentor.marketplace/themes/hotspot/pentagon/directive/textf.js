/**
 * Theme: gify
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/textf.html',
            controllerAs: 'vm',
            controller: function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onclick = togglePopover;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                }
            }
        };
    });
