angular.module('lapentor.app')
    .directive('projectShareModal', function() {

        return {
            restrict: 'E',
            controller: 'ProjectShareModalCtrl'
        };
    });
