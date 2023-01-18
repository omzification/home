angular.module('lapentor.app')
    .directive('hotspotEditableSound', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableSoundCtrl'
        };
    });
