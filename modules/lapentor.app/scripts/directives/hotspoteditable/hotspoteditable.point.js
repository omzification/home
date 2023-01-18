angular.module('lapentor.app')
    .directive('hotspotEditablePoint', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditablePointCtrl'
        };
    });
