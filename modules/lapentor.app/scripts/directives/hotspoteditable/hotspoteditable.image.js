angular.module('lapentor.app')
    .directive('hotspotEditableImage', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableImageCtrl'
        };
    });
