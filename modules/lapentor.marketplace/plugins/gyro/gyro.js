angular.module('lapentor.marketplace.plugins')
    .directive('pluginGyro', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $rootScope, Alertify) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    krpano.set('plugin[gyro].keep', true);
                    krpano.set('plugin[gyro].devices', 'html5');
                    krpano.set('plugin[gyro].url', 'bower_components/krpano/plugins/gyro2.js');
                    krpano.set('plugin[gyro].html5_url', 'bower_components/krpano/plugins/gyro2.js');
                    krpano.set('plugin[gyro].enabled', false);
                    krpano.call('addplugin(gyro)');

                    if (isMobile.any) {
                        try {
                            if (vm.config.turnonbydefault == true) {
                                krpano.call('set(plugin[gyro].enabled, true);');
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'gyro-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        if (!isMobile.any) {
                            Alertify.error('Gyroscope only work on mobile/tablet devices');
                        } else {
                            krpano.call('switch(plugin[gyro].enabled);');
                            if (krpano.get('plugin[gyro].enabled') == true) {
                                angular.element('#gyro-toggle').css('opacity', '1');
                            } else {
                                angular.element('#gyro-toggle').css('opacity', '0.5');
                            }
                        }

                    }
                });

            }
        };
    });
