/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGify', function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/gify.html',
            link: function(scope, element, attrs) {
                // Point hotspot: Grab target scene thumb
                if (scope.hotspot.type == 'point') {
                    scope.targetScene = LptHelper.getObjectBy('_id', scope.hotspot.target_scene_id, scope.project.scenes);
                }
                
                generateChildDirective(scope.project.theme_hotspot.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'vm',
            controller: function($scope) {
                var vm = this;
                // Declare config
                vm.config = $scope.project.theme_hotspot.config;
                $scope.config = vm.config;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
            }
        };
    });