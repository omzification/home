angular.module('lapentor.marketplace.plugins')
    .controller('pluginNextsceneConfigCtrl', function($scope, $timeout, $rootScope, item) {
        var vm = this;
        vm.config = angular.isDefined(item.config) ? item.config : {};
        vm.config.theme = angular.isDefined(vm.config.theme) ? vm.config.theme : 'royal';

        vm.updateConfig = updateConfig;

        vm.themePreviews = {
            'royal': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/royal.gif',
            'ontheline': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/ontheline.gif',
            'circle': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/circle.gif',
            'doubleflip':'',
            'fillpath':'',
            'roundslide':'',
            'slide':'',
            'split':'',
        };

        function updateConfig() {
            vm.isUpdating = true;
           
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    });
