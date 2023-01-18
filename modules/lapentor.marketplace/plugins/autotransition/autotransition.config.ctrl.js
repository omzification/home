angular.module('lapentor.marketplace.plugins')
    .controller('pluginAutotransitionConfigCtrl', function($scope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config;

        ///////
        vm.updateConfig = function() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    });
