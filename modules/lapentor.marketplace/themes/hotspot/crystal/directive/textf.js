/**
 * Theme: Transparent
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
  .directive('hotspotCrystalTextf', function() {
    return {
      restrict: 'E',
      templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/textf.html',
      controllerAs: 'vm',
      controller: function($scope, $timeout, LptHelper, $rootScope) {
        var vm = this;
        vm.hotspot = $scope.hotspot;
        vm.onclick = togglePopover;
        ///////////////
        $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

        function togglePopover() {
          $timeout(function() {
            jQuery('#textf' + vm.hotspot.name).toggleClass('active');
            jQuery('#icon-textf').toggleClass('active');
          });
        }
      }
    };
  });
