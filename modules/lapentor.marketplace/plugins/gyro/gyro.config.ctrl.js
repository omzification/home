angular.module('lapentor.marketplace.plugins')
    .controller('pluginGyroConfigCtrl', function($scope,$rootScope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        vm.config = angular.isDefined(item.config)?item.config:{};
        vm.updateConfig = updateConfig;

        /////
        
        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    });
