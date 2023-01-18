angular.module('lapentor.app')
    .directive('hotspotEditableTextf', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableTextfCtrl'
        };
    });
