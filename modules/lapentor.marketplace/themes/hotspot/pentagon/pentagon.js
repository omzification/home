/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
 angular.module('lapentor.marketplace.themes').directive('hotspotPentagon', function($compile, LptHelper) {
    return {
        restrict: 'E',
        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/pentagon/tpl/pentagon.html',
        link: function(scope, element, attrs, item) {
            //scope.addHotspotToViewer(scope.hotspot, false, true);

            // Generate child directive
            generateChildDirective(scope.project.theme_hotspot.slug);

            scope.hotspot.margin_top = -((scope.hotspot.width/2) - 25);
            scope.hotspot.margin_left = -((scope.hotspot.width/2) - 25);
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
            vm.hotspot.imgUrl = 'modules/lapentor.marketplace/themes/hotspot/pentagon/images/'+vm.hotspot.type+'.png'

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
