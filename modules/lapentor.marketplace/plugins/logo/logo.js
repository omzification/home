angular.module('lapentor.marketplace.plugins')
    .directive('pluginLogo', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/logo/tpl/logo.html',
            controllerAs: 'vm',
            controller: function($scope, $uibModal, $rootScope) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.project = $scope.project;
                vm.config = vm.pluginInterface.config;
                vm.sceneId = $scope.scene._id;
                vm.margin = '';

                if(vm.config.align){

                    if(vm.config.align == 'top-center'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;';
                    }
                    if(vm.config.align == 'top-left'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;left:'+vm.config.margin_left+'px;';
                    }
                    if(vm.config.align == 'top-right'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;right:'+vm.config.margin_right+'px;';
                    }
                    if(vm.config.align == 'bottom-left'){
                        vm.margin = 'bottom:'+vm.config.margin_bottom+'px;left:'+vm.config.margin_left+'px;';
                    }
                    if(vm.config.align == 'bottom-right'){
                        vm.margin = 'bottom:'+vm.config.margin_bottom+'px;right:'+vm.config.margin_right+'px;';
                    }
                }

                angular.forEach(vm.config.logos, function(logo, key) {
                    if (angular.isDefined(logo.link)) {
                        var pattern = /^((http|https):\/\/)/;

                        if (!pattern.test(logo.link)) {
                            logo.link = "http://" + logo.link;
                        }
                    }else {
                        logo.link = "#";
                    }
                    logo.align = angular.isDefined(logo.align)?logo.align : "";
                    logo.margins = "";

                    if(logo.align == 'top-center'){
                        logo.margins = 'top:'+logo.margin_top+'px;';
                    }
                    if(logo.align == 'bottom-center'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;';
                    }
                    if(logo.align == 'top-left'){
                        logo.margins = 'top:'+logo.margin_top+'px;left:'+logo.margin_left+'px;';
                    }
                    if(logo.align == 'top-right'){
                        logo.margins = 'top:'+logo.margin_top+'px;right:'+logo.margin_right+'px;';
                    }
                    if(logo.align == 'bottom-left'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;left:'+logo.margin_left+'px;';
                    }
                    if(logo.align == 'bottom-right'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;right:'+logo.margin_right+'px;';
                    }
                });

                vm.clickLogo = function(logo){
                    if (logo.link == '#') return false;
                    
                    if (!logo.modal){
                        window.open(logo.link,'_blank');
                    }else{
                        if (logo.modal == "iframe"){
                            $uibModal.open({
                                template: '<div class="plugin-modal logo-iframe-popup"><iframe src="' + logo.link + '" style="width:100%;height: 100% "></iframe>' +
                                '<span class="close close-black" ng-click="cancel()"><i class="ilpt-close"></i></span>' +
                                '</div>',
                                size: 'lg',
                                // windowClass : "hotspot-url-iframe-" + scope.project.theme_hotspot.slug,
                                scope: $scope,
                                controller: function($scope, $uibModalInstance) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                }
                            });
                        }
                    }
                }

                $rootScope.$on('evt.livesphere.changescene', function(e, scene) {
                    if (scene) {
                        vm.sceneId = scene._id;
                    }
                });

                // $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.arrayTargetLogos = $.map(vm.config.logos, function (value, index) {
                        return [value];
                    });
                // });
            }
        }
    });
