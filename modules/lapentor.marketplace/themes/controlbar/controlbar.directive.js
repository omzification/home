angular.module('lapentor.marketplace.themes')
    .directive('controlbar', function($compile, $rootScope, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=',
                project: '=',
                lptsphereinstance: '='
            },
            link: function(scope, element, attrs) {
                scope.onbtnclick = function(btn) {
                        $rootScope.$emit('evt.controlbar.' + btn.plugin_slug + btn.id, 'click');
                    }
                    // Interface method
                scope.initDefaultConfig = initDefaultConfig;

                if (angular.isUndefined(scope.project.theme_controlbar)) return;

                // Force init config as Object
                if (angular.isUndefined(scope.project.theme_controlbar.config)) scope.project.theme_controlbar.config = {};

                // Load style
                // if (angular.isDefined(scope.project.theme_controlbar) && angular.isDefined(scope.project.theme_controlbar.slug)) {
                //     loadThemeStyle(scope.project.theme_controlbar.slug);
                // } else {
                //     loadThemeStyle('default');
                // }

                //  Watch method to detect changes on project config and re-render child Theme
                generateChildDirective(scope.project.theme_controlbar.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeSlug) {
                    // Generate Theme element
                    var generatedTemplate = '<controlbar-' + themeSlug + '></controlbar-' + themeSlug + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                function initDefaultConfig(configModel, defaultConfig) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
            }
        };
    });