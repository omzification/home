// Theme: default
// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('hotspotCrystalConfigCtrl', hotspotCrystalConfigCtrl);

function hotspotCrystalConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config?vm.project.theme_hotspot.config:{};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    // init config
    try {
        vm.config.show_title = vm.config.show_title ? vm.config.show_title : 'yes';
        vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : 'rgba(255,255,255,0)';
        vm.config.text_color = vm.config.text_color ? vm.config.text_color : '#FFF';
        vm.config.width = 50;
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
