angular.module('lapentor.marketplace.plugins')
    .directive('pluginGallery', function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(!config.theme_type){
                    config.theme_type = 'clipped';          
                }
                generateDirective(config.theme_type);

                /////////////

                // Generate installed plugin directive
                function generateDirective(type) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    });
