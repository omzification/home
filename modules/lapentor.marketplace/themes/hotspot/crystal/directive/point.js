/**
 * Theme: Transparent
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystalPoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
            }
        };
    });
