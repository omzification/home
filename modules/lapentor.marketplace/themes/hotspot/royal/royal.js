/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyal', function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/royal.html',
            link: function(scope, element, attrs, item) {
                //scope.addHotspotToViewer(scope.hotspot, false, true);

                // Generate child directive
                generateChildDirective(scope.project.theme_hotspot.slug);

                scope.hotspot.height = scope.hotspot.height?scope.hotspot.height:scope.hotspot.width;

                scope.hotspot.margin_top = -((42/2) - 25);
                scope.hotspot.margin_left = -((42/2) - 25);
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

                // Point hotspot: Grab target scene thumb
                if (vm.hotspot.type == 'point') {
                    vm.targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                }

                // Apply config
                try {
                    if (vm.hotspot.icon_custom) {
                        vm.config.hotspot_style = {
                            width: vm.hotspot.width,
                            height: vm.hotspot.width,
                            'background-image': 'url('+vm.hotspot.icon_custom+')'
                        };
                    }

                    vm.config.main_color = {
                        'background-color': vm.config.bg_color
                    };
                    vm.config.text_style = {
                        'color': vm.config.text_color
                    };
                    vm.config.arrow_color = {
                        'border-top-color': vm.config.bg_color
                    };

                } catch (e) {
                    console.error(e);
                }
            }
        };
    });
