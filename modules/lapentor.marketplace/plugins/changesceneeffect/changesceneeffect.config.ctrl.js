angular.module('lapentor.marketplace.plugins')
    .controller('pluginChangesceneeffectConfigCtrl', function($scope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config;
        vm.blend = {
            'Simple crossblending' : 'simple-crossblending',
            'Zoom blend' : 'zoom-blend',
            'Black-out' : 'black-out',
            'White-flash' : 'white-flash',
            'Right-to-left' : 'right-to-left',
            'Top-to-bottom' : 'top-to-bottom',
            'Diagonal' : 'diagonal',
            'Circle open' : 'circle-open',
            'Vertical open' : 'vertica-open',
            'Horizontal open' : 'horizontal-open',
            'Elliptic + zoom' : 'elliptic-zoom'
        }
        ///////
        vm.updateConfig = function() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    });
