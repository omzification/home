/**
 * Theme: bubble
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleArticle', function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $state, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/article.html',
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
