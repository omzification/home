angular.module('lapentor.app')
    .directive('projectSettingModal', function() {

        return {
            restrict: 'E',
            controller: 'ProjectSettingModalCtrl'
        };
    });
