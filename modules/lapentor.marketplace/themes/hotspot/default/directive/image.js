/**
 * Theme: default
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultImage', function($uibModal) {
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

                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/default/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: function($scope, $uibModalInstance) {
                                $scope.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }
                        });
                    }
                }
            }
        };
    });
