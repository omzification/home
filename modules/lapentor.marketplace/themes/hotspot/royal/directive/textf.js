/**
 * Theme: bubble
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/textf.html',
            controllerAs: 'vm',
            controller: function($scope, LptHelper, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onmouseover = onmouseover;
                vm.onmouseout = onmouseout;
                vm.isActive = false;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onmouseover);


                ///////////////

                function onmouseover() {
                    $timeout(function() {
                        vm.isActive = true;
                    }, 800);
                }

                function onmouseout() {
                        vm.isActive = false;
                }
            }
        };
    });
