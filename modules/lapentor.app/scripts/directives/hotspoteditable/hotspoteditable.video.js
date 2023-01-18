angular.module('lapentor.app')
    .directive('hotspotEditableVideo', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableVideoCtrl'
        };
    });
