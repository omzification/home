angular.module('lapentor.marketplace.plugins')
    .directive("pluginIntropopupBootstrapConfig", function(){
        return {
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.config.html',
            restrict: "E",
            scope: {
               config: '=',
            },
            controller: pluginIntropopupBootstrapConfig,
            controllerAs :'vm'        

        }
    });
function pluginIntropopupBootstrapConfig($scope, $rootScope){
    var vm = this;
    vm.config = $scope.config;
    vm.config.theme_child_style = vm.config.theme_child_style || 'light';
}