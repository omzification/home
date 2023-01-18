angular.module('lapentor.marketplace.plugins')
    .directive('pluginFloorplan', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.marketplace/plugins/floorplan/tpl/floorplan.html',
            controller: function($scope, $timeout, $rootScope, LptHelper) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                var elementId = vm.lptsphereinstance.getPanoId();

                if (angular.isUndefined(vm.config)) { vm.config = {} };
                $scope.floorplans = vm.config.floorplans ? vm.config.floorplans : [];
                $scope.icon = vm.config.icon ? vm.config.icon : '';
                $scope.placemarkWidthHeight = vm.config.placemarkWidthHeight ? vm.config.placemarkWidthHeight : 25;
                $scope.listShow = false;
                var tran_origin = 'center';

                if(vm.config.on_start){
                    $scope.listShow = JSON.parse(vm.config.on_start); 
                }

                vm.initDefaultConfig(vm.config, {
                    position: 'center'
                });

                $scope.config = vm.config;

                $rootScope.$on('evt.krpano.onviewchange', function() {
                    if ($scope.viewMap && $scope.viewMap == true) {
                        startRadar();
                    }
                });

                $rootScope.$on('evt.krpano.onxmlcomplete', function() {
                    if($scope.listShow){
                        if ($scope.floorplans.length) {
                            if ($scope.currentFloorplanId) {
                                $scope.showMap($scope.currentFloorplanId);
                            } else {
                                $scope.showMap($scope.floorplans[0]._id);
                            }
                        }
                    }
                });

                angular.element(window).on("resize load", function() {
                    if ($scope.mapId) {
                        $scope.showMap($scope.mapId);
                    }
                });

                var scale = 1,
                    scaleDelta = 0.1;

                $('html,body').delegate('#canvas-map', 'mousewheel', function(e) {
                    if(vm.config.position == "bottom-left"){
                        tran_origin = 'bottom left';
                    }else if(vm.config.position == "bottom-right"){
                        tran_origin = 'bottom right';
                    }
                    var width = parseInt($(this).attr('width'));
                    var height = parseFloat($(this).attr('height'));


                    var size = width / height;
                    if (e.originalEvent.wheelDelta / 120 > 0) {
                        if (scale < 2.5) scale += scaleDelta;
                    } else {
                        if (scale > 1) scale -= scaleDelta;
                    }
                    $('#map-floorplan').css({
                        'transform': 'scale(' + scale + ')',
                        '-webkit-transform': 'scale(' + scale + ')',
                        '-moz-transform': 'scale(' + scale + ')',
                        'transform-origin': tran_origin
                    });
                });


                $scope.showMap = function(id) {
                    $scope.currentFloorplanId = id;
                    var floorplan = getFloorplan(id);
                    $scope.viewMap = true;
                    $scope.mapId = id;
                    $scope.mapName = floorplan.name;
                    $scope.map = floorplan.path;

                    $scope.ctnWidth = floorplan.resizeWidth || floorplan.width;
                    $scope.ctnHeight = floorplan.resizeHeight || floorplan.height;

                    if ($scope.ctnWidth > window.innerWidth) {
                        $scope.ctnWidth = window.innerWidth;
                        $scope.ctnHeight = parseInt(window.innerWidth / floorplan.width * floorplan.height);
                    }

                    if ($scope.ctnHeight > window.innerHeight) {
                        $scope.ctnWidth = parseInt(window.innerHeight / floorplan.height * floorplan.width);
                        $scope.ctnHeight = window.innerHeight;
                    }

                    $timeout(function() {
                        var canvasWidth = document.getElementById('canvas-map').offsetWidth;
                        var canvasHeight = document.getElementById('canvas-map').offsetHeight;

                        if (canvasWidth > canvasHeight) {

                            $scope.mapWidth = canvasWidth;
                            $scope.mapHeight = parseInt(canvasWidth / floorplan.width * floorplan.height);

                        } else if (canvasWidth < canvasHeight) {

                            $scope.mapWidth = parseInt(canvasHeight / floorplan.height * floorplan.width);
                            $scope.mapHeight = canvasHeight;
                        }
                        $scope.resizeIcon = 1;
                        if (floorplan.resizeWidth) {
                            $scope.resizeIcon = document.getElementById('canvas-map').offsetWidth / floorplan.resizeWidth;
                        }
                    })

                    $scope.placemarkers = floorplan.placemarkers ? floorplan.placemarkers : [];

                    angular.forEach($scope.placemarkers, function(value, key) {
                        var placemarker = value;
                        placemarker.active = false;
                        if (placemarker.targetScene) {
                            var scene = LptHelper.getObjectBy('_id', placemarker.targetScene, $scope.project.scenes);
                            if (scene._id) {
                                placemarker.active = true;
                                placemarker.title = scene.title;
                                placemarker.inLeft = placemarker.left;
                                placemarker.inTop = placemarker.top;

                                if (floorplan.resizeWidth && floorplan.resizeHeight) {
                                    $timeout(function() {
                                        placemarker.inLeft = placemarker.left / floorplan.resizeWidth * document.getElementById('canvas-map').offsetWidth;
                                        placemarker.inTop = placemarker.top / floorplan.resizeHeight * document.getElementById('canvas-map').offsetHeight;
                                    })

                                }
                            }
                        }

                    });
                    $timeout(function() {
                        startRadar();
                    })

                }

                $scope.close = function() {
                    $scope.viewMap = false;
                }

                $scope.initScene = function(sceneId) {
                    var scene = LptHelper.getObjectBy('_id', sceneId, $scope.project.scenes);
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'floorplan-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        $scope.listShow = !$scope.listShow;
                        // Show first floor plan map
                        if ($scope.floorplans.length) $scope.showMap($scope.floorplans[0]._id);
                    }
                });

                function getFloorplan(id) {
                    return vm.config.floorplans.filter(function(floorplan) {
                        return floorplan._id == id
                    })[0];
                };

                function startRadar() {
                    closeRadar();
                    if ($scope.placemarkers && vm.config.radars.active) {

                        var view = krpano.screentosphere(0, ($('#' + elementId).height() / 2));
                        var hlookatLeft = view.x + 180;
                        view = krpano.screentosphere($('#' + elementId).width(), ($('#' + elementId).height() / 2));
                        var hlookatRight = view.x + 180;

                        $scope.placemarkers.filter(function(placemarker) {
                            if (placemarker.targetScene && placemarker.targetScene == $scope.scene._id) {

                                redrawRadar(
                                    hlookatLeft,
                                    hlookatRight,
                                    placemarker.heading,
                                    placemarker.inTop,
                                    placemarker.inLeft,
                                    vm.config.radars.radius,
                                    vm.config.radars.top,
                                    vm.config.radars.left,
                                    vm.config.radars.background,
                                    vm.config.radars.border
                                );

                            }
                        });
                    }
                }

                function closeRadar() {

                    var ct = document.getElementById("canvas-map");
                    var ctx = ct.getContext("2d");
                    ctx.clearRect(0, 0, ct.width, ct.height);
                }

                function redrawRadar(hlookatLeft, hlookatRight, hlookat, placemarkTop, placemarkLeft, radius, radarTop, radarLeft, background, border) {

                    var ct = document.getElementById("canvas-map");

                    var ctx = ct.getContext("2d");

                    ctx.save();

                    ctx.clearRect(0, 0, ct.width, ct.height);

                    ctx.translate(placemarkLeft + (radarLeft * $scope.resizeIcon), placemarkTop + (radarTop * $scope.resizeIcon));

                    ctx.beginPath();

                    var start = hlookatLeft + (270 - (hlookat + 180));
                    var end = hlookatRight + (270 - (hlookat + 180));

                    var startAngle = start / 180 * Math.PI;
                    var endAngle = end / 180 * Math.PI;

                    ctx.arc(0, 0, radius, startAngle, endAngle);
                    ctx.lineTo(0, 0);
                    ctx.closePath();

                    ctx.strokeStyle = background;
                    ctx.fillStyle = background;
                    ctx.fill();

                    ctx.stroke();
                    ctx.restore();

                }
            }
        };
    });
