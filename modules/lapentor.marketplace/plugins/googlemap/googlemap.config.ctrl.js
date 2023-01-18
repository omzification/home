// $scope inherited from marketplace.item.config.js
//document.write('<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJQcf5T_NL7NrMTup90nAkm3070LmifYk&libraries=places"></script>');
angular.module('lapentor.marketplace.plugins')
    .controller('pluginGooglemapConfigCtrl', pluginGooglemapConfigCtrl);

/**
 * Controller for Google map plugin config modal
 * @param  {object} project   [project resolved]
 * @param  {object} item      [it can be theme or plugin]
 */
function pluginGooglemapConfigCtrl($scope, $rootScope, $timeout, $ocLazyLoad, Alertify, LptHelper, project, item) {
    var vm = this;
    vm.project = project;
    vm.scenes = {};

    angular.forEach(vm.project.scenes, function(scene, key) {
        vm.scenes[scene._id] = scene;
    });

    vm.updateConfig = updateConfig;
    vm.mapChangeType = mapChangeType;
    vm.changeScene = changeScene;
    vm.deleteMarkerScene = deleteMarkerScene;
    vm.config = item.config;
    vm.enabledSave = true;
    vm.ratio = 1;

    // Init config
    vm.config = vm.config || {};
    vm.config.type = vm.config.type || 'project';
    vm.config.position = vm.config.position || 'left';
    vm.config.theme = vm.config.theme || 'square';
    vm.config.map_type = vm.config.map_type || 'roadmap';
    vm.config.map_style = vm.config.map_style || '[{"featureType":"administrative","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"administrative.province","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","elementType":"all","stylers":[{"saturation":-100},{"lightness":"50"},{"visibility":"simplified"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":"-100"}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"all","stylers":[{"lightness":"30"}]},{"featureType":"road.local","elementType":"all","stylers":[{"lightness":"40"}]},{"featureType":"transit","elementType":"all","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]},{"featureType":"water","elementType":"labels","stylers":[{"lightness":-25},{"saturation":-100}]}]';
    vm.config.show_on_start = vm.config.show_on_start || "0";
    vm.config.zoom = vm.config.zoom || 10;
    vm.config.placemarkWidth = vm.config.placemarkWidth || 0;
    // END Init config

    if (angular.isUndefined(vm.config.project)) { vm.config.project = { lat: 40.730610, lng: -73.935242 }; }
    vm.config.scenes = vm.config.scenes || {};

    if (vm.config.type == 'project') {
        vm.center = vm.config.project;
    }

    if (vm.config.type == 'scenes') {

        if (!$.isEmptyObject(vm.config.scenes)) {
            vm.center = vm.config.scenes[Object.keys(vm.config.scenes)[0]];
        } else {
            vm.center = vm.config.project;
        }
    }

    vm.map;
    vm.markers = {};
    vm.markers.scenes = {};
    vm.infowindow = {};
    vm.infowindow.scenes = {};

    if ('undefined' === typeof(google)) {
        $ocLazyLoad.load('js!https://maps.googleapis.com/maps/api/js?key=' + LPT_GOOGLE_KEY_API + '&libraries=places&sensor=false').then(function() {
            $timeout(function() {
                initMap();
                mapChangeType();
            }, 1000);
        });
    } else {
        try {
            $timeout(function() {
                initMap();
                mapChangeType();
            });
        } catch (e) {
            console.error(e);
        }
    }

    vm.onMapTypeChange = function() {
        vm.map.setMapTypeId(vm.config.map_type);
    }

    vm.openMediaLib = function() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    vm.onMapChangeStyle = onMapChangeStyle;
    vm.onMapChangeZoom = onMapChangeZoom;

    /////// functions detail

    function onMapChangeZoom() {
        if(!isNaN(vm.config.zoom)) {
            vm.map.setZoom(parseInt(vm.config.zoom));
        }else{
            vm.map.setZoom(vm.config.zoom);
        }
        vm.map.setCenter(new google.maps.LatLng(vm.center.lat, vm.center.lng));
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.icon = file.path;
            vm.config.placemarkWidth = 50;
            vm.ratio = file.width / file.height;
            vm.config.placemarkHeight = 50 / vm.ratio;
            vm.changeIconMap();
        }
    }

    vm.markerUpdateWidthHeight = function() {

        if (vm.config.icon) {
            vm.config.placemarkHeight = vm.config.placemarkWidth / vm.ratio;
            vm.changeIconMap();
        }

    }

    vm.changeIconMap = function() {
        if (vm.markers.project) {
            vm.markers.project.setIcon({
                url: vm.config.icon || 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi_hdpi.png',
                scaledSize: new google.maps.Size(vm.config.icon ? vm.config.placemarkWidth : 22, vm.config.icon ? vm.config.placemarkHeight : 40)
            });
        }
        if (vm.markers.scenes) {
            angular.forEach(vm.markers.scenes, function(marker, key) {
                marker.setIcon({
                    url: vm.config.icon || 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi_hdpi.png',
                    scaledSize: new google.maps.Size(vm.config.icon ? vm.config.placemarkWidth : 22, vm.config.icon ? vm.config.placemarkHeight : 40)

                });
            });
        }
    }

    vm.deleteIcon = function() {

        vm.config.icon = null;
        if (vm.markers.project) {
            vm.markers.project.setIcon({
                url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi_hdpi.png',
                scaledSize: new google.maps.Size(22, 40)
            });
        }
        if (vm.markers.scenes) {
            angular.forEach(vm.markers.scenes, function(marker, key) {

                marker.setIcon({
                    url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi_hdpi.png',
                    scaledSize: new google.maps.Size(22, 40)
                });
            });
        }
    }

    function initMap() {
        var defaultIcon = 'modules/lapentor.marketplace/plugins/googlemap/images/marker.svg';
        vm.map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: { lat: vm.center.lat, lng: vm.center.lng },
            zoom: vm.config.zoom,
            mapTypeId: vm.config.map_type,
            styles: (vm.config.map_style ? JSON.parse(vm.config.map_style) : '') || ''
        });

        vm.markers.project = new google.maps.Marker({
            position: new google.maps.LatLng(vm.config.project.lat, vm.config.project.lng),
            draggable: true,
            map: vm.map,
            icon: vm.config.icon || defaultIcon,
        });

        vm.infowindow.project = setInfowindow(vm.project);
        setMarkerClick(vm.markers.project, vm.infowindow.project);
        vm.infowindow.project.open(vm.map, vm.markers.project);

        angular.forEach(vm.config.scenes, function(position, targetScene) {

            vm.markers.scenes[targetScene] = new google.maps.Marker({
                position: new google.maps.LatLng(position.lat, position.lng),
                animation: google.maps.Animation.DROP,
                draggable: true,
                map: vm.map,
                icon: vm.config.icon || defaultIcon,
            });

            setMarkerClick(vm.markers.scenes[targetScene], vm.infowindow.scenes[targetScene], targetScene);
        });

        mapSearch(vm.map);
        mapEvents(vm.map);
    }

    function mapSearch(map) {

        var input = document.createElement("INPUT");
        input.setAttribute("id", "pac-input");
        input.setAttribute("type", "text");
        input.setAttribute("class", "controls");
        input.setAttribute("placeholder", "Search Box");

        var searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function() {
            searchBox.setBounds(map.getBounds());
        });

        var markers_search = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function() {
            var places = searchBox.getPlaces();

            if (places.length == 0) {
                return;
            }

            // Clear out the old markers_search.
            markers_search.forEach(function(marker) {
                marker.setMap(null);
            });
            markers_search = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function(place) {
                if (!place.geometry) {
                    //console.log("Returned place contains no geometry");
                    return;
                }
                var icon = {
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(25, 25)
                };

                if (vm.config.type == 'project') {
                    vm.markers.project.setPosition(place.geometry.location);
                }
                if (vm.config.type == 'scenes') {
                    if (vm.targetScene) {
                        if (vm.markers.scenes[vm.targetScene]) {
                            vm.markers.scenes[vm.targetScene].setPosition(place.geometry.location);
                        } else {
                            vm.markers.scenes[vm.targetScene] = new google.maps.Marker({
                                position: place.geometry.location,
                                animation: google.maps.Animation.DROP,
                                draggable: true,
                                map: vm.map,
                            });
                            vm.changeIconMap();
                        }
                    }
                }
                // Create a marker for each place.
                //markers_search.push(new google.maps.Marker({
                //    map: map,
                //    icon: icon,
                //    title: place.name,
                //    position: place.geometry.location
                //}));

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
        });
    }

    function mapEvents(map) {

        map.addListener('click', function(event) {
            if (vm.config.type == 'project') {

                vm.markers.project.setPosition(event.latLng);
            }
            if (vm.config.type == 'scenes') {

                if (vm.targetScene) {

                    if (!vm.markers.scenes[vm.targetScene]) {

                        vm.markers.scenes[vm.targetScene] = new google.maps.Marker({
                            position: event.latLng,
                            animation: google.maps.Animation.DROP,
                            draggable: true,
                            map: vm.map,
                        });

                        //vm.infowindow.scenes[vm.targetScene] = setInfowindow(vm.scenes[vm.targetScene]);
                        setMarkerClick(vm.markers.scenes[vm.targetScene], vm.infowindow[vm.targetScene], vm.targetScene);
                        toggleBounce(vm.markers.scenes[vm.targetScene]);
                        //setMarkerHover(vm.markers.scenes[vm.targetScene],vm.infowindow[vm.targetScene]);   
                        //vm.infowindow.scenes[vm.targetScene].open(vm.map,vm.markers.scenes[vm.targetScene]);
                        vm.changeIconMap();
                    } else {

                        //vm.markers.scenes[vm.targetScene].setPosition(event.latLng); 
                    }
                } else {
                    //Alertify.error('selected scene null');  
                }

            }
        });
    }

    function onMapChangeStyle() {
        if(vm.config.map_style) {
            var styledMapType = new google.maps.StyledMapType(JSON.parse(vm.config.map_style),
            {name: 'Styled Map'});

            vm.map.mapTypes.set('styled_map', styledMapType);
            vm.map.setMapTypeId('styled_map');
        }
    }

    function mapChangeType() {
        if (vm.config.type == 'project') {

            vm.markers.project.setMap(vm.map);
            vm.map.panTo(vm.markers.project.getPosition());

            angular.forEach(vm.markers.scenes, function(marker, targetScene) {

                marker.setMap(null);
            });
        }
        if (vm.config.type == 'scenes') {

            vm.markers.project.setMap(null);

            angular.forEach(vm.markers.scenes, function(marker, targetScene) {

                marker.setMap(vm.map);
            });

            vm.map.panTo(vm.config.project);
            if (vm.targetScene) {
                toggleBounce(vm.markers.scenes[vm.targetScene]);
            }

        }

    }

    function changeScene() {
        if (vm.markers.scenes[vm.targetScene]) {
            vm.map.panTo(vm.markers.scenes[vm.targetScene].getPosition());
            toggleBounce(vm.markers.scenes[vm.targetScene]);
        } else {
            clearMarkerAnimation();
        }
    }

    function setMarkerClick(marker, infowindow, targetScene) {

        marker.addListener('click', function() {
            vm.targetScene = targetScene;
            vm.map.panTo(marker.getPosition());

            if (vm.config.type == 'project') {
                vm.infowindow.project.open(vm.map, vm.markers.project);
            }
            if (vm.config.type == 'scenes' && marker.getAnimation() == null) {
                toggleBounce(marker);
            }

        });

    }

    function setMarkerHover(marker, infowindow) {

        marker.addListener('mouseover', function() {
            infowindow.open(vm.map, marker);
        });

        // assuming you also want to hide the infowindow when user mouses-out
        marker.addListener('mouseout', function() {
            infowindow.close();
        });
    }

    function setInfowindow(object) {
        return new google.maps.InfoWindow({
            content: object.title
        });
    }

    function toggleBounce(marker) {
        angular.forEach(vm.markers.scenes, function(_marker, targetScene) {
            _marker.setAnimation(null);
        });

        marker.setAnimation(google.maps.Animation.BOUNCE);
    }

    function clearMarkerAnimation() {
        angular.forEach(vm.markers.scenes, function(_marker, targetScene) {
            _marker.setAnimation(null);
        });
    }

    function deleteMarkerScene(targetScene) {

        if (targetScene) {

            vm.markers.scenes[targetScene].setMap(null);
            delete vm.infowindow.scenes[targetScene];
            delete vm.markers.scenes[targetScene];
        } else {

            angular.forEach(vm.markers.scenes, function(marker, targetScene) {
                marker.setMap(null);
            });
            vm.markers.scenes = {};
        }

    }

    function updateConfig() {
        if (vm.config.type == 'project') {
            try{
                vm.config.project = { lat: vm.markers.project.getPosition().lat(), lng: vm.markers.project.getPosition().lng() };
            }catch(e) {
                Alertify.error('You have to select your location');
            }
        }
        if (vm.config.type == 'scenes') {

            if (!$.isEmptyObject(vm.markers.scenes)) {

                vm.enabledSave = true;
            } else {

                vm.enabledSave = false;
                Alertify.error('Please choose a location on the map');
            }

            angular.forEach(vm.markers.scenes, function(marker, targetScene) {

                vm.config.scenes[targetScene] = { lat: marker.getPosition().lat(), lng: marker.getPosition().lng() };
            });
        }

        vm.config.zoom = vm.map.getZoom();

        if (vm.enabledSave) {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }
}
