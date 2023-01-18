// Theme: default
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('controlbarDefaultConfigCtrl', controlbarDefaultConfigCtrl);

function controlbarDefaultConfigCtrl($scope, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.isUpdating = false;
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
