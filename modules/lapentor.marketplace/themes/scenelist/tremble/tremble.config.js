// Theme: thewall
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('scenelistTrembleConfigCtrl', scenelistTrembleConfigCtrl);

function scenelistTrembleConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;

    // Set up default config
    vm.config.is_minimize = vm.config.is_minimize || 0;
    vm.config.menu_position = vm.config.menu_position || 'top';
    vm.config.featured_color = vm.config.featured_color || '#6cccff';

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
        // Before update, clean up variables
        if(vm.config.theme_type == 'fixed') {
            delete vm.config.bg_color;
        }else{
            delete vm.config.theme;
        }

        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_scenelist.config, function() {
            vm.isUpdating = false;
        });
    };
}
