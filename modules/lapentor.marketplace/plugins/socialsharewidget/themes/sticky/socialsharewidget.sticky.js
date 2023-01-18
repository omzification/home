angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidgetSticky', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/socialsharewidget/themes/sticky/sswsticky.html',
            controllerAs: 'vm',
            controller: function($scope, $filter, LptHelper) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.project = $scope.project;
                vm.config = vm.pluginInterface.config;
                vm.shareUrl = LptHelper.inIframe ? document.referrer : $filter('shareUrl')(vm.project.slug);
                vm.pluginInterface.initDefaultConfig(vm.config, {
                    position: 'right'
                });
            }
        };
    });
