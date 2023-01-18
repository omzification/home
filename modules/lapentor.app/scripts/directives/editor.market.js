angular.module('lapentor.app')
    .directive('editorMarket', function() {

        return {
            restrict: 'E',
            controller: 'EditorMarketCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/market.html'
        };
    });
