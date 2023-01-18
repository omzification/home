/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubble', function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/bubble.html',
            link: function(scope, element, attrs) {
                scope.config = scope.project.theme_hotspot.config || {};
                // Point hotspot: Grab target scene thumb
                if (scope.hotspot.type == 'point') {
                    scope.targetScene = LptHelper.getObjectBy('_id', scope.hotspot.target_scene_id, scope.project.scenes);
                }
                // Apply common config
                try {
                    scope.config.arrow_color = {
                        'border-top': '13px solid ' + scope.config.bg_color
                    };

                    scope.hotspot.height = scope.hotspot.height?scope.hotspot.height:scope.hotspot.width;

                    scope.hotspot.margin_top = -((scope.hotspot.height/2) - 25);
                    scope.hotspot.margin_left = -((scope.hotspot.width/2) - 25);
                } catch (e) {
                    console.error(e);
                }

                // Generate child directive
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
                vm.project = $scope.project;
                vm.hotspot = $scope.hotspot;
            }
        };
    });
