// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('hotspotRoyalConfigCtrl', hotspotRoyalConfigCtrl);

function hotspotRoyalConfigCtrl($scope,$state, $rootScope, Alertify, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    // init config
    try {
        vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : '#023a78';
        vm.config.text_color = vm.config.text_color ? vm.config.text_color : '#ffffff';
    } catch (e) {
        console.error(e);
    }

    //////////


    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
