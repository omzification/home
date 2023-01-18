angular.module('lapentor.marketplace.plugins')
    .directive('pluginLensflare', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.marketplace/plugins/lensflare/tpl/lensflare.html',
            controller: function($scope, $timeout, $rootScope, $window, LptHelper) {
                var pluginVm = $scope.pluginVm,
                    vm = this,
                    krpano = pluginVm.lptsphereinstance.krpano(),
                    cx = 0,
                    cy = 0,
                    lx = 0,
                    ly = 0,
                    px = 0,
                    py = 0,
                    mobj = 0,
                    max = 400;

                $rootScope.$on('evt.livesphere.changescene', function() {
                    // Hide old lens flare when change scene
                    vm.lensflareShow = false;
                });

                // Handle event when sphere's xml complete
                $scope.$on('evt.krpano.onxmlcomplete', function() {

                    vm.lensflareShow = false;

                    try {
                        if (pluginVm.config.lensflare[$scope.scene._id]) {
                            vm.lensflareShow = true;

                            // Add lens flare hotspot to sphere
                            pluginVm.lptsphereinstance.addHotspot({
                                name: 'lensflare',
                                url: pluginVm.pluginPath + '/images/flare1.png',
                                width: 400,
                                height: 400,
                                ath: pluginVm.config.lensflare[$scope.scene._id].x,
                                atv: pluginVm.config.lensflare[$scope.scene._id].y,
                                enabled: false
                            });
                        }else{
                            pluginVm.lptsphereinstance.deleteHotspot('lensflare');
                        }
                    } catch (e) {
                        console.log('WARN:lensflare: empty config');
                    }
                });

                // Handle event when sphere view change
                $rootScope.$on('evt.krpano.onviewchange', function() {

                    // Calculate lens flare position according to current view
                    try {
                        if (pluginVm.config.lensflare[$scope.scene._id]) {
                            calcLensflarePos(
                                pluginVm.config.lensflare[$scope.scene._id].x,
                                pluginVm.config.lensflare[$scope.scene._id].y,
                                30
                            );
                        }
                    } catch (e) {

                    }
                });

                ////////// functions

                function calcLensflarePos(ath, atv, dp) {
                    var flashOpacity = 0,
                        kc_h, kc_v,
                        view = krpano.screentosphere($window.innerWidth / 2, $window.innerHeight / 2),
                        view_h = view.x,
                        view_v = view.y;

                    if (view_h - (ath - dp) > 360) {
                        view_h = view_h - 360;
                    }
                    if (((ath + dp) - view_h) > 360) {
                        view_h = view_h + 360;
                    }
                    if ((view_h > ath - dp && view_h < ath + dp) && (view_v > atv - dp && view_v < atv + dp)) {
                        if (view_h < ath) kc_h = ath - view_h;
                        if (view_h > ath) kc_h = view_h - ath;
                        if (view_v < atv) kc_v = atv - view_v;
                        if (view_v > atv) kc_v = view_v - atv;
                        if (kc_h > kc_v) {
                            flashOpacity = (dp - kc_h) / dp * 0.5;
                        } else {
                            flashOpacity = (dp - kc_v) / dp * 0.5;
                        }
                    }

                    var a = krpano.spheretoscreen(ath, atv),
                        v = krpano.spheretoscreen(view_h, view_v);

                    draw(a.x, a.y, v.x, v.y, flashOpacity);
                }

                function draw(ax, ay, vx, vy, opacity) {

                    vm.lensflareShow = true;
                    if (!ax) {
                        vm.lensflareShow = false;
                        angular.element('#flash').css('opacity', 0);
                        return false;
                    }
                    if (!px) {
                        px = 0;
                        py = 0;
                    }
                    cx = ax;
                    cy = ay;
                    lx = vx;
                    ly = vy;
                    px -= (px - lx) * .1;
                    py -= (py - ly) * .1;

                    drawLens('l1', 0.4, 1.5, 0, 0);
                    drawLens('l2', 0.3, 2, 0, 0);
                    drawLens('l3', 0.2, 5, 0, 0);
                    angular.element('#flash').css('opacity', opacity);
                }

                function drawLens(id, scale, distance, x, y) {
                    var vx = (cx - px) / -distance,
                        vy = (cy - py) / -distance,
                        d = max * scale,
                        css = document.getElementById(id).style;
                    css.top = Math.round(vy - (d * 0.5) + cy + y) + 'px';
                    css.left = Math.round(vx - (d * 0.5) + cx + x) + 'px';
                    css.width = Math.round(d) + 'px';
                    css.height = Math.round(d) + 'px';
                }
            }
        }
    });
