angular.module('lapentor.marketplace.plugins')
    .controller('pluginPatchConfigCtrl', function($scope, $rootScope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);
        vm.applyAll = false; // apply patch for all scene switch

        vm.config = angular.isDefined(thisPlugin.config) ? thisPlugin.config : {};
        vm.config.icon = angular.isDefined(vm.config.icon) ? vm.config.icon : '';
        vm.config.scale = angular.isDefined(vm.config.scale) ? vm.config.scale : 1;
        vm.config.scenes = vm.config.scenes?vm.config.scenes:[];
        vm.config.distorted = vm.config.distorted || 'yes';
        vm.selectValue = {};
        vm.select_all = true;
        // Init checkbox
        angular.forEach(vm.project.scenes, function (scene) {
            vm.selectValue[scene._id] = true;
            if(vm.config.scenes.indexOf(scene._id) == -1) {
                vm.selectValue[scene._id] = false;
                vm.select_all = false;
            }
        });

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.selectValue, function(itm,key){ vm.selectValue[key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.selectValue, function(itm,key){ if(!itm)vm.select_all = false; });

        }

        vm.updateConfig = updateConfig;

        vm.openMediaLib = function() {

            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: false
            });
        }

        function __chooseAssetCallbackIcon(file) {
            if (file.mime_type.indexOf('image') != -1) { // check file type
                vm.config.icon = file.path;
                updateConfig();
            }
        }

        function updateConfig() {
            vm.isUpdating = true;

            angular.forEach(vm.selectValue, function(itm,key){
                var idx = vm.config.scenes.indexOf(key);

                if (idx == -1) {
                    if(itm){
                        vm.config.scenes.push(key);
                    }

                } else {
                    if(!itm) {
                        vm.config.scenes.splice(idx, 1);
                    }
                }
            });
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    });
