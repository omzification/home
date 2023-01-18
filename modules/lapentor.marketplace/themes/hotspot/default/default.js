/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefault', function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                generateChildDirective(scope.project.theme_hotspot.slug);
                addOnHoverTextstyle(scope.hotspot);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                // Showtext onhover
                function addOnHoverTextstyle(hotspot) {
                    scope.lptsphereinstance.set('textstyle', {
                        "name": "default_tooltip_style",
                        "font": "Arial",
                        "fontsize": "13",
                        "bold": "true",
                        "roundedge": "4",
                        "background": "false",
                        "border": "false",
                        "textcolor": "0xFFFFFF",
                        "textalign": "center",
                        "vcenter": "true",
                        "edge": "bottom",
                        "xoffset": "0",
                        "yoffset": "0",
                        "padding": "10",
                        "textshadow": "1.0",
                        "textshadowrange": "10.0",
                        "textshadowangle": "0",
                        "textshadowcolor": "0x000000",
                        "textshadowalpha": "1.0",
                    });
                    scope.lptsphereinstance.addHotspotEventCallback(hotspot.name, 'onhover', 'showtext(' + hotspot.title + ', "default_tooltip_style")');
                }
            },
            controllerAs: 'vm',
            controller: function($scope) {
                var vm = this;
                // Declare config
                vm.config = $scope.project.theme_hotspot.config;
                $scope.config = vm.config;
            }
        };
    });
