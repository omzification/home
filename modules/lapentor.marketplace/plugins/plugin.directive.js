/**
 * This directive will be used on live sphere only
 */
angular.module('lapentor.marketplace.plugins')
    .directive('plugin', function($compile, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=', // optional, current scene
                plugin: '=', // plugin
                project: '=', // all project data
                lptsphereinstance: '=' // lptSphere instance to manipulate sphere
            },
            link: function(scope, element, attrs) {
                generateDirective(scope.plugin.slug);

                /////////////

                // Generate installed plugin directive
                function generateDirective(pluginId) {
                    var directiveName = 'plugin-' + pluginId;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'pluginVm',
            controller: function($scope) {
                // All variables, functions below will be inherited by all plugins
                var pluginVm = this;

                /**
                 * Plugin info
                 * @type {object}
                 */
                pluginVm.plugin = $scope.plugin;

                /**
                 * Project data
                 * @type {object}
                 */
                pluginVm.project = $scope.project;

                /**
                 * Plugin config, get from database
                 * @type {object}
                 */
                pluginVm.config = getConfig();

                /**
                 * Current scene info, get from database
                 * @type {object}
                 */
                pluginVm.scene = $scope.scene;

                /**
                 * lptSphere instance
                 * src: lapentor_krpano.js
                 * @type {angular service}
                 */
                pluginVm.lptsphereinstance = $scope.lptsphereinstance;

                /**
                 * Path to plugin folder on disk
                 * @type {string}
                 */
                pluginVm.pluginPath = Config.PLUGIN_PATH + $scope.plugin.slug;

                pluginVm.initDefaultConfig = initDefaultConfig;

                //////////////

                function initDefaultConfig(configModel, defaultConfig) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
                /**
                 * Get plugin config from {project} data object
                 * @return {object}
                 */
                function getConfig() {
                    var config = {};
                    if (angular.isDefined($scope.project.plugins)) {
                        angular.forEach($scope.project.plugins, function(pl) {
                            if ($scope.plugin.slug == pl.slug) {
                                config = pl.config;
                                if (typeof config == 'undefined') config = {};
                            }
                        });
                    }

                    return config;
                }
            }
        };
    });