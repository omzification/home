angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupFullscreen', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/fullscreen/fullscreen.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $sce) {
                var vm = this;
                vm.showModal = false;
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
                    vm.showModal = true;
                    vm.config.content = $sce.trustAsHtml(vm.config.content);
                }
            }
        }
    });
