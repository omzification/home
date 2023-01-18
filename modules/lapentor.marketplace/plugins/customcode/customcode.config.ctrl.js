angular.module('lapentor.marketplace.plugins')
    .controller('pluginCustomcodeConfigCtrl', pluginCustomcodeConfigCtrl);

function pluginCustomcodeConfigCtrl($scope, project, item) {
    var vm = this;
    vm.project = project;
    vm.config = item.config || {};

    vm.updateConfig = updateConfig;

    //////

    function updateConfig() {
        vm.isUpdating = true;
        var _config = {
            custom_html: vm.config['custom_html'],
            custom_css: vm.config['custom_css']
        };
        $scope.updateConfig(item, _config, function() {
            vm.isUpdating = false;
        });
    }
}
