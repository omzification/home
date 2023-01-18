/**
 * Theme: gify
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyImage', function($uibModal) {
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
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: function($scope, $uibModalInstance) {
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }
                        });
                    }

                }
            }
        };
    });
