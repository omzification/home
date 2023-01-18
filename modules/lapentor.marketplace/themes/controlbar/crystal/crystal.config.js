// Theme: Transparent
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('controlbarCrystalConfigCtrl', controlbarCrystalConfigCtrl);

function controlbarCrystalConfigCtrl($scope, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_controlbar.config;
    vm.config.position = 'top';

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_controlbar.config, function() {
            vm.isUpdating = false;
        });
    };
}
