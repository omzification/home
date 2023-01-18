angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupCircle', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/circle/circle.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $sce) {
                var vm = this;
                vm.showModal = false;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.popupWidth = window.innerWidth > window.innerHeight ? window.innerHeight * 0.9 : window.innerWidth * 0.9;

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