// Theme: default
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('controlbarGooeyConfigCtrl', controlbarGooeyConfigCtrl);

function controlbarGooeyConfigCtrl($scope, $timeout, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_controlbar.config;
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    $uibModalInstance.opened.then(function() {
        $timeout(function() {
            $scope.$broadcast('rzSliderForceRender');
        });
    });

    // init config
    try {
        vm.config.angle = vm.config.angle ? vm.config.angle : 180;
        vm.config.distance = vm.config.distance ? vm.config.distance : 160;
        vm.config.position = vm.config.position ? vm.config.position : 'bottom';
    } catch (e) {
        console.error(e);
    }

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
