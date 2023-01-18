// Theme: slash
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('controlbarSlashConfigCtrl', controlbarSlashConfigCtrl);

function controlbarSlashConfigCtrl($scope, LptHelper, project, item, $uibModalInstance, Marketplace) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_controlbar.config;
    vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : {};
    vm.isUpdating = false;
    vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins, false);

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_controlbar.config, function() {
            vm.isUpdating = false;
        });
    };
}