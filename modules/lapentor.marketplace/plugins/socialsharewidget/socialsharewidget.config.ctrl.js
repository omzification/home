// $scope inherited from marketplace.item.config.js
angular.module('lapentor.marketplace.plugins')
    .controller('pluginSocialsharewidgetConfigCtrl', pluginSocialsharewidgetConfigCtrl);

/**
 * Controller for Social share plugin config modal
 * @param  {object} project   [project resolved]
 * @param  {object} item      [it can be theme or plugin]
 */
function pluginSocialsharewidgetConfigCtrl($scope, $rootScope, project, item) {
    var vm = this;
    vm.project = project;
    vm.updateConfig = updateConfig;

    vm.config = item.config ? item.config : {
        theme_id: 'gooey',
    };

    vm.config.theme = vm.config.theme?vm.config.theme:{};
    vm.socialProviders = [{
        title: 'Facebook',
        slug: 'facebook'
    },{
        title: 'Linkedin',
        slug: 'linkedin'
    },{
        title: 'Twitter',
        slug: 'twitter'
    }];

    vm.openCustomIconMediaLib = openCustomIconMediaLib;
    vm.deleteCustomIcon = deleteCustomIcon;

    //////

    function deleteCustomIcon(iconType) {
        delete vm.config['custom_'+iconType+'_icon'];
    }

    /**
     * Open Media Library
     */
    var currentChoosedIconType = '';
    function openCustomIconMediaLib(iconType) {
        currentChoosedIconType = iconType;
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: __chooseCustomIconCallback
        });
    }

    function __chooseCustomIconCallback(file) {
        if (file.mime_type.indexOf('png') != -1 || file.mime_type.indexOf('jpeg') != -1 || file.mime_type.indexOf('svg')) {
            if (file.mime_type.indexOf('image') != -1) { // check file type
                vm.config['custom_'+currentChoosedIconType+'_icon'] = file.path;
            }
        } else {
            Alertify.error('Only support png, jpeg, svg format');
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }
}
