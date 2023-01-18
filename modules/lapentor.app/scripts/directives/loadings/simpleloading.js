/**
 * List icon
 * http://samherbert.net/svg-loaders/
 */
angular.module('lapentor.app')
    .directive('simpleLoading', function() {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="loading theme-bg-opacity"><img src="bower_components/SVG-Loaders/svg-loaders/{{ icon }}.svg" height="30"></div>',
            link: function (scope, element, attrs) {
                if(attrs.icon) {
                    scope.icon = attrs.icon;
                }else{
                    scope.icon = 'oval';
                }
            }
        };
    });
