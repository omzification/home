// Theme: Royal
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('scenelistElegantzConfigCtrl', scenelistElegantzConfigCtrl);

function scenelistElegantzConfigCtrl($scope, $rootScope, project, item, $uibModalInstance, LptHelper) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;
    vm.config.is_minimize = vm.config.is_minimize || 0;
    vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;
    vm.config.position = vm.config.position || 'top';

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}