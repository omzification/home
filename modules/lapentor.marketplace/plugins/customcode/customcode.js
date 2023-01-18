angular.module('lapentor.marketplace.plugins')
    .directive('pluginCustomcode', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/plugins/customcode/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $sce) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm || {};
                vm.config = vm.pluginInterface.config;
                vm.project = $scope.project;

                try{
                    vm.config.custom_html = $sce.trustAsHtml(vm.config.custom_html);
                }catch(e) {
                    console.error(e);
                }
            }
        };
    });
