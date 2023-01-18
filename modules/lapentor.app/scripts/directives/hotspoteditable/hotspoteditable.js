angular.module('lapentor.app')
    .directive('hotspotEditable', function($compile) {

        return {
            restrict: 'E',
            controllerAs: 'vm',
            scope: {
                project: '=',
                hotspots: '=',
                hotspot: '=',
                scenes: '=',
                scenesphereinstance: '=',
                currentscene: '='
            },
            controller: 'HotspotEditableCtrl',
            link: function(scope, element, attrs) {
                scope.$watch('hotspots.length', function (newVal, oldVal) {
                    generateChildHotspotDirective();
                });
                
                generateChildHotspotDirective();

                // Generate child Theme
                function generateChildHotspotDirective() {
                    // Generate Theme element
                    var directiveName = 'hotspot-editable-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + "></" + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            },
        };
    });
