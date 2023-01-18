/**
 * Theme: bubble
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/textf.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onclick = togglePopover;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

                ///////////////

                function togglePopover() {
                    $timeout(function() {
                        angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                    });
                }
            }
        };
    });