angular.module('lapentor.app')
    .directive('hotspotEditableUrl', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableUrlCtrl'
        };
    });
