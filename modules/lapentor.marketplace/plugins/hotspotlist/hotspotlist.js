angular.module('lapentor.marketplace.plugins')
    .directive('pluginHotspotlist', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/hotspotlist/tpl/hotspotlist.html',
            controllerAs: 'vm',
            controller: function($scope, $ocLazyLoad, $timeout, Hotspot, $rootScope) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.currentScene = vm.pluginInterface.scene;
                vm.hotspotTypes = Hotspot.getTypes(vm.pluginInterface.project.theme_hotspot.slug);
                vm.config = vm.pluginInterface.config;
                vm.hotspotCount = 0;

                vm.moveViewerTo = moveViewerTo;

                if (vm.config.show_on_start && vm.config.show_on_start == 'true') {
                    vm.isShow = true;
                }

                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    vm.hotspotCount = 0;
                    vm.currentScene = $scope.scene;

                    // Sort hotspot by title
                    vm.currentScene.hotspots.sort(function(a, b) {
                        var textA = a.title.toUpperCase();
                        var textB = b.title.toUpperCase();
                        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
                    });

                    // Count display hotspot
                    angular.forEach(vm.currentScene.hotspots, function(hp) {
                        hp.show = true;
                        vm.config.scenes = vm.config.scenes || {};
                        vm.config.scenes[vm.currentScene._id] = vm.config.scenes[vm.currentScene._id] || {};
                        if (!angular.isUndefined(vm.config.scenes[vm.currentScene._id][hp._id])) {
                            hp.show = vm.config.scenes[vm.currentScene._id][hp._id];
                        }
                        angular.forEach(vm.hotspotTypes, function(hpType) {
                            if (hpType.name == hp.type) {
                                hp.icon = hpType.icon;
                            }
                        });
                        if (hp.type != 'sound' && hp.show) vm.hotspotCount++;
                    });
                }


                // Activate mcustom scroll bar plugin
                $timeout(function() {
                    jQuery('#PluginHotspotlist>ul').mCustomScrollbar({
                        axis: 'y',
                    });
                });

                //////

                function moveViewerTo(hp) {
                    vm.pluginInterface.lptsphereinstance.moveViewerTo(hp.position.x, hp.position.y);
                }
            }
        }
    });