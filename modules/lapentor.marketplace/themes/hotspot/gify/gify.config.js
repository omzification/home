// Parent scope: marketplace.item.config.js
angular.module('lapentor.marketplace.themes')
    .controller('hotspotGifyConfigCtrl', hotspotGifyConfigCtrl);

function hotspotGifyConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
