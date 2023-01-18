/**
 * Theme: default
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultArticle', function($uibModal) {
        return {
            restrict: 'E',
            controller: function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/default/tpl/article.html',
                        scope: $scope,
                        controller: function($scope, $uibModalInstance) {
                            $scope.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }
                    });
                }
            }
        };
    });
