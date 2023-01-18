angular.module('lapentor.marketplace.plugins')
    .directive('pluginGooglemap', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/googlemap/tpl/googlemap.html',
            controllerAs: 'vm',
            controller: pluginGooglemapCtrl,
        }
    });

function pluginGooglemapCtrl($scope, $ocLazyLoad, $timeout, $rootScope, LptHelper) {
    var vm = this;
    vm.pluginInterface = $scope.pluginVm;
    vm.config = vm.pluginInterface.config;
    vm.project = $scope.project;
    vm.scenes = {};
    if (angular.isDefined(vm.config.show_on_start)) {
        vm.mapShow = vm.config.show_on_start == 1 ? true : false;
    } else {
        vm.mapShow = false;
    }

    angular.forEach(vm.project.scenes, function(scene, key) {
        vm.scenes[scene._id] = scene;
    });

    // Init config
    vm.config = vm.config || {};
    vm.config.zoom = vm.config.zoom || 10;
    vm.config.type = vm.config.type || 'project';
    vm.config.project = vm.config.project || { lat: 40.730610, lng: -73.935242 };
    vm.config.scenes = vm.config.scenes || {};
    vm.config.map_style = vm.config.map_style || '[{"featureType":"administrative","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"administrative.province","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","elementType":"all","stylers":[{"saturation":-100},{"lightness":"50"},{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"lightness":"30"}]},{"featureType":"road.local","elementType":"all","stylers":[{"lightness":"40"}]},{"featureType":"transit","elementType":"all","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]},{"featureType":"water","elementType":"labels","stylers":[{"lightness":-25},{"saturation":-100}]}]';
    // END Init config

    vm.map = {};
    vm.markers = {};
    vm.markers.scenes = {};
    vm.center = {lat: 37.2756895, lng: -104.6556336};
    vm.infowindow = {};

    if (vm.config.type == 'project') {
        vm.center = vm.config.project;
    }
    if (vm.config.type == 'scenes') {

        if (!$.isEmptyObject(vm.config.scenes)) {
            vm.center = vm.config.scenes[$scope.scene._id] || {};
        }
    }

    /////////////// run

    // Load google map api (only once)
    loadAndInitMap();

    // Listen for button click on control bar
    var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'googlemap-';
    $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
        if (eventType == 'click') {
            vm.mapShow = true;
            if (vm.config.type == 'scenes') {
                checkAndLoadSceneMap();
            } else {
                loadAndInitMap();
            }
        }
    });

    $scope.$on('evt.krpano.onxmlcomplete', checkAndLoadSceneMap);

    /////////////// functions defination

    function checkAndLoadSceneMap() {
        if (vm.config.type == 'scenes') {
            if ($.isEmptyObject(vm.map)) {
                // console.log('// - Map is not loaded')
                if (vm.config.scenes[$scope.scene._id]) {
                    // - exist current scene location
                    vm.center = vm.config.scenes[$scope.scene._id];
                } else {
                    // console.log('// not exist current scene location')
                    // vm.mapShow = false;
                }
            } else {
                // console.log('// Map is loaded')
                if (vm.markers.scenes[$scope.scene._id]) {
                    // console.log('// - exist current scene location')
                    vm.map.panTo(vm.markers.scenes[$scope.scene._id].getPosition());
                    closeInfowindowAll();
                    vm.infowindow[$scope.scene._id].open(vm.map, vm.markers.scenes[$scope.scene._id]);
                } else {
                    // console.log('// not exist current scene location')
                    // vm.mapShow = false;
                }
            }
            loadAndInitMap();
        }
    }

    function loadAndInitMap() {
        if (vm.mapShow) {
            $timeout(function() {
                if ('undefined' !== typeof(google)) {
                    initMap();
                } else {
                    $ocLazyLoad.load('js!https://maps.googleapis.com/maps/api/js?key=' + LPT_GOOGLE_KEY_API + '&libraries=places').then(function() {
                        initMap();
                    });
                }
            }, 1000);
        }
    }

    function initMap() {
        if(!vm.center.lat || !vm.center.lng) return;
        var mapConfig = {
            center: { lat: vm.center.lat, lng: vm.center.lng },
            zoom: vm.config.zoom,
            mapTypeId: vm.config.map_type,
            styles: JSON.parse(vm.config.map_style),
            disableDefaultUI: true
        };
        var defaultIcon = 'modules/lapentor.marketplace/plugins/googlemap/images/marker.svg';

        vm.map = new google.maps.Map(document.getElementById('map-canvas'), mapConfig);

        if (vm.config.type == 'project') {
            vm.markers.project = new google.maps.Marker({
                position: new google.maps.LatLng(vm.config.project.lat, vm.config.project.lng),
                map: vm.map,
                icon: vm.config.icon || defaultIcon,
            });

            vm.infowindow.project = setInfowindow(vm.project);
            setMarkerClick(vm.markers.project, vm.infowindow.project);
            vm.infowindow.project.open(vm.map, vm.markers.project);
        }

        if (vm.config.type == 'scenes') {
            angular.forEach(vm.config.scenes, function(position, targetScene) {

                vm.markers.scenes[targetScene] = new google.maps.Marker({
                    position: new google.maps.LatLng(position.lat, position.lng),
                    map: vm.map,
                    icon: vm.config.icon || defaultIcon,
                });

                vm.infowindow[targetScene] = setInfowindow(vm.scenes[targetScene]);
                setMarkerClick(vm.markers.scenes[targetScene], vm.infowindow[targetScene], targetScene);
                if (targetScene == $scope.scene._id) {
                    vm.infowindow[targetScene].open(vm.map, vm.markers.scenes[targetScene]);
                    vm.map.panTo(vm.markers.scenes[$scope.scene._id].getPosition());
                }
            });
        }

        if (vm.config.icon) {
            if (vm.markers.project) {
                vm.markers.project.setIcon({
                    url: vm.config.icon || defaultIcon,
                    scaledSize: new google.maps.Size(vm.config.icon ? vm.config.placemarkWidth : 22, vm.config.icon ? vm.config.placemarkHeight : 40)
                });
            }
            if (vm.markers.scenes) {
                angular.forEach(vm.markers.scenes, function(marker, key) {
                    marker.setIcon({
                        url: vm.config.icon || defaultIcon,
                        scaledSize: new google.maps.Size(vm.config.icon ? vm.config.placemarkWidth : 22, vm.config.icon ? vm.config.placemarkHeight : 40)
                    });
                });
            }
        }
    }

    function setMarkerClick(marker, infowindow, sceneId) {

        marker.addListener('click', function() {
            closeInfowindowAll();
            infowindow.open(vm.map, marker);
            vm.map.panTo(marker.getPosition());
            if (vm.config.type == 'scenes') {
                var scene = LptHelper.getObjectBy('_id', sceneId, $scope.project.scenes);
                $rootScope.$emit('evt.livesphere.changescene', scene);
            }

        });

    }

    function setInfowindow(object) {
        return new google.maps.InfoWindow({
            content: object.title
        });
    }

    function closeInfowindowAll() {

        angular.forEach(vm.infowindow, function(infowindow, targetScene) {
            infowindow.close();
        });
    }
}
