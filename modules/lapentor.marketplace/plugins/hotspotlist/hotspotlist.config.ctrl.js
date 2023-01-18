angular.module('lapentor.marketplace.plugins')
    .controller('pluginHotspotlistConfigCtrl', function($scope, project, item) {
        var vm = this;
        vm.project = project;

        // init config
        vm.config = item.config || {};
        vm.hotspots = [];
        vm.changeScene = changeScene;
        // functions
        vm.updateConfig = updateConfig;
        if (angular.isUndefined(vm.config.scenes)){
            vm.config.scenes = {};
        }
        vm.config.show_on_start = vm.config.show_on_start || false;
        /////////
        function changeScene(){

            angular.forEach(vm.project.scenes, function(scene, key) {
                if(scene._id == vm.targetScene ){
                    vm.hotspots = scene.hotspots;
                    if (angular.isUndefined(vm.config.scenes[scene._id])){
                        vm.config.scenes[scene._id] = {};
                    }
                    angular.forEach(vm.hotspots, function(hotspot, key) {
                        if (angular.isUndefined(vm.config.scenes[scene._id][hotspot._id]) && hotspot.type !='sound'){
                            vm.config.scenes[scene._id][hotspot._id] = true;
                        }
                    });
                }
            });
            vm.selectHotspot();
        }

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.scenes[vm.targetScene], function(itm,key){ vm.config.scenes[vm.targetScene][key] = toggleStatus;});
        }

        vm.selectHotspot = function() {
            vm.select_all = true;
            angular.forEach(vm.config.scenes[vm.targetScene], function(itm,key){ if(!itm)vm.select_all = false; });

        }
        
        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    });