angular.module('lapentor.marketplace.plugins')
    .directive('pluginDetailGooglemap', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + 'googlemap/tpl/detail.html',
            controller: function($scope) {
                var vm = $scope.vm;
            },
        };
    });
