angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopup', function($compile, $ocLazyLoad) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(!config.theme_type){
                    config.theme_type = 'bootstrap';          
                }
                generateDirective(config.theme_type);

                if(config.fontfamily){
                    $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+config.fontfamily);
                }

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
