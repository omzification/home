// Theme: gooey
angular.module('lapentor.marketplace.themes')
    .directive('controlbarGooey', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/gooey/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, Marketplace, $ocLazyLoad) {
                var vm = this;
                vm.project = $scope.project;
                vm.config = vm.project.theme_controlbar.config;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);

                $scope.initDefaultConfig(vm.config, {
                    distance: 120,
                    angle: 180,
                    bg_color: '#fff',
                    toggle_icon_color: '#000',
                    position: 'bottom',
                    open_on_start: 1
                });

                $ocLazyLoad.load('modules/lapentor.marketplace/themes/controlbar/gooey/lib/TweenMax.min.js').then(function() {
                    var menuItemNum = jQuery("#controlbar-gooey .menu-item").length;
                    var angle = vm.config.angle; // min: 60, max 360
                    var distance = vm.config.distance; // min: 80, max: 500

                    var startingAngle = 180 + (-angle / 2);
                    var slice = angle / (menuItemNum - 1);

                    // Apply some changes to Angle due to Position
                    switch (vm.config.position) {
                        case 'top':
                            startingAngle = 180 + (angle / 2);
                            break;
                        case 'right':
                            startingAngle = 90 + (-angle / 2);
                            break;
                        case 'left':
                            startingAngle = -90 + (-angle / 2);
                            break;
                    }
                    TweenMax.globalTimeScale(0.8);
                    jQuery("#controlbar-gooey .menu-item").each(function(i) {
                        var angle = startingAngle + (slice * i);
                        jQuery(this).css({
                            transform: "rotate(" + (angle) + "deg)"
                        });
                        jQuery(this).find(".menu-item-icon").css({
                            transform: "rotate(" + (-angle) + "deg)"
                        });
                    })
                    var on = (vm.config.open_on_start == 1) ? true : false;
                    // Open or close on start
                    if (vm.config.open_on_start == 1) {
                        openMenu();
                    }

                    jQuery("#controlbar-gooey .menu-toggle-button").mousedown(function() {
                        TweenMax.to(jQuery("#controlbar-gooey .menu-toggle-icon"), 0.1, {
                            scale: 0.65
                        })
                    });
                    jQuery(document).mouseup(function() {
                        TweenMax.to(jQuery("#controlbar-gooey .menu-toggle-icon"), 0.1, {
                            scale: 1
                        })
                    });
                    jQuery(document).on("touchend", function() {
                        jQuery(document).trigger("mouseup")
                    })
                    jQuery("#controlbar-gooey .menu-toggle-button").on("mousedown", pressHandler);
                    jQuery("#controlbar-gooey .menu-toggle-button").on("touchstart", function(event) {
                        jQuery(this).trigger("mousedown");
                        event.preventDefault();
                        event.stopPropagation();
                    });

                    jQuery('#controlbar-gooey .menu-toggle-icon').css('transform', 'rotate('+ (on?45:0) +'deg)');

                    function pressHandler(event) {
                        TweenMax.to(jQuery('#controlbar-gooey .menu-toggle-icon'), 0.4, {
                            rotation: on ? 0 : 45,
                            ease: Quint.easeInOut,
                            force3D: true
                        });

                        on ? closeMenu() : openMenu();
                    }

                    function openMenu() {
                        on = true;
                        jQuery("#controlbar-gooey .menu-item").each(function(i) {
                            var delay = i * 0.08;

                            var jQuerybounce = jQuery(this).children(".menu-item-bounce");

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

                            TweenMax.to(jQuery(this).children(".menu-item-button"), 0.5, {
                                delay: delay,
                                y: distance,
                                force3D: true,
                                ease: Quint.easeInOut
                            });
                        });
                        jQuery("#controlbar-gooey .menu-items").removeClass('closed');
                    }

                    function closeMenu() {
                        if (on == false) return;
                        on = false;
                        jQuery('#controlbar-gooey .menu-toggle-icon').css('transform', 'rotate('+ (on?45:0) +'deg)');
                        jQuery("#controlbar-gooey .menu-item").each(function(i) {
                            var delay = i * 0.08;

                            var jQuerybounce = jQuery(this).find(".menu-item-bounce");

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

                            TweenMax.to(jQuery(this).find(".menu-item-button"), 0.3, {
                                delay: delay,
                                y: 0,
                                force3D: true,
                                ease: Quint.easeIn
                            });
                        });
                        jQuery("#controlbar-gooey .menu-items").addClass('closed');

                    }
                    vm.closeMenu = closeMenu;
                });

                try {
                    vm.themeStyle = {
                        'background-color': vm.project.theme_controlbar.config.bg_color
                    }
                } catch (e) {
                    vm.themeStyle = {};
                }

            }
        };
    });
