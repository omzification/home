angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupBootstrap', function() {
        return {
            restrict: 'E',
            //templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $sce, $timeout, $uibModal, $ocLazyLoad) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;

                if (vm.config.start) {
                    openModal();
                }

                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'intropopup-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openModal();
                    }
                });

                function openModal() {
                    $uibModal.open({
                        animation: true,
                        templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.html',
                        controller: ModalInstanceCtrl,
                        controllerAs: 'vmM',
                        resolve: {
                            config: function() {
                                return vm.config;
                            }
                        }
                    });
                }

                function ModalInstanceCtrl($scope, $uibModalInstance, config) {
                    var vmM = this;
                    vmM.config = config;
                    vmM.config.theme_child_style = vmM.config.theme_child_style || 'light';
                    try {
                        vmM.config.content = $sce.trustAsHtml(vmM.config.content);
                    } catch (e) {
                        console.log('INFO:intropopup:content not exist');
                    }
                    vmM.dismiss = $uibModalInstance.dismiss;
                }
            }
        }
    });