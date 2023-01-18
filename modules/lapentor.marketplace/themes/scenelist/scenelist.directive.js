angular.module('lapentor.marketplace.themes')
    .directive('sceneList', function($compile, $timeout, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=',
                project: '=',
                lptsphereinstance: '='
            },
            link: function(scope, element, attrs) {
                // Interface method
                scope.ScenelistHelper = {
                    initDefaultConfig: initDefaultConfig,
                    getConfig: getConfig,
                    allGroupIsEmpty: true
                };

                angular.forEach(scope.project.groups, function(g) {
                    if (g.scenes.length) {
                        scope.ScenelistHelper.allGroupIsEmpty = false;
                        return;
                    }
                });

                if (angular.isUndefined(scope.project.theme_scenelist)) return;
                // Force init config as Object
                if (angular.isUndefined(scope.project.theme_scenelist.config)) scope.project.theme_scenelist.config = {};

                // Load style
                // if (angular.isDefined(scope.project.theme_scenelist) && angular.isDefined(scope.project.theme_scenelist.slug)) {
                //     loadThemeStyle(scope.project.theme_scenelist.slug);
                // } else {
                //     loadThemeStyle('default');
                // }

                //  Watch method to detect changes on project config and re-render child Theme
                generateChildDirective(scope.project.theme_scenelist.slug);

                /////////////////

                function getConfig() {
                    try {
                        var config = scope.project.theme_scenelist.config ? scope.project.theme_scenelist.config : {};
                    } catch (e) {
                        var config = {};
                    }
                    return config;
                }

                // Generate child Theme
                function generateChildDirective(themeSlug) {
                    // Generate Theme element
                    var generatedTemplate = '<scenelist-' + themeSlug + '></scenelist-' + themeSlug + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                function initDefaultConfig(defaultConfig, configModel) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
            }
        };
    });