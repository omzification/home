/**
 * Theme: bubble
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalArticle', function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, LptHelper) {
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
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/article.html',
                        scope: $scope,
                        controller: function($scope, $uibModalInstance) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }
                    });
                }
            }
        };
    });
