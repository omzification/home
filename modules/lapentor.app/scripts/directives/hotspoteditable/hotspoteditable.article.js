angular.module('lapentor.app')
    .directive('hotspotEditableArticle', function($compile) {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableArticleCtrl'
        };
    });
