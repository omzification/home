angular.module('lapentor.app')
    .directive('fluidLoading', function() {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'modules/fluidloading.html',
            link: function (scope, element, attrs) {
                scope.type = attrs.type;
                scope.text = attrs.text;
            }
        };
    });
