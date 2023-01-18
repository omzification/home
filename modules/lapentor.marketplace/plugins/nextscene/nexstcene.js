angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextscene', function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config || {},
                    scenes = [];
                config.theme = config.theme || 'royal';
                
                generateDirective(config.theme);

                // Get scenes array
                if (scope.project && scope.project.groups && scope.project.groups.length > 0) {
                    angular.forEach(scope.project.groups, function(group, key) {

                        if (group.scenes.length > 0) {
                            angular.forEach(group.scenes, function(g_scene, key) {
                                angular.forEach(scope.project.scenes, function(scene, key) {
                                    if (g_scene._id == scene._id) {
                                        scenes.push(scene);
                                    }
                                });
                            });
                        }
                    });

                    if (scenes.length == 0) {
                        scenes = scope.project.scenes;
                    }
                } else {
                    scenes = scope.project.scenes;
                }

                scope.pluginVm.config.scenes = scenes;

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
