angular.module('lapentor.marketplace.plugins')
    .directive("pluginIntropopupFullscreenConfig", function(){
        return {
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/fullscreen/fullscreen.config.html',
            restrict: "E",
            scope: {
               config: '=',
            },
            controller: IntropopupFullscreenConfig,
            controllerAs :'vm'        

        }
    });
function pluginIntropopupFullscreenConfig($scope, $rootScope){
    var vm = this;
    vm.config = $scope.config;
}