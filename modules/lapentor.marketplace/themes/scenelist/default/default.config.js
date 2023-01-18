// Theme: default
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('scenelistDefaultConfigCtrl', scenelistDefaultConfigCtrl);

function scenelistDefaultConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.config = vm.project.theme_scenelist.config || {};
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.choosePositionType = choosePositionType;
    try {
        if(vm.config.offset_top) {
            vm.config.position_type = 'custom'; // this make sure old code is running ok
        }else{
            vm.config.position_type = vm.config.position_type || 'fixed'; // Fixed position by default
        }
        vm.config.position = vm.config.position || 'top-right';
        vm.config.is_minimize = vm.config.is_minimize || 0;
        vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;
        vm.config.bg_color = vm.config.bg_color || '#ffffff';
        vm.config.theme_type = vm.config.theme_type || 'fixed';
        vm.config.theme = vm.config.theme || 'light';
    } catch (e) {
        console.error(e);
    }

    // Predefined themes
    vm.screenshotS3Path = 'https://s3.amazonaws.com/lapentor-sphere/screenshots/themes/scenelist/default/';

    vm.isToggle = vm.config.is_minimize = 0 ? false : true;

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

    function choosePositionType(type) {
        vm.config.position_type = type;
        switch (type) {
            case 'fixed':
                delete vm.config.offset_top;
                delete vm.config.offset_left;
                delete vm.config.offset;
                break;
            case 'custom':
                delete vm.config.position;
                break;
        }
    }

    function updateConfig() {
        // Before update, clean up variables
        if(vm.config.theme_type == 'fixed') {
            delete vm.config.bg_color;
            delete vm.config.text_color;
        }else{
            delete vm.config.theme;
        }

        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
