angular.module('lapentor.app')
    .directive('lptAudio', function($sce) {
        return {
            restrict: 'E',
            scope: {
                hotspotid: '=',
                src: '=',
                volume: '='
            },
            replace: true,
            template: '<audio id="sound{{ hotspotid }}" ng-src="{{ url }}" controls></audio>',
            link: function(scope, element) {
                scope.$watch('src', function(newVal, oldVal) {
                    if (newVal !== undefined) {
                        scope.url = $sce.trustAsResourceUrl(newVal);
                    }else{
                    }
                });
                var audio = angular.element(element)[0];

                scope.$watch('volume', function(newVal, oldVal) {
                    if (newVal !== undefined) {
                        audio.volume = newVal/100;
                    }
                });
            }
        };
    });