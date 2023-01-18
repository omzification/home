angular.module('lapentor.marketplace.plugins')
    .controller('pluginLittleplanetConfigCtrl', function($scope, LptHelper, project, item) {
        var vm = this;
        vm.updateConfig = updateConfig;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config || {};
        vm.config.scenes = vm.config.scenes?vm.config.scenes:{};
        vm.select_all = true;

        angular.forEach(vm.project.scenes, function (scene) {
            if(!vm.config.scenes[scene._id]){
                vm.config.scenes[scene._id] = false;
            }
        });
        angular.forEach(vm.config.scenes, function(itm,key){
            if(!itm) {
                vm.select_all = false;
            }
        });

        ///////
        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.scenes, function(itm,key){ vm.config.scenes[key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.config.scenes, function(itm,key){ if(!itm)vm.select_all = false; });

        }

        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    });
