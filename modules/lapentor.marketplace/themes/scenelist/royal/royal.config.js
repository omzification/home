// Theme: Royal
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('scenelistRoyalConfigCtrl', scenelistRoyalConfigCtrl);

function scenelistRoyalConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.config = vm.project.theme_scenelist.config;
    vm.isUpdating = false;
    vm.closeModal = $uibModalInstance.dismiss;

    vm.config.color = vm.config.color || '#A1905D';
    vm.config.is_minimize = vm.config.is_minimize || 0;

    // Register functions
    vm.updateConfig = updateConfig;

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