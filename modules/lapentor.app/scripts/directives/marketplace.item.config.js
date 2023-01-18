angular.module('lapentor.app')
    .directive('marketplaceItemConfig', function() {

        return {
            restrict: 'E',
            controller: 'MarketplaceItemConfigCtrl',
            controllerAs: 'vm',
            scope: {
            	project: '='
            }
        };
    });
