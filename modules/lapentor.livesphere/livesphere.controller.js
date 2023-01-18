angular.module('lapentor.livesphere')
    .controller('LiveSphereCtrl', LiveSphereCtrl);

function LiveSphereCtrl($timeout, $scope, $rootScope, $translate, envService, $stateParams, ngMeta, lptSphere, LptHelper, $http, Alertify, project) {
    var vm = this,
        sphereViewerDomId = 'LiveSphereViewer';

    // var VIEW_ID = 'UA-150969929-1';

    vm.lptPrompt = {
        show: false
    };
    vm.scene = null;
    vm.nextscene = null;
    vm.project = project;
    vm.scenes = project.scenes;
    vm.hotspots = [];
    vm.activePass = false;
    vm.checkPass = checkPass;
    vm.isLocked = false;
    
    try {
        vm.isLocked = project.error === 'project_locked';
    } catch (error) {
        vm.isLocked = false;
    }

    if (window.LPT_PREFER_LANG || localStorage.getItem('LPT_PREFER_LANG') || (vm.project && vm.project.settings && vm.project.language)) {
        $translate.use(window.LPT_PREFER_LANG || localStorage.getItem('LPT_PREFER_LANG') || vm.project.language);
    }

    if (vm.isLocked) return;

    vm.permissionTitle = '';
    var permissions = [];

    // Check if project has sound plugins
    try {
        project.plugins.map(function(plugin) {
            if (plugin.slug === "backgroundsound" || plugin.slug === "gyro" || plugin.slug === 'webvr') {
                permissions.push(plugin.name);
            }
        });

        vm.hasPermissionPlugins = permissions.length ? true : false;

        if (vm.hasPermissionPlugins) {
            vm.permissionTitle = permissions.join(', ');
        }
    } catch (error) {
        console.error(error);
        vm.hasPermissionPlugins = false;
    }

    vm.shouldShowConfirmPermission = isMobile.any;

    vm.allowPermissions = function() {
        $rootScope.$broadcast('evt.allowMusicMobile');
        vm.shouldShowConfirmPermission = false;
        askDeviceMotionPermission();
    }

    vm.allowAutoplayAudio = function() {
        vm.shouldAutoplayAudio = false;
        $rootScope.$broadcast('evt.allowAutoplayAudio');
    }

    $scope.$on('evt.showConfirmPermission', function() {
        vm.shouldAutoplayAudio = true;

        $timeout(function() {
            vm.shouldAutoplayAudio = false;
        }, 6000);
    });

    $scope.$on('evt.showPrompt', function(ev, data) {
        vm.lptPrompt.show = true;
        vm.lptPrompt.title = data.title;
        vm.lptPrompt.msg = data.msg;
        vm.lptPrompt.placeholder = data.placeholder;
    });

    $scope.$on('evt.hidePrompt', function() {
        vm.lptPrompt.show = false;
        vm.lptPrompt.title = '';
        vm.lptPrompt.msg = '';
        vm.lptPrompt.placeholder = '';
    });

    vm.submitPrompt = function() {
        $rootScope.$broadcast('evt.submitPrompt', vm.lptPrompt.input);
        vm.lptPrompt.input = '';
    }

    $timeout(function() {
        vm.shouldShowConfirmPermission = false;
    }, 6000);

    vm.htmlThemes = ['bubble', 'royal', 'gify', 'crystal', 'pentagon'];
    // if (!angular.isUndefined(vm.project.google) && !angular.isUndefined(vm.project.google.analytics_id)) {
    //     VIEW_ID = vm.project.google.analytics_id;
    // }

    // (function(i, s, o, g, r, a, m) {
    //     i['GoogleAnalyticsObject'] = r;
    //     i[r] = i[r] || function() {
    //         (i[r].q = i[r].q || []).push(arguments)
    //     }, i[r].l = 1 * new Date();
    //     a = s.createElement(o),
    //         m = s.getElementsByTagName(o)[0];
    //     a.async = 1;
    //     a.src = g;
    //     m.parentNode.insertBefore(a, m)
    // })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

    // ga('create', VIEW_ID, 'auto');
    // ga('send', 'pageview');

    ///////////////////

    function askDeviceMotionPermission() {
        if ( typeof( DeviceMotionEvent ) !== "undefined" && typeof( DeviceMotionEvent.requestPermission ) === "function" ) {
            DeviceMotionEvent.requestPermission().then( function(response) {
                if ( response == "granted" ) {
                    window.addEventListener( "devicemotion", function(e) {
                    });
                }
            }).catch( console.error )
        } else {
            console.error( "DeviceMotionEvent is not defined" );
        }
    }

    function checkPass() {
        if (vm.live_pass) {
            vm.checkPassIsLoading = true;
            $http.patch(envService.read('apiUrl') + '/sphere/active-password/' + vm.project._id, { password: vm.live_pass })
                .then(function(res) {
                    if (res.data.status) {
                        init();
                        vm.activePass = true;
                    } else {
                        Alertify.error('Wrong password');
                    }
                }).finally(function() {
                    vm.checkPassIsLoading = false;
                });
        } else {
            Alertify.error('Password cannot be empty');
        }
    }

    if (vm.project.password && vm.project.password.enable) {
        return;
    } else {
        vm.initHotspot = false;
        init();

    }

    function init() {
        vm.lptSphereInstance = new lptSphere(vm.project._id);

        // On livesphere change scene
        $rootScope.$on('evt.livesphere.changescene', function(e, scene) {
            if (scene._id !== vm.scene._id) {
                var vars = {};
                if (scene.target_view) {
                    vars['view.hlookat'] = scene.target_view.hlookat;
                    vars['view.vlookat'] = scene.target_view.vlookat;
                    vars['view.fov'] = scene.target_view.fov;

                    scene.target_view = null;
                } else {
                    if (scene.default_view) {
                        var vars = {};
                        vars['view.hlookat'] = scene.default_view.hlookat;
                        vars['view.vlookat'] = scene.default_view.vlookat;
                        vars['view.fov'] = (scene.default_view.fov != 120) ? scene.default_view.fov : 90;
                    }
                }

                // Init limit view
                if (scene.limit_view) {
                    vars['view.limitview'] = 'range';
                    if (scene.limit_view.bottom) vars['view.vlookatmax'] = scene.limit_view.bottom;
                    if (scene.limit_view.top) vars['view.vlookatmin'] = scene.limit_view.top;
                    if (scene.limit_view.left && scene.limit_view.right) {
                        vars['view.hlookatmin'] = scene.limit_view.left;
                        vars['view.hlookatmax'] = scene.limit_view.right;
                    }
                }
                vars['view.maxpixelzoom'] = 0;
                // Init min zoom
                vars['view.fovmin'] = scene.min_zoom || 10;

                // Init max zoom
                vars['view.fovmax'] = scene.max_zoom || 150;

                vars['krpano.sceneId'] = scene._id;
                vm.scene = scene;
                vm.lptSphereInstance.loadScene(scene.xml, vars, scene.pano_type);
                updateURLParameter('scene', vm.scene._id);
            }
        });

        if (angular.isDefined(vm.scenes)) {
            vm.scenes.sort(function(a, b) {
                return a.order_in_group - b.order_in_group;
            });

            // get first scene
            getFirstScene();

            // Set meta
            try {
                if (vm.project.meta) {
                    var meta = vm.project.meta;
                    ngMeta.setTitle(meta.title);
                    ngMeta.setTag('description', meta.description);
                    if (meta.image) {
                        var ogImage = meta.image.replace(/^https:\/\//i, 'http://');
                        ngMeta.setTag('image', ogImage);
                    } else {
                        if (vm.scene && vm.scene.pano_thumb) {
                            var ogImage = vm.scene.pano_thumb.replace(/^https:\/\//i, 'http://');
                            ngMeta.setTag('image', ogImage);
                        }
                    }
                } else {
                    ngMeta.setTitle(project.title);
                    ngMeta.setTag('description', '');
                    if (vm.scene && vm.scene.pano_thumb) {
                        var ogImage = vm.scene.pano_thumb.replace(/^https:\/\//i, 'http://');
                        ngMeta.setTag('image', ogImage);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }

        // if project have scene -> render it, else render demo cube
        if (vm.scene) {
            // if project have scene
            var defaultSettings = {};
            if (vm.scene.default_view) {
                // Set up default setting to init sphere viewer
                defaultSettings = {
                    'view.hlookat': vm.scene.default_view.hlookat,
                    'view.vlookat': vm.scene.default_view.vlookat,
                    'view.fov': (vm.scene.default_view.fov != 120) ? vm.scene.default_view.fov : 90,
                    'view.limitview': 'range'
                };

                // Set target view, when navigate from point hotspot
                if ($stateParams.target_view) {
                    defaultSettings['view.hlookat'] = $stateParams.target_view.hlookat;
                    defaultSettings['view.vlookat'] = $stateParams.target_view.vlookat;
                    defaultSettings['view.fov'] = $stateParams.target_view.fov;
                }

                // Init limit view
                if (vm.scene.limit_view) {
                    if (vm.scene.limit_view.bottom) defaultSettings['view.vlookatmax'] = vm.scene.limit_view.bottom;
                    if (vm.scene.limit_view.top) defaultSettings['view.vlookatmin'] = vm.scene.limit_view.top;
                    if (vm.scene.limit_view.left && vm.scene.limit_view.right) {
                        defaultSettings['view.hlookatmin'] = vm.scene.limit_view.left;
                        defaultSettings['view.hlookatmax'] = vm.scene.limit_view.right;
                    }
                }

                // Init min/max zoom
                defaultSettings['view.maxpixelzoom'] = 0;
                defaultSettings['view.fovmin'] = vm.scene.min_zoom || 10;
                defaultSettings['view.fovmax'] = vm.scene.max_zoom || 150;
            }
            defaultSettings['krpano.sceneId'] = vm.scene._id;
            vm.lptSphereInstance.init(sphereViewerDomId, vm.scene.xml, defaultSettings);
        } else {
            // if not, render demo cube
            vm.lptSphereInstance.init(sphereViewerDomId, envService.read('apiUrl') + '/xml-cube');
        }
        // Apply hotspots to render it
        $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

        $rootScope.$on('evt.krpano.onviewchange', function() {
            // Calculate hotspot position
            if (vm.hotspots.length != 0) {
                //vm.lptSphereInstance.updateHotspotsPosition(80);
            }
        });
    }


    function updateURLParameter(param, paramVal) {
        var url = window.location.href;
        var newAdditionalURL = "";
        var tempArray = url.split("?");
        var baseURL = tempArray[0];
        var additionalURL = tempArray[1];
        var temp = "";
        if (additionalURL) {
            tempArray = additionalURL.split("&");
            for (var i = 0; i < tempArray.length; i++) {
                if (tempArray[i].split('=')[0] != param) {
                    newAdditionalURL += temp + tempArray[i];
                    temp = "&";
                }
            }
        }

        var rows_txt = temp + "" + param + "=" + paramVal;
        url = baseURL + "?" + newAdditionalURL + rows_txt;

        window.history.replaceState(null, vm.scene.title, url);
    }

    function onxmlcomplete() {
        // On click event on sphere

        vm.lptSphereInstance.on('onclick', function() {
            $rootScope.$broadcast('evt.onsphereclick');
        });
        if (vm.scenes) {
            angular.forEach(vm.scenes, function(scene, key) {
                //vm.hotspots.concat(scene.hotspots);
                if (scene.hotspots) {
                    angular.forEach(scene.hotspots, function(hotspot, hotkey) {

                        var nameHotspot = 'lptHotspot' + hotspot._id;
                        if (!hotspot.init && scene._id == vm.scene._id) {
                            hotspot.name = nameHotspot;
                            if (vm.htmlThemes.indexOf(vm.project.theme_hotspot.slug) != -1) {
                                addHotspotToViewer(hotspot, scene._id, false, true);
                            } else {
                                addHotspotToViewer(hotspot, scene._id);
                            }

                            vm.lptSphereInstance.set('hotspot', { name: nameHotspot, visible: true });
                            hotspot.init = true;
                        } else {
                            if (vm.scene._id == scene._id) {
                                vm.lptSphereInstance.set('hotspot', { name: nameHotspot, visible: true });
                            } else {
                                vm.lptSphereInstance.set('hotspot', { name: nameHotspot, visible: false });
                            }

                        }
                        //vm.hotspots.push(hotspot);
                    });
                }
            });
        }
        //vm.initHotspot = true;
        vm.hotspots = vm.scene.hotspots; // current scene hotspots
        $scope.$digest(); // apply the changes to angular
    }

    function getFirstScene() {
        if (vm.project.groups && vm.project.groups.length) {
            vm.project.groups[0].scenes.sort(function(a, b) {
                return a.order_in_group - b.order_in_group;
            });
            vm.scene = vm.project.groups[0].scenes[0];

            if (!vm.scene) {
                vm.scenes.sort(function(a, b) {
                    return a.order_in_group - b.order_in_group;
                });
                vm.scene = vm.scenes[0];
            }
        } else {
            vm.scenes.sort(function(a, b) {
                return a.order_in_group - b.order_in_group;
            });
            vm.scene = vm.scenes[0];
        }
        if ($stateParams.scene != null) {
            vm.scene = LptHelper.getObjectBy('_id', $stateParams.scene, vm.scenes);
        }
    }

    function addHotspotToViewer(hotspot, sceneId, isVisible, isHtml) {
        if (angular.isUndefined(iconUrl)) {
            vm.themePath = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', vm.project.theme_hotspot.slug ? vm.project.theme_hotspot.slug : "default");
            var iconUrl = LptHelper.makeUrl(vm.themePath, 'images', hotspot.type + '.png');
        }
        // Apply custom hotspot icon to whole set
        try {
            var config = vm.project.theme_hotspot.config;
            if (config[hotspot.type + '_icon_custom']) {
                iconUrl = config[hotspot.type + '_icon_custom'];
                var now = new Date().getTime();
                iconUrl += '?' + now;
            }
        } catch (e) {}

        // Apply custom hotspot icon for individual hotspot
        if (angular.isDefined(hotspot.icon_custom) && hotspot.icon_custom != null && hotspot.icon_custom != '') {
            iconUrl = hotspot.icon_custom;
            var now = new Date().getTime();
            iconUrl += '?' + now;
        }

        if (hotspot.type == 'sound') {
            // iconUrl = null;
            vm.hasSound = true;
        }

        if (angular.isUndefined(isVisible)) {
            isVisible = true;
        }

        var hotspotConfig = {
            title: hotspot.title,
            name: hotspot.name,
            sceneId: sceneId,
            lpttype: hotspot.type,
            ishtml: angular.isDefined(isHtml) ? isHtml : false,
            url: iconUrl,
            alturl: iconUrl,
            ath: hotspot.position.x,
            atv: hotspot.position.y,
            width: hotspot.width,
            height: hotspot.width,
            visible: isVisible
        };
        if(isHtml == true && hotspot.type != 'sound'){
            hotspotConfig = {
                title: hotspot.title,
                name: hotspot.name,
                sceneId: sceneId,
                lpttype: hotspot.type,
                renderer: "css3d",
                url: 'assets/images/none.png',
                alturl: iconUrl,
                ath: hotspot.position.x,
                atv: hotspot.position.y,
                visible: true,
                onloaded:function(){
                    $rootScope.$broadcast('evt.krpano.hp'+hotspot.name);
                },
                ishtml: angular.isDefined(isHtml) ? isHtml : false
            };
            if( hotspot.type == "point"){

                var cloneHotspotConfig = {
                    name: 'c-'+hotspot.name,
                    hptype: 'clone',
                    sceneId: sceneId,
                    lpttype: hotspot.type,
                    ishtml: angular.isDefined(isHtml) ? isHtml : false,
                    url: iconUrl,
                    ath: hotspot.position.x,
                    atv: hotspot.position.y,
                    width: hotspot.width,
                    height: hotspot.width,
                    visible: false
                };
                vm.lptSphereInstance.addHotspot(cloneHotspotConfig);
            }
        }
        vm.lptSphereInstance.addHotspot(hotspotConfig);
    }
}
