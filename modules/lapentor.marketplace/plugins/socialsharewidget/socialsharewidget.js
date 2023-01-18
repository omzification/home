angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidget', function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(angular.isUndefined(config.theme_id)) {
                    config.theme_id = 'gooey';
                }
                generateDirective(config.theme_id);

                /////////////

                // Generate installed plugin directive
                function generateDirective(themeId) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + themeId;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    });
