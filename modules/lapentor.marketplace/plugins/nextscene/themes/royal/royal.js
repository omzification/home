angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneRoyal', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/royal/royal.html',
            controllerAs: 'vm',
            controller: function($scope, $document, $rootScope, $timeout, $uibModal, $ocLazyLoad) {
                var vm = this,
                    scenes = [];
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.goToNextScene = goToNextScene;
                vm.goToPrevScene = goToPrevScene;
                vm.hideNextPreview = hideNextPreview;
                vm.hidePrevPreview = hidePrevPreview;
                vm.nextScene = {};
                vm.prevScene = {};
                vm.showPrevPreview = false;
                vm.showNextPreview = false;

                $scope.pluginVm.lptsphereinstance.on('onclick', outsideClickHandler);
                $document.on('click', outsideClickHandler);

                if ($scope.project && $scope.project.groups && $scope.project.groups.length > 0) {
                    angular.forEach($scope.project.groups, function(group, key) {

                        if (group.scenes.length > 0) {
                            angular.forEach(group.scenes, function(g_scene, key) {
                                angular.forEach($scope.project.scenes, function(scene, key) {
                                    if (g_scene._id == scene._id) {
                                        scenes.push(scene);
                                    }
                                });
                            });
                        }
                    });

                    if (scenes.length == 0) {
                        scenes = $scope.project.scenes;
                    }
                } else {
                    scenes = $scope.project.scenes;
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {

                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) {
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) {
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                function goToNextScene(checkMobile) {
                    // if (checkMobile && !isMobile.any) return;
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);

                    if (isMobile.any) {
                        vm.showNextPreview = false;
                    }
                }

                function goToPrevScene(checkMobile) {
                    // if (checkMobile && !isMobile.any) return;
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                    if (isMobile.any) {
                        // jQuery('#pluginNextscene .prev-scene').removeClass('show');
                    }
                    if(isMobile.any) {
                        vm.showPrevPreview = false;
                    }
                }

                $timeout(function() {
                    if (!isMobile.any) {
                        // Prev scene overview slide in/out
                        jQuery('#pluginNextscene .prev-button').hover(function() {
                            /* Stuff to do when the mouse enters the element */
                            jQuery('#pluginNextscene .prev-scene').addClass('show');
                            vm.showNextPreview = false;
                            hideNextPreview();
                        });

                        jQuery('#pluginNextscene .prev-scene').hover(function() {
                            /* Stuff to do when the mouse enters the element */
                            jQuery('#pluginNextscene .prev-scene').addClass('show');
                            vm.showNextPreview = false;
                            hideNextPreview();
                        }, function() {
                            /* Stuff to do when the mouse leaves the element */
                            jQuery('#pluginNextscene .prev-scene').removeClass('show');
                            vm.showPrevPreview = false;
                            hidePrevPreview();
                        });

                        // Next scene overview slide in/out
                        jQuery('#pluginNextscene .next-button').hover(function() {
                            /* Stuff to do when the mouse enters the element */
                            jQuery('#pluginNextscene .next-scene').addClass('show');
                            vm.showPrevPreview = false;
                            hidePrevPreview();
                        });

                        jQuery('#pluginNextscene .next-scene').hover(function() {
                            /* Stuff to do when the mouse enters the element */
                            jQuery('#pluginNextscene .next-scene').addClass('show');
                            hidePrevPreview();
                        }, function() {
                            /* Stuff to do when the mouse leaves the element */
                            jQuery('#pluginNextscene .next-scene').removeClass('show');
                            hideNextPreview();
                        });
                    }

                });

                function outsideClickHandler() {
                    vm.showNextPreview = false;
                    vm.showPrevPreview = false;
                    jQuery('#pluginNextscene .prev-scene, #pluginNextscene .next-scene').removeClass('show');
                }

                function hideNextPreview() {
                    vm.showNextPreview = false;
                    jQuery('#pluginNextscene .next-scene').removeClass('show');
                }

                function hidePrevPreview() {
                    vm.showPrevPreview = false;
                    jQuery('#pluginNextscene .prev-scene').removeClass('show');
                }
            }
        }
    });
