angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidgetGooey', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/socialsharewidget/themes/gooey/sswgooey.html',
            controllerAs: 'vm',
            controller: function($scope, $filter, $ocLazyLoad, LptHelper) {
                var vm = this;
                vm.project = $scope.project;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.config.theme = vm.config.theme ? vm.config.theme : {};

                vm.shareUrl = LptHelper.inIframe ? document.referrer : $filter('shareUrl')(vm.project.slug);
                vm.pluginInterface.initDefaultConfig(vm.config, {
                    position: 'bottom-right',
                });

                vm.pluginInterface.initDefaultConfig(vm.config.theme, {
                    toggle_icon_color: '#464646',
                    toggle_icon_bg_color: '#fff',
                    open_on_start: 0
                });

                vm.pluginInterface.initDefaultConfig(vm.config.theme, {
                    toggle_icon_color: '#464646',
                    toggle_icon_bg_color: '#fff',
                    position: 'bottom-right',
                    open_on_start: 0
                });

                $ocLazyLoad.load('modules/lapentor.marketplace/themes/controlbar/gooey/lib/TweenMax.min.js').then(function() {
                    var menuItemNum = jQuery("#PluginSocialsharewidget .menu-item").length;
                    var angle = 110;
                    var distance = 70;

                    var startingAngle = 140 + (-angle / 2);
                    var slice = angle / (menuItemNum - 1);

                    // Position: Bottom left => rotate icon to correct position
                    if (vm.config.position == 'bottom-left') {
                        startingAngle += 85;
                    }
                    // Position: Top left => rotate icon to correct position
                    if (vm.config.position == 'top-left') {
                        startingAngle += 175;
                    }

                    // Position: Top right => rotate icon to correct position
                    if (vm.config.position == 'top-right') {
                        startingAngle -= 175 - 80;
                    }

                    TweenMax.globalTimeScale(0.8);
                    jQuery("#PluginSocialsharewidget .menu-item").each(function(i) {
                        var angle = startingAngle + (slice * i);
                        jQuery(this).css({
                            transform: "rotate(" + (angle) + "deg)",
                            '-webkit-transform': "rotate(" + (angle) + "deg)"
                        });
                        jQuery(this).find(".menu-item-icon").css({
                            transform: "rotate(" + (-angle) + "deg)",
                            '-webkit-transform': "rotate(" + (-angle) + "deg)"
                        });
                    })
                    var on = vm.config.open_on_start == 1 ? true : false;

                    // Open or close on start
                    if (vm.config.open_on_start == 1) {
                        openMenu();
                    }

                    jQuery("#PluginSocialsharewidget .menu-toggle-button").mousedown(function() {
                        TweenMax.to(jQuery("#PluginSocialsharewidget .menu-toggle-icon"), 0.1, {
                            scale: 0.65
                        })
                    })
                    jQuery(document).mouseup(function() {
                        TweenMax.to(jQuery("#PluginSocialsharewidget .menu-toggle-icon"), 0.1, {
                            scale: 1
                        })
                    });
                    jQuery(document).on("touchend", function() {
                        jQuery(document).trigger("mouseup")
                    })
                    jQuery("#PluginSocialsharewidget .menu-toggle-button").on("mousedown", pressHandle);
                    jQuery("#PluginSocialsharewidget .menu-toggle-button").on("touchstart", function(event) {
                        jQuery(this).trigger("mousedown");
                        event.preventDefault();
                        event.stopPropagation();
                    });

                    function pressHandle(event) {
                        on = !on;
                        TweenMax.to(jQuery('#PluginSocialsharewidget .menu-toggle-icon'), 0.4, {
                            rotation: on ? 45 : 0,
                            ease: Quint.easeInOut,
                            force3D: true
                        });

                        on ? openMenu() : closeMenu();
                    }

                    function openMenu() {
                        jQuery("#PluginSocialsharewidget .menu-item").each(function(i) {
                            var delay = i * 0.08;

                            var jQuerybounce = jQuery(this).children("#PluginSocialsharewidget .menu-item-bounce");

                            TweenMax.fromTo(jQuerybounce, 0.2, {
                                transformOrigin: "50% 50%"
                            }, {
                                delay: delay,
                                scaleX: 0.8,
                                scaleY: 1.2,
                                force3D: true,
                                ease: Quad.easeInOut,
                                onComplete: function() {
                                    TweenMax.to(jQuerybounce, 0.15, {
                                        // scaleX:1.2,
                                        scaleY: 0.7,
                                        force3D: true,
                                        ease: Quad.easeInOut,
                                        onComplete: function() {
                                            TweenMax.to(jQuerybounce, 3, {
                                                // scaleX:1,
                                                scaleY: 0.8,
                                                force3D: true,
                                                ease: Elastic.easeOut,
                                                easeParams: [1.1, 0.12]
                                            })
                                        }
                                    })
                                }
                            });

                            TweenMax.to(jQuery(this).children("#PluginSocialsharewidget .menu-item-button"), 0.5, {
                                delay: delay,
                                y: distance,
                                force3D: true,
                                ease: Quint.easeInOut
                            });
                        })
                    }

                    function closeMenu() {
                        if (on == true) return;
                        jQuery("#PluginSocialsharewidget .menu-item").each(function(i) {
                            var delay = i * 0.08;

                            var jQuerybounce = jQuery(this).children("#PluginSocialsharewidget .menu-item-bounce");

                            TweenMax.fromTo(jQuerybounce, 0.2, {
                                transformOrigin: "50% 50%"
                            }, {
                                delay: delay,
                                scaleX: 1,
                                scaleY: 0.8,
                                force3D: true,
                                ease: Quad.easeInOut,
                                onComplete: function() {
                                    TweenMax.to(jQuerybounce, 0.15, {
                                        // scaleX:1.2,
                                        scaleY: 1.2,
                                        force3D: true,
                                        ease: Quad.easeInOut,
                                        onComplete: function() {
                                            TweenMax.to(jQuerybounce, 3, {
                                                // scaleX:1,
                                                scaleY: 1,
                                                force3D: true,
                                                ease: Elastic.easeOut,
                                                easeParams: [1.1, 0.12]
                                            })
                                        }
                                    })
                                }
                            });


                            TweenMax.to(jQuery(this).children("#PluginSocialsharewidget .menu-item-button"), 0.3, {
                                delay: delay,
                                y: 0,
                                force3D: true,
                                ease: Quint.easeIn
                            });
                        })
                    }
                });
            }
        };
    });
