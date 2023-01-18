/**
 * Theme: Transparent
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
  .directive('hotspotCrystalArticle', function($uibModal) {
    return {
      restrict: 'E',
      controllerAs: 'vm',
      controller: function($scope, LptHelper, $rootScope) {
        var vm = this;
        vm.hotspot = $scope.hotspot;
        vm.project = $scope.project;
        var modal = null;
        vm.onclick = onclick;

        $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
          LptHelper.checkHotspotPassword(vm.hotspot, onclick);
        });
        ///////////////

        // Goto target scene
        function onclick() {
          var isScenelistOff = $('#scenelist-crystal').hasClass('off');
          if (!$rootScope.isScenelistOff) {
            $rootScope.$broadcast('evt.onsphereclick');
          }
          modal = $uibModal.open({
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/article.html',
            scope: $scope,
            controller: function($scope, $uibModalInstance) {
              vm.cancel = function() {
                if ($rootScope.isScenelistOff) {
                  $rootScope.$broadcast('evt.onsphereclick');
                }
                $uibModalInstance.dismiss('cancel');
              };
            }
          });
        }
      }
    };
  });
