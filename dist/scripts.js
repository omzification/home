;(function() {
"use strict";

angular.module('lapentor.livesphere', [
    'LapentorSphere',
    'lapentor.marketplace.plugins',
    'lapentor.marketplace.themes'
]);
}());

;(function() {
"use strict";

LiveSphereCtrl.$inject = ["$timeout", "$scope", "$rootScope", "$translate", "envService", "$stateParams", "ngMeta", "lptSphere", "LptHelper", "$http", "Alertify", "project"];
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
}());

;(function() {
"use strict";

LiveSphere.$inject = ["$q", "$http", "envService"];
angular.module('lapentor.livesphere')
    .factory('LiveSphere', LiveSphere);

function LiveSphere($q, $http, envService) {
    var service = {
        getProject: getProject,
    };

    return service;

    ///////// API calls

    function getProject(slug) {
        var d = $q.defer();
        if (LPT_OFFLINE_MODE) {
            var endpoint = 'db.php';
        } else {
            var endpoint = 'https://tour-api.lapentor.com/api/v1/sphere/' + slug;
            // var endpoint = envService.read('apiUrl') + '/sphere/' + slug;
        }
        $http.get(endpoint)
            .then(function(res) {
                d.resolve(res.data);
            }, function(res) {
                d.reject(res);
            });

        return d.promise;
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins', [
    'LapentorSphere',
    'pst.utils',
]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.themes', [
    'ngSanitize',
    'LapentorSphere',
    'ngAudio'
]);
}());

;(function() {
"use strict";

angular.module('pst.utils', []);
}());

;(function() {
"use strict";

env.$inject = ["envServiceProvider"];
intercom.$inject = ["$intercomProvider", "CONST"];
routes.$inject = ["$stateProvider", "$urlRouterProvider", "$locationProvider"];
auth.$inject = ["$authProvider", "$httpProvider", "envServiceProvider"];
meta.$inject = ["ngMetaProvider"];
translation.$inject = ["$translateProvider"];
requireLogin.$inject = ["$q", "$auth", "$state", "$timeout"];
redirectIfLoggedIn.$inject = ["$q", "$auth", "$state", "$timeout"];
angular.module('lapentor.app', [
        'oc.lazyLoad',
        'ngCookies',
        'ui.bootstrap',
        'ngResource',
        'ngSanitize',
        'ui.router',
        'satellizer',
        'ngMeta',
        'Alertify',
        'ngFileUpload',
        'angular-nicescroll',
        'ngDragDrop',
        'ui.sortable',
        '720kb.socialshare',
        'pasvaz.bindonce',
        'ngIntercom',
        'LapentorSphere',
        'pst.utils',
        'lapentor.marketplace.themes',
        'lapentor.marketplace.plugins',
        'lapentor.livesphere',
        'toggle-switch',
        'monospaced.qrcode',
        'environment',
        'infinite-scroll',
        'pascalprecht.translate'
    ])
    .constant('CONST', {
        export_price: 10,
        intercom_app_id: 'nszgonve'
    })
    .config(env)
    .config(intercom)
    .config(routes)
    .config(auth)
    .config(meta)
    .config(translation)
    .run(["ngMeta", "$rootScope", function(ngMeta, $rootScope) {
        $rootScope.changeSceneEffect = 'NOBLEND';
        ngMeta.init();
    }]);

///////////////

function translation($translateProvider) {
    var translationsEN = {
        ACTIVE_GYRO: "Do you want to allow {{ permissionTitle }} on this device?",
        ALLOW: "Allow",
        CANCEL: "Cancel"
    };

    var translationsIT = {
        ACTIVE_GYRO: 'Vuoi attivare il {{ permissionTitle }} su questo dispositivo?',
        ALLOW: "Attiva",
        CANCEL: "Annulla"
    };

    // add translation table
    $translateProvider
    .translations('en', translationsEN)
    .translations('it', translationsIT)
    .preferredLanguage('en');
}

function meta(ngMetaProvider) {
    ngMetaProvider.setDefaultTitle('Lapentor - 360° VR publishing tool for panoramic photographers & agencies');
}

function env(envServiceProvider) {
    // set the domains and variables for each environment
    envServiceProvider.config({
        domains: {
            development: ['localhost:3000'],
            production: ['app.lapentor.com', '360.goterest.com'],
            staging: ['stagingapp-lapentor-com.herokuapp.com']
        },
        vars: {
            development: {
                apiUrl: 'https://api.lapentor.com/api/v1',
                siteUrl: 'http://localhost:3000',
                planMonthly: 25,
                planYearly: 250
            },
            production: {
                apiUrl: 'https://api.lapentor.com/api/v1',
                siteUrl: 'https://app.lapentor.com',
                planMonthly: 25,
                planYearly: 250
            },
            staging: {
                apiUrl: 'http://apistaging.lapentor.com/api/v1',
                siteUrl: 'http://stagingapp-lapentor-com.herokuapp.com',
                planMonthly: 25,
                planYearly: 250
            }
        }
    });

    // run the environment check, so the comprobation is made
    // before controllers and services are built
    envServiceProvider.check();
}

function intercom($intercomProvider, CONST) {
    // Either include your app_id here or later on boot
    $intercomProvider
        .appID(CONST.intercom_app_id);

    // you can include the Intercom's script yourself or use the built in async loading feature
    $intercomProvider
        .asyncLoading(true);
}

function auth($authProvider, $httpProvider, envServiceProvider) {
    $authProvider.loginUrl = envServiceProvider.read('apiUrl') + '/auth/login';
    $httpProvider.interceptors.push('lptInterceptor');
    //49245343276-l6c6uo54kompfe7co88rqggs9e7n8dld.apps.googleusercontent.com
    $authProvider.facebook({
        clientId: '292750687798001',
        url: envServiceProvider.read('apiUrl') + '/auth/login-facebook',
        scope: ['email', 'public_profile'],
        scopeDelimiter: ','
    });

    $authProvider.google({
        clientId: '49245343276-l6c6uo54kompfe7co88rqggs9e7n8dld.apps.googleusercontent.com',
        name: 'google',
        url: envServiceProvider.read('apiUrl') + '/auth/login-google'
    });
}

function routes($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $stateProvider
        .state('index', {
            url: LPT_OFFLINE_MODE ? 'any' : '/',
            templateUrl: 'modules/lapentor.app/views/pages/dashboard.html',
            controller: 'DashboardCtrl',
            controllerAs: 'vm',
            resolve: {
                requireLogin: requireLogin,
                projects: ["Project", function(Project) {
                    return Project.all(0, 9);
                }],
                user: ["$stateParams", "User", function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }]
            }
        })
        .state('edit-profile', {
            url: '/profile',
            controller: 'ProfileCtrl',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.app/views/pages/profile.html',
            params: {
                user: null
            },
            resolve: {
                requireLogin: requireLogin,
                user: ["$stateParams", "User", function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }],
                // invoices: function($stateParams, User) {
                //     return User.getInvoices();
                // }
            }
        })
        .state('project', {
            abstract: true,
            url: '/project/:id',
            template: '<ui-view></ui-view>',
            resolve: {
                requireLogin: requireLogin,
                project: ["$stateParams", "$auth", "Project", function($stateParams, $auth, Project) {
                    if ($auth.isAuthenticated()) {
                        return Project.get($stateParams.id);
                    }
                }]
            }
        })
        .state('project.editor', {
            url: '/editor/scene/:scene_id',
            templateUrl: 'modules/lapentor.app/views/pages/project.editor.html',
            controller: 'ProjectEditorCtrl',
            controllerAs: 'vm',
            resolve: {
                loadEditorExternalModules: ["$ocLazyLoad", function($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        'bower_components/angularjs-slider/dist/rzslider.min.js',
                        'bower_components/summernote/dist/summernote.min.js',
                        'bower_components/angular-summernote/dist/angular-summernote.min.js',
                        'bower_components/angular-bootstrap-contextmenu/contextMenu.js',
                        'bower_components/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.min.js',
                    ]);
                }],
                user: ["$stateParams", "User", function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }]
            }
        })
        .state('sphere', {
            // url: '/sphere/:project_slug?scene',
            url: LPT_OFFLINE_MODE ? '/?scene' : '/sphere/:project_slug?scene',
            templateUrl: 'modules/lapentor.livesphere/livesphere.html',
            controller: 'LiveSphereCtrl',
            controllerAs: 'vm',
            reloadOnSearch: false,
            params: {
                scene: null,
                project: null,
                target_view: null
            },
            resolve: {
                project: ["$stateParams", "LiveSphere", function($stateParams, LiveSphere) {
                    if (!angular.isObject($stateParams.project)) { // check if scenes already passed in $stateParams
                        return LiveSphere.getProject($stateParams.project_slug);
                    } else {
                        return $stateParams.project;
                    }
                }]
            }
        })
        .state('showcase', {
            url: '/u/:username',
            templateUrl: 'modules/lapentor.app/views/pages/showcase.html',
            controller: 'ShowcaseCtrl',
            controllerAs: 'vm',
            resolve: {
                user: ["$stateParams", "Showcase", function($stateParams, Showcase) {
                    return Showcase.get($stateParams.username);
                }]
            }
        })
        .state('login', {
            url: '/auth',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'login'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('register', {
            url: '/auth/register',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'register'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('register-old', {
            url: '/register',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'register'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('forgot-password', {
            url: '/auth/forgot-password',
            templateUrl: 'modules/lapentor.app/views/pages/auth/forgot-password.html',
            controller: 'ForgotPasswordCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('reset-password', {
            url: '/auth/reset-password?token',
            templateUrl: 'modules/lapentor.app/views/pages/auth/reset-password.html',
            controller: 'ResetPasswordCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('activate', {
            url: '/register/activate-account?token',
            templateUrl: 'modules/lapentor.app/views/pages/auth/activate.html',
            controller: 'ActivateAccountCtrl',
            controllerAs: 'vm'
        })
        .state('resend-activation-code', {
            url: '/register/resend-activation-code',
            templateUrl: 'modules/lapentor.app/views/pages/auth/resend-activation-code.html',
            controller: 'ResendActivateAccountCtrl',
            controllerAs: 'vm'
        })
        .state('logout', {
            url: '/logout',
            template: null,
            controller: ["$auth", "$state", function($auth, $state) {
                $auth.logout();
                $state.go('login');
            }]
        })
        .state('404', {
            url: '/404',
            templateUrl: '404.html',
        });

    $urlRouterProvider.otherwise('/404');
}

function redirectIfLoggedIn($q, $auth, $state, $timeout) {
    var defer = $q.defer();
    if ($auth.isAuthenticated()) {
        $timeout(function() {
            // This code runs after the authentication promise has been rejected.
            // Go to the log-in page
            $state.go('index');
        });
        defer.reject();
    } else {
        defer.resolve();
    }
    return defer.promise;
}

function requireLogin($q, $auth, $state, $timeout) {
    var defer = $q.defer();
    if (!$auth.isAuthenticated()) {
        // The next bit of code is asynchronously tricky.
        $timeout(function() {
            // This code runs after the authentication promise has been rejected.
            // Go to the log-in page
            $state.go('login');
            // Reject the authentication promise to prevent the state from loading
        });
        defer.reject();
    } else {
        defer.resolve();
    }

    return defer.promise;
}
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive('bgSrc', ["$rootScope", "$timeout", function($rootScope, $timeout) {

        return function(scope, element, attrs) {
            var url = attrs.bgSrc;
            if (url) {
                element.css({
                    'background-image': 'url("' + url + '")'
                });
            }
        }
    }]);
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive('clickOutside', ['$document', '$parse', '$timeout', clickOutside]);

function clickOutside($document, $parse, $timeout) {
    return {
        restrict: 'A',
        link: function($scope, elem, attr) {

            // postpone linking to next digest to allow for unique id generation
            $timeout(function() {
                var classList = (attr.outsideIfNot !== undefined) ? attr.outsideIfNot.replace(', ', ',').split(',') : [],
                    fn;

                // add the elements id so it is not counted in the click listening
                if (attr.id !== undefined) {
                    classList.push(attr.id);
                }

                function eventHandler(e) {

                    // check if our element already hidden and abort if so
                    if (angular.element(elem).hasClass("ng-hide")) {
                        return;
                    }

                    var i = 0,
                        element;

                    // if there is no click target, no point going on
                    if (!e || !e.target) {
                        return;
                    }

                    // loop through the available elements, looking for classes in the class list that might match and so will eat
                    for (element = e.target; element; element = element.parentNode) {
                        var id = element.id,
                            classNames = element.className,
                            l = classList.length;

                        // Unwrap SVGAnimatedString classes
                        if (classNames && classNames.baseVal !== undefined) {
                            classNames = classNames.baseVal;
                        }

                        // loop through the elements id's and classnames looking for exceptions
                        for (i = 0; i < l; i++) {
                            // check for exact matches on id's or classes, but only if they exist in the first place
                            if ((id !== undefined && id === classList[i]) || (classNames && classNames === classList[i])) {
                                // now let's exit out as it is an element that has been defined as being ignored for clicking outside
                                return;
                            }
                        }
                    }

                    // if we have got this far, then we are good to go with processing the command passed in via the click-outside attribute
                    $scope.$apply(function() {
                        fn = $parse(attr['clickOutside']);
                        fn($scope);
                    });
                }

                // if the devices has a touchscreen, listen for this event
                if (_hasTouch()) {
                    $document.on('touchstart', eventHandler);
                }

                // still listen for the click event even if there is touch to cater for touchscreen laptops
                $document.on('click', eventHandler);

                // when the scope is destroyed, clean up the documents event handlers as we don't want it hanging around
                $scope.$on('$destroy', function() {
                    if (_hasTouch()) {
                        $document.off('touchstart', eventHandler);
                    }

                    $document.off('click', eventHandler);
                });

                // private function to attempt to figure out if we are on a touch device
                function _hasTouch() {
                    // works on most browsers, IE10/11 and Surface
                    return 'ontouchstart' in window || navigator.maxTouchPoints;
                };
            });
        }
    };
}
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive('compile', ['$compile', function($compile) {
        return function(scope, element, attrs) {
            scope.$watch(
                function(scope) {
                    // watch the 'compile' expression for changes
                    return scope.$eval(attrs.compile);
                },
                function(value) {
                    // when the 'compile' expression changes
                    // assign it into the current DOM
                    element.html(value);

                    // compile the new DOM and link it to the current
                    // scope.
                    // NOTE: we only compile .childNodes so that
                    // we don't get into infinite loop compiling ourselves
                    $compile(element.contents())(scope);
                }
            );
        };
    }])
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive('hoverClass', function() {
        return {
            restrict: 'A',
            scope: {
                hoverClass: '@'
            },
            link: function(scope, element) {
                element.on('mouseenter', function() {
                    element.addClass(scope.hoverClass);
                });
                element.on('mouseleave', function() {
                    element.removeClass(scope.hoverClass);
                });
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive("loadingSrc", function() {
        return {
            link: function(scope, element, attrs) {
                var img, loadImage;
                img = null;
                loadImage = function() {
                    element[0].src = "bower_components/SVG-Loaders/svg-loaders/puff-dark.svg";

                    img = new Image();
                    img.src = attrs.loadingSrc;

                    img.onload = function() {
                        element[0].src = attrs.loadingSrc;
                    };
                };

                scope.$watch(function() {
                    return attrs.loadingSrc;
                }, function(newVal, oldVal) {
                    loadImage();
                });
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .directive('selectOnClick', ['$window', function($window) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.on('click', function() {
                    if (!$window.getSelection().toString()) {
                        // Required for mobile Safari
                        this.setSelectionRange(0, this.value.length)
                    }
                });
            }
        };
    }]);
}());

;(function() {
"use strict";

/**
 * This directive will be used on live sphere only
 */
angular.module('lapentor.marketplace.plugins')
    .directive('plugin', ["$compile", "LptHelper", function($compile, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=', // optional, current scene
                plugin: '=', // plugin
                project: '=', // all project data
                lptsphereinstance: '=' // lptSphere instance to manipulate sphere
            },
            link: function(scope, element, attrs) {
                generateDirective(scope.plugin.slug);

                /////////////

                // Generate installed plugin directive
                function generateDirective(pluginId) {
                    var directiveName = 'plugin-' + pluginId;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'pluginVm',
            controller: ["$scope", function($scope) {
                // All variables, functions below will be inherited by all plugins
                var pluginVm = this;

                /**
                 * Plugin info
                 * @type {object}
                 */
                pluginVm.plugin = $scope.plugin;

                /**
                 * Project data
                 * @type {object}
                 */
                pluginVm.project = $scope.project;

                /**
                 * Plugin config, get from database
                 * @type {object}
                 */
                pluginVm.config = getConfig();

                /**
                 * Current scene info, get from database
                 * @type {object}
                 */
                pluginVm.scene = $scope.scene;

                /**
                 * lptSphere instance
                 * src: lapentor_krpano.js
                 * @type {angular service}
                 */
                pluginVm.lptsphereinstance = $scope.lptsphereinstance;

                /**
                 * Path to plugin folder on disk
                 * @type {string}
                 */
                pluginVm.pluginPath = Config.PLUGIN_PATH + $scope.plugin.slug;

                pluginVm.initDefaultConfig = initDefaultConfig;

                //////////////

                function initDefaultConfig(configModel, defaultConfig) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
                /**
                 * Get plugin config from {project} data object
                 * @return {object}
                 */
                function getConfig() {
                    var config = {};
                    if (angular.isDefined($scope.project.plugins)) {
                        angular.forEach($scope.project.plugins, function(pl) {
                            if ($scope.plugin.slug == pl.slug) {
                                config = pl.config;
                                if (typeof config == 'undefined') config = {};
                            }
                        });
                    }

                    return config;
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

angular.module('pst.utils')
    .filter('formatNumber', function() {
        return function(input) {
            if (angular.isUndefined(input)) return "00";
            if (input >= 10) return input;

            return "0" + input;
        }
    })
    .filter('parseEmbed', function() {
        return function(input) {
            function convertMedia(html) {
                try {
                    var pattern1 = /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g;
                    var pattern2 = /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
                    var pattern3 = /([-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?(?:jpg|jpeg|gif|png))/gi;

                    if (pattern1.test(html)) {
                        var replacement = '<iframe width="100%" height="345" src="//player.vimeo.com/video/$1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';

                        var html = html.replace(pattern1, replacement);
                    }


                    if (pattern2.test(html)) {
                        var replacement = '<iframe width="100%" height="345" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>';
                        var html = html.replace(pattern2, replacement);
                    }


                    if (pattern3.test(html)) {
                        var replacement = '<a href="$1" target="_blank"><img class="sml" src="$1" /></a><br />';
                        var html = html.replace(pattern3, replacement);
                    }
                }catch(e){
                    return false;
                }
                return html;
            }

            return convertMedia(input);
        }
    });
}());

;(function() {
"use strict";

LptHelper.$inject = ["$http", "$controller", "$rootScope"];
angular.module('pst.utils')
    .service('LptHelper', LptHelper);

function LptHelper($http, $controller, $rootScope) {
    var service = {
        isEmpty: isEmpty,
        getObjectBy: getObjectBy,
        deleteObjectFromArray: deleteObjectFromArray,
        deleteObjectFromArrayBy: deleteObjectFromArrayBy,
        makeUrl: makeUrl,
        stickElementWithHotspot: stickElementWithHotspot,
        capitalizeFirstLetter: capitalizeFirstLetter,
        isControllerExist: isControllerExist,
        extendObject: extendObject,
        getNextScene: getNextScene,
        getPrevScene: getPrevScene,
        initDefaultConfig: initDefaultConfig,
        sortByValue: sortByValue,
        inIframe: inIframe,
        checkHotspotPassword: checkHotspotPassword,
        validateEmail: validateEmail
    };

    return service;

    function sortByValue(arr, key) {
        arr.sort(function(a, b) {
            return a[key] - b[key];
        });
    }

    function inIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function initDefaultConfig(defaultConfig, configModel) {
        // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
        angular.forEach(defaultConfig, function(val, key) {
            configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
        });
    }

    function getNextScene(currentScene, project) {
        if (project.groups.length == 0) {
            // No group
            try {
                return project.scenes[$.inArray(currentScene, project.scenes) + 1];
            } catch (e) {
                console.error(e);
                return null;
            }
        } else {
            // Have group
            var nextScene = null;
            angular.forEach(project.groups, function(group, groupIdx) {
                angular.forEach(group.scenes, function(scene, idx) {
                    if (currentScene._id == scene._id) {
                        if (idx < group.scenes.length - 1) {
                            nextScene = group.scenes[idx + 1];
                            return;
                        } else {
                            try {
                                if (groupIdx < project.groups.length - 1) {
                                    nextScene = project.groups[groupIdx + 1].scenes[0];
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    }
                });
            });
            return nextScene;
        }
    }

    function getPrevScene(currentScene, project) {
        if (project.groups.length == 0) {
            // No group
            try {
                return project.scenes[$.inArray(currentScene, project.scenes) - 1];
            } catch (e) {
                console.error(e);
                return null;
            }
        } else {
            // Have group
            var prevScene = null;
            angular.forEach(project.groups, function(group, groupIdx) {
                angular.forEach(group.scenes, function(scene, idx) {
                    if (currentScene._id == scene._id) {
                        if (idx > 0) {
                            prevScene = group.scenes[idx - 1];
                            return;
                        } else {
                            try {
                                if (groupIdx > 0) {
                                    prevScene = project.groups[groupIdx - 1].scenes[project.groups[groupIdx - 1].scenes.length - 1];
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    }
                });
            });
            return prevScene;
        }
    }

    function extendObject(original, destination) {
        var obj3 = {};
        for (var attrname in original) { obj3[attrname] = original[attrname]; }
        for (var attrname in destination) { obj3[attrname] = destination[attrname]; }
        return obj3;
    }

    function isControllerExist(controllerName) {
        if (typeof window[controllerName] == 'function') {
            return true;
        }
        try {
            $controller(controllerName);
            return true;
        } catch (error) {
            return (!(error instanceof TypeError));
        }

        return false;
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function stickElementWithHotspot(elementSelector, hotspotName, lptsphereinstance, adjustX, adjustY) {
        if (!adjustX) adjustX = 0;
        if (!adjustY) adjustY = 0;

        var x = lptsphereinstance.getHotspotParam(hotspotName, 'ath'),
            y = lptsphereinstance.getHotspotParam(hotspotName, 'atv');

        var Sphere = lptsphereinstance.spheretoscreen(x, y);
        angular.element(elementSelector)
            .css("transform", "translate(" + (Sphere.x + adjustX) + "px," + (Sphere.y + adjustY) + "px)")
            .css("transform", "-webkit-translate(" + (Sphere.x + adjustX) + "px," + (Sphere.y + adjustY) + "px)")
            .css("transform", "-ms-translate(" + (Sphere.x + adjustX) + "px," + (Sphere.y + adjustY) + "px)")
            .css("transform", "-moz-translate(" + (Sphere.x + adjustX) + "px," + (Sphere.y + adjustY) + "px)");
    }

    function isEmpty(attr) {
        return (angular.isUndefined(attr) || attr == '' || attr == null);
    }

    function getObjectBy(needle, needleVal, haystack, defaultVal) {
        var result = defaultVal ? defaultVal : {};
        angular.forEach(haystack, function(item) {
            if (needleVal == item[needle]) {
                result = item;
                return;
            }
        });

        return result;
    }

    function deleteObjectFromArray(obj, arr) {
        angular.forEach(arr, function(item, index) {
            if (JSON.stringify(item) === JSON.stringify(obj)) arr.splice(index, 1);
        });

        return arr;
    }

    function deleteObjectFromArrayBy(attr, attrVal, arr) {
        angular.forEach(arr, function(item, index) {
            if (item[attr] == attrVal) {
                arr.splice(index, 1);
                return;
            }
        });

        return arr;
    }

    function makeUrl() {
        var url = '';
        var args = Array.prototype.slice.call(arguments);
        for (var i in args) {
            if (i < args.length - 1) {
                url += args[i] + '/';
            } else {
                url += args[i];
            }
        }
        url = url.replace(/([^:]\/)\/+/g, "$1");
        return url;
    }

    function checkHotspotPassword(hotspot, successCallback) {
        if (hotspot.password) {
            $rootScope.$broadcast('evt.showPrompt', {
                title: 'Password',
                placeholder: 'Enter password'
            });

            var listenPromptSubmit = $rootScope.$on('evt.submitPrompt', function(ev, hotspotPass) {
                if (hotspotPass === hotspot.password) {
                    $rootScope.$broadcast('evt.hidePrompt');

                    successCallback();
                } else {
                    $rootScope.$broadcast('evt.showPrompt', {
                        title: 'Password',
                        placeholder: 'Enter password',
                        msg: 'Wrong password'
                    });
                }

                listenPromptSubmit();
            });
        } else {
            successCallback();
        }
    }

    function validateEmail(email) {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}
}());

;(function() {
"use strict";

ActivateAccountCtrl.$inject = ["$scope", "$stateParams", "$state", "AuthSrv", "$interval"];
angular.module('lapentor.app')
    .controller('ActivateAccountCtrl', ActivateAccountCtrl);

function ActivateAccountCtrl($scope, $stateParams, $state, AuthSrv, $interval) {
    var vm = this;
    var countdownInterval = null;
    vm.message = 'Activating your account now';
    vm.isLoading = true;

    AuthSrv.activate($stateParams.token).then(function(res) {
        vm.activated = true;
        vm.countdown = 10;
        countdownInterval = $interval(function() {
            if (vm.countdown > 0) {
                vm.countdown -= 1;
            } else {
                $interval.cancel(countdownInterval);
                $state.go('login');
            }
        }, 1000);
    }).catch(function (message) {
    	vm.message = message;
    }).finally(function () {
    	vm.isLoading = false;
    });
}
}());

;(function() {
"use strict";

DashboardCtrl.$inject = ["$scope", "$rootScope", "$state", "$intercom", "$timeout", "Project", "user", "Alertify", "projects", "$ocLazyLoad", "CONST"];
angular.module('lapentor.app')
    .controller('DashboardCtrl', DashboardCtrl);

function DashboardCtrl($scope, $rootScope, $state, $intercom, $timeout, Project, user, Alertify, projects, $ocLazyLoad, CONST) {
    var vm = this;
    var searchChangeTimeoutPromise;
    vm.user = {};
    vm.export = {
        completed: false
    };
    vm.showExportLoading = false;
    vm.newProject = {};
    vm.projects = projects;
    vm.new_projects = projects;
    vm.isLoading = false;
    vm.isSearch = false;
    vm.notFound = false;
    vm.showFluidLoading = false;

    vm.createProject = createProject;
    vm.deleteProject = deleteProject;
    vm.duplicateProject = duplicateProject;
    vm.downloadProject = downloadProject;
    vm.openProjectSettingModal = openProjectSettingModal;
    vm.openProjectShareModal = openProjectShareModal;
    vm.exportProject = exportProject;

    ///////////////////
    var cur = 1;
    var run = true;
    var end = false;
    vm.isLoadMore = false;
    vm.loadMore = function() {
        if(run == true && end == false){
            run = false;
            vm.isLoadMore = true;
            Project.all((9*cur), 9, vm.searchText).then(function(res) {
                if(res.length == 0) {
                    end = true;
                }
                if(res.length > 0){
                    vm.new_projects = vm.new_projects.concat(res);
                    cur++;
                }
                vm.projects = vm.new_projects;
                vm.notFound = false;
                if(vm.projects.length == 0 && vm.isSearch == true){
                    vm.notFound = true;
                }
            }, function(res) {

            }).finally(function() {
                run = true;
                vm.isLoadMore = false;
                vm.isSearch = false;
            });
        }
    };

    $scope.$watch('vm.searchText', function(newVal, oldVal) {
        if (newVal != oldVal) {
            vm.isSearch = true;
            if (searchChangeTimeoutPromise) $timeout.cancel(searchChangeTimeoutPromise);
            searchChangeTimeoutPromise = $timeout(function() {
                cur = 0;
                end = false;
                vm.new_projects = [];
                vm.loadMore();
            }, 1000);
        }
    });

    // User.get().then(function(user) {
        // vm.user = {};
        vm.user = user;
        var intercomUser = {
            email: user.email,
            name: user.username,
            user_id: user._id,
            created_at: user.created_at
        };
        $intercom.update(intercomUser);
    // });

    $scope.$on('user.update', function (event, user) {
        vm.user = user;
    });

    /////////// Functions declaration

    function resetExportLoading() {
        vm.export = {
            completed: false,
        };
    }

    function downloadProject(project) {
        if(project.downloadable) {
            resetExportLoading();
            vm.export.project = project;
            vm.showExportLoading = true;

            doExportProject(project._id);
        }else {
            Alertify.confirm('You will be charged $' + CONST.export_price + ' to download this project. <br> Do you want to continue?').then(
                function onOk() {
                    resetExportLoading();
                    vm.export.project = project;
                    vm.showExportLoading = true;

                    if (user.subscribed) {
                        doExportProject(project._id);
                    } else {
                        showDownloadPaymentForm(project._id);
                    }
                },
                function onCancel() { }
            );
        }
    }

    function doExportProject(id) {
        Project.download(id).then(function (res) {
            if(res.download_link) {
                vm.export.download_link = res.download_link;
                vm.export.completed = true;
                vm.export.size = res.size;
                // window.open(res.download_link, '_blank');
            }else{
                Alertify.error('Failed to export project. Please try again or contact our support');
            }
            switch(res.status) {
                case 1:
                    vm.export.download_link = res.download_link;
                    vm.export.completed = true;
                    break;
                case 0: // on trial
                    // show payment form
                    showDownloadPaymentForm(id);
                    break;
                case -1: // payment failed
                    // show payment form
                    showDownloadPaymentForm(id);
                    break;
                default: // project or user doesn't exist
                    Alertify.error(res.msg);
                    break;
            }
        }, function (err) {
            console.log(err);
            vm.showExportLoading = false;
            Alertify.error('Can not download project. Please try again');
        }).finally(function () {
            vm.showFluidLoading = false;
        });
    }

    function showDownloadPaymentForm(project_id) {
        $ocLazyLoad.load('https://checkout.stripe.com/checkout.js').then(function() {
            var handler = StripeCheckout.configure({
                key: STRIPE_KEY,
                image: 'assets/images/logo-circle.png',
                locale: 'auto',
                token: function(token) {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.

                    vm.showFluidLoading = true;
                    Project.download(project_id, token.id, token.email).then(function (res) {
                        if(res.status == 1) {
                            window.open(res.download_link,'_blank');
                        }else{
                            Alertify.error('Can not export project. Please try again or contact us');
                        }
                    }, function (err) {
                        console.log(err);
                    }).finally(function () {
                        vm.showFluidLoading = false;
                    });
                }
            });

            handler.open({
                name: 'Lapentor',
                description: 'one time export',
                amount: CONST.export_price * 100
            });
            // Close Checkout on page navigation:
            window.addEventListener('popstate', function() {
                handler.close();
            });
        });
    }

    function duplicateProject(id) {
        vm.showFluidLoading = true;
        Project.duplicate(id).then(function (res) {
            vm.projects.unshift(res);
        }, function () {
            Alertify.error('Can not duplicate project. Please try again');
        }).finally(function () {
            vm.showFluidLoading = false;
        });
    }

    function exportProject(id) {
    }

    function openProjectSettingModal(project) {
        $rootScope.$emit('evt.openProjectSettingModal', project);
    }

    function openProjectShareModal(project) {
        $rootScope.$emit('evt.openProjectShareModal', project);
    }

    function createProject() {
        Alertify.prompt('Create new project', 'Untitled').then(
            function(title) {
                vm.newProject.title = title;
                Project.create(vm.newProject).then(function(res) {
                    // Go to project edit page
                    $timeout(function() {
                        $state.go('project.editor', { id: res.data.project._id });
                    });
                }, function(res) {
                    Alertify.error('You account is exceeded limit for create new project. Please subscribe to unlock.');
                }).finally(function() {
                    vm.isLoading = false;
                });
            }
        );
    }

    // Delete project by id
    function deleteProject(id, indexInArray) {
        Alertify.confirm('Are you sure? All data will be LOST.').then(function() {
            vm.showFluidLoading = true;
            // Remove on server
            Project.remove(id).then(function(res) {
                if (res.data.status == 1) {
                    vm.projects.splice(indexInArray, 1);
                } else {
                    Alertify.error('Can not delete project');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not delete project');
            }).finally(function() {
                vm.showFluidLoading = false;
            });
        });
    }
}
}());

;(function() {
"use strict";

ExportedProjectCtrl.$inject = ["$scope", "$rootScope", "Alertify", "envService", "user"];
angular.module('lapentor.app')
    .controller('ExportedProjectCtrl', ExportedProjectCtrl);

function ExportedProjectCtrl($scope, $rootScope, Alertify, envService, user) {
    var vm = this;
    vm.user = user;
}
}());

;(function() {
"use strict";

ForgotPasswordCtrl.$inject = ["$scope", "$state", "$timeout", "AuthSrv", "Alertify"];
angular.module('lapentor.app')
    .controller('ForgotPasswordCtrl', ForgotPasswordCtrl);

function ForgotPasswordCtrl($scope, $state, $timeout, AuthSrv, Alertify) {
    var vm = this;
    vm.email = null;
    vm.submit = submit;
    vm.forgotForm = $scope.forgotForm;
    vm.isLoading = false;

    function submit() {
        if (vm.forgotForm.$valid) {
            if(vm.isLoading) return; // prevent repeated click
            vm.isLoading = true;
            
            AuthSrv.sendResetLink(vm.email).then(function (res) {
                vm.email = null;
                vm.message = 'Please check your email and click on the link to reset your password';
            }).finally(function () {
                vm.isLoading = false;
            });
        }
    }
}
}());

;(function() {
"use strict";

LoginCtrl.$inject = ["$scope", "$resource", "$rootScope", "$stateParams", "$state", "$timeout", "$auth", "AuthSrv", "Alertify", "ngMeta"];
angular.module('lapentor.app')
    .controller('LoginCtrl', LoginCtrl);

function LoginCtrl($scope, $resource, $rootScope, $stateParams, $state, $timeout, $auth, AuthSrv, Alertify, ngMeta) {
    ngMeta.setTitle('Lapentor.com - The first and only CMS for Sphere photo you ever need');
    var vm = this;
    $scope.auth = {};
    vm.user = {};
    vm.tab = $stateParams.tab?$stateParams.tab:'login';

    vm.submitLogin = submitLogin;
    vm.submitLoginSocial = submitLoginSocial;
    vm.submitRegister = submitRegister;

    vm.loginForm = $scope.loginForm;
    vm.registerForm = $scope.registerForm;

    vm.isLoading = false;

    /////////

    function submitLoginSocial(provider) {
        if (vm.isFullLoading) return;
        vm.isFullLoading = true;
        $auth.authenticate(provider)
            .then(function(res) {
                    $timeout(function() {
                        $state.go('index');
                    });
            }, function(res) {
                // Handle errors here, such as displaying a notification
                if (res.status == 400) {
                    // Alertify.error('Your account is not activated yet. Check your email to activate your account first');
                    vm.accountNotActivated = true;

                    $timeout(function() {
                        vm.accountNotActivated = false;
                    }, 10000);
                }
            }).finally(function() {
                vm.isFullLoading = false;
            });
    };

    function submitLogin() {
        if (vm.loginForm.$valid) {
            if (vm.isLoading) return;
            vm.isLoading = true;
            $auth.login(vm.user)
                .then(function(res) {
                    if (!res.data.status) {
                        Alertify.error('Wrong username / password');
                    } else {
                        $timeout(function() {
                            $state.go('index');
                        });
                    }
                }, function(res) {
                    // Handle errors here, such as displaying a notification
                    if (res.status == 400) {
                        // Alertify.error('Your account is not activated yet. Check your email to activate your account first');
                        vm.accountNotActivated = true;

                        $timeout(function() {
                            vm.accountNotActivated = false;
                        }, 10000);
                    }
                }).finally(function() {
                    vm.isLoading = false;
                });
        }
    }

    function submitRegister() {
        if (vm.registerForm.$valid) {
            vm.isLoading = true;

            AuthSrv.register(vm.user).then(function(res) {
                    vm.shouldShowWelcome = true;
                    vm.user = {};
                }).catch(function(res) {
                    if (res.status == 400) {
                        // validation error, display error message
                        var errors = res.data.errors.message;
                        angular.forEach(errors, function(msg) {
                            Alertify.error(msg[0]);
                        });
                    }
                })
                .finally(function() {
                    vm.isLoading = false;
                });
        }
    }
}
}());

;(function() {
"use strict";

/**
 * Events fired in this controller:
 * evt.openMediaLib: fired when open media library
 */
MediaLibraryCtrl.$inject = ["$scope", "$rootScope", "$uibModal", "User"];
MediaLibraryModalCtrl.$inject = ["$scope", "$timeout", "$filter", "$state", "$rootScope", "$uibModalInstance", "Media", "user", "Alertify", "Scene"];
angular.module('lapentor.app')
    .controller('MediaLibraryCtrl', MediaLibraryCtrl)
    .controller('MediaLibraryModalCtrl', MediaLibraryModalCtrl);

function MediaLibraryCtrl($scope, $rootScope, $uibModal, User) {
    var vm = this;
    ////////////////
    // Listen for open media lib event
    $scope.$on('evt.openMediaLib', function _openMediaLib(event, payload) {
        if (payload) {
            if (payload.makePanoCallback) $scope.makePanoCallback = payload.makePanoCallback; // callback function after make pano success
            if (payload.chooseAssetCallback) $scope.chooseAsset = payload.chooseAssetCallback; // callback function after choosed assets
            if (payload.canelMediaLibCallback) $scope.canelMediaLib = payload.canelMediaLibCallback;
            if (payload.tab) $scope.currentFileType = payload.tab; // open pano or asset tab as default
            if (payload.isReplacePano) {
                $scope.isReplacePano = payload.isReplacePano; // replace or make pano
                $scope.sceneId = payload.sceneId; // scene id to replace
            }
            if (angular.isDefined(payload.canChooseMultipleFile)) {
                $scope.canChooseMultipleFile = payload.canChooseMultipleFile; // choose single file or multiple
            } else {
                $scope.canChooseMultipleFile = true;
            }
        }

        var mediaLibraryModal = $uibModal.open({
            size: 'lg',
            animation: false,
            templateUrl: "modules/lapentor.app/views/partials/media_library.html",
            controller: "MediaLibraryModalCtrl",
            controllerAs: "vm",
            scope: $scope,
            resolve: {
                user: ["$stateParams", "User", function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }]
            },
            backdrop: 'static'
        });

        mediaLibraryModal.closed.then(function () {
            if(angular.element('.modal-backdrop').length) {
                angular.element('.modal-backdrop').hide();
                angular.element('body').removeClass('modal-open');
            }
        });
    });
}

function MediaLibraryModalCtrl($scope, $timeout, $filter, $state, $rootScope, $uibModalInstance, Media, user, Alertify, Scene) {
    var vm = this;

    vm.user = user;
    vm.selectedMedias = [];
    vm.files = [];
    vm.project = $scope.project;
    vm.uploadProgress = 0;
    vm.makePanoProgress = 0;
    vm.isUploading = false;
    vm.isLoading = true;
    vm.isCreateScene = false;
    vm.filesCreateScene = {};
    vm.rendering = 0;
    vm.renderingComplate = 0;
    vm.renderingTotal = 0;

    var developerKey = 'AIzaSyDFcThFQZ-f70UujAeL4BIdZGcVNszjdDo';

    // The Client ID obtained from the Google API Console. Replace with your own Client ID.
    var clientId = Config.GOOGLE_DRIVE_CLIENT_ID;

    // Scope to use to access user's photos.https://www.googleapis.com/auth/photos---https://www.googleapis.com/auth/drive
    var scope = ['https://www.googleapis.com/auth/photos','https://www.googleapis.com/auth/drive.readonly'];

    var pickerApiLoaded = false;
    var oauthToken;

    if (angular.isDefined($scope.currentFileType)) {
        vm.currentFileType = $scope.currentFileType;
    } else {
        vm.currentFileType = 'pano';
    }

    // functions
    vm.cancel = _cancel;
    vm.upload = _upload;
    vm.selectMedia = _selectMedia;
    vm.selectAll = _selectAll;
    vm.tabSelect = _tabSelect;
    vm.deleteSelected = _deleteSelected;
    vm.makePano = makePano;
    vm.makePanoDriverGoogle = makePanoDriverGoogle;
    vm.chooseAsset = chooseAsset;

    ////////////////

    /**
     * Get all files in Media Library
     * @return {object}
     */
    Media.all(vm.project._id).then(function(files) {
        vm.files = files;
    }).catch(function(res) {
        Alertify.error('Can not fetch files');
        console.log(res);
    }).finally(function() {
        vm.isLoading = false;
    });

    /**
     * Make Sphere image
     */
    function makePano(pano_type) {
        if (vm.selectedMedias.length) { // there are selected files to make pano
            if (vm.selectedMedias.length <= 300) {
                //vm.isLoading = true;
                angular.element('#block-ui').show();

                vm.isCreateScene = true;
                angular.forEach(vm.selectedMedias, function(selectedMedias) {
                    vm.filesCreateScene[selectedMedias] = $filter('filter')(vm.files, { _id: selectedMedias })[0];
                });
                vm.rendering = 0;
                vm.makePanoProgress = 0;
                vm.renderingComplate = 0;

                if ($scope.isReplacePano == true) {
                    vm.rendering = 1;
                    vm.renderingTotal = 1;
                    vm.filesCreateScene[vm.selectedMedias[0]].class = "working";
                    Scene.replace($scope.sceneId, vm.selectedMedias[0],'lapentor',vm.project._id, vm.project.slug, pano_type).then(function(status) {
                        if (status == 0) {
                            Alertify.error('Can not replace scene');
                            vm.filesCreateScene[vm.selectedMedias[0]].class = "fail";
                        } else {
                            //_cancel();
                            vm.filesCreateScene[vm.selectedMedias[0]].class = "success";
                            $scope.makePanoCallback($scope.sceneId);
                        }
                    }, function(res) {
                        Alertify.error("Can not replace scene");
                        vm.filesCreateScene[vm.selectedMedias[0]].class = "fail";
                    }).finally(function() {
                        //vm.isLoading = false;
                        vm.makePanoProgress = 100;
                        $timeout(function(){
                            vm.isCreateScene = false;
                            vm.selectedMedias = [];
                            vm.filesCreateScene = {};
                            angular.element('#block-ui').hide();
                        },2000)
                    });
                } else {
                    vm.renderingTotal = vm.selectedMedias.length;
                    _makePanos(vm.selectedMedias,'lapentor',vm.project._id, vm.project.slug, pano_type,0,vm.renderingTotal);
                    if(vm.selectedMedias.length >=2 && (!angular.isUndefined(vm.user.subscribed) && vm.user.subscribed)){
                        _makePanos(vm.selectedMedias,'lapentor',vm.project._id, vm.project.slug, pano_type,1,vm.renderingTotal);
                    }
                }
            } else {
                Alertify.error("You can only make 300 sphere at a time. Sorry!");
            }
        } else {
            // there are no selected files
            Alertify.error("Can't do that :( You have to select at least 1 pano image");
        }

    }

    function _makePanos(selectedMedias, type, project_id, project_slug, pano_type, sortMedia, totalMedia){
        if(!angular.isUndefined(vm.filesCreateScene[selectedMedias[sortMedia]].class)){
            var newSortMedia = sortMedia+1;
            if(totalMedia > newSortMedia){
                //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
            }
            return false;
        }
        vm.filesCreateScene[selectedMedias[sortMedia]].class = "working";
        if(vm.rendering < vm.renderingTotal) {
            vm.rendering++;    
        }

        var media = [];
        media.push(selectedMedias[sortMedia]);

        Scene.create(media, type, project_id, project_slug, pano_type).then(function(res) {
            try {
                res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                if (res.status == 0) {
                    // make pano failed
                    vm.filesCreateScene[selectedMedias[sortMedia]].class = "fail";
                    Alertify.error(res.errors.message);
                } else {
                    // make pano ok
                    //_cancel();
                    vm.filesCreateScene[selectedMedias[sortMedia]].class = "success";

                    var createdScenes = res.scenes;
                    $scope.makePanoCallback(createdScenes);
                }
            } catch (e) {
                console.error(e);
            }

        }, function(res) {
            Alertify.error("Can not create scene");
            vm.filesCreateScene[selectedMedias[sortMedia]].class = "fail";
            console.log(res);
        }).finally(function() {
            vm.renderingComplate = vm.renderingComplate +1;
            vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
            if(totalMedia - vm.renderingComplate == 0){
                //vm.makePanoProgress = 100;
                $timeout(function(){
                    vm.isCreateScene = false;
                    vm.selectedMedias = [];
                    angular.forEach(vm.filesCreateScene, function(file) {
                        delete file.class;
                    });
                    vm.filesCreateScene = {};
                    angular.element('#block-ui').hide();
                },2000)

                //_cancel();

            }else{
                var newSortMedia = sortMedia+1;
                if(totalMedia > newSortMedia){
                    //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                    _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
                }
            }
        });
    }

    function makePanoDriverGoogle(){
        gapi.load('auth', {'callback': onAuthApiLoad});
        gapi.load('picker', {'callback': onPickerApiLoad});
        angular.element('.picker-dialog-bg,.picker-dialog').remove();
    }

    function _callMakePanoDriverGoogle(files){
        if (files.length) { // there are selected files to make pano
            if (files.length <= 3) {
                vm.isLoading = true;
                angular.element('#block-ui').show();
                if ($scope.isReplacePano == true) {
                    Scene.replace($scope.sceneId, files[0],'google',vm.project._id, vm.project.slug).then(function(status) {
                        if (status == 0) {
                            Alertify.error('Can not replace scene');
                        } else {
                            _cancel();
                            $scope.makePanoCallback($scope.sceneId);
                        }
                    }, function(res) {
                        Alertify.error("Can not replace scene");
                    }).finally(function() {
                        vm.isLoading = false;
                        angular.element('#block-ui').hide();
                    });
                } else {
                    Scene.create(files,'google',vm.project._id, vm.project.slug).then(function(res) {
                        try {
                            res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                            if (res.status == 0) {
                                // make pano failed
                                Alertify.error(res.errors.message);
                            } else {
                                // make pano ok
                                _cancel();

                                var createdScenes = res.scenes;
                                $scope.makePanoCallback(createdScenes);
                            }
                        } catch (e) {
                            console.error(e);
                        }

                    }, function(res) {
                        Alertify.error("Can not create scene");
                        console.log(res);
                    }).finally(function() {
                        vm.isLoading = false;
                        angular.element('#block-ui').hide();
                    });
                }
            } else {
                Alertify.error("You can only make 3 sphere at a time. Sorry!");
            }
        } else {
            // there are no selected files
            Alertify.error("Can't do that :( You have to select at least 1 pano image");
        }
    }
    /**
     * Delete selected files
     */
    function _deleteSelected() {
        if (vm.selectedMedias.length > 0) {
            Alertify.confirm('Are you sure you want to delete these files?').then(function() {
                vm.isLoading = true;
                Media.remove(vm.selectedMedias).then(function(res) {
                    if (res.data.status == 1) {
                        // delete ok
                        vm.files = vm.files.filter(function(file) {
                            return (vm.selectedMedias.indexOf(file._id) == -1);
                        });
                        vm.selectedMedias = [];
                    } else {
                        // delete failed
                        Alertify.error(res.data.errors.message);
                    }
                }, function(res) {
                    Alertify.error('Can not delete files');
                    console.log(res);
                }).finally(function() {
                    vm.isLoading = false;
                });
            });
        } else {
            Alertify.error('You must select a file to delete');
        }
    }

    /**
     * Change Tab type
     * @param  {string} type [pano/asset]
     */
    function _tabSelect(type) {
        vm.currentFileType = type;
        vm.selectedMedias = []; // clear selected media
    }

    /**
     * Close Media Library
     */
    function _cancel() {
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
        $uibModalInstance.dismiss();
        if (typeof $scope.canelMediaLib === "function") {
            $scope.canelMediaLib();
        }
    }

    /**
     * Upload file to Media Library
     * @param  {object} files
     * @param  {object} invalidFiles
     */
    function _upload(files, invalidFiles) {
        angular.forEach(invalidFiles, function(item) {
            if (item.$error == 'dimensions') Alertify.error(item.name + ' width must > 2000px');
            if (item.$error == 'maxTotalSize') Alertify.error('Maximum upload size is ' + item.$errorParam);
        });
        if (files && files.length) {
            vm.isUploading = true;
            Media.upload(files, vm.project._id, vm.currentFileType).then(function(res) {
                if (angular.isDefined(res.data.files)) {
                    vm.files = res.data.files.concat(vm.files);
                }
            }, function(res) {
                Alertify.error('Can not upload file. Please try again');
                console.log(res);
            }, function(evt) {
                // progress
                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                vm.uploadProgress = progressPercentage;
            }).finally(function() {
                vm.isUploading = false;
                vm.uploadProgress = 0;
            });
        }
    }

    /**
     * Mark single file as selected
     */
    function _selectMedia(id) {
        var idx = vm.selectedMedias.indexOf(id);
        if (idx == -1) {
            if (!$scope.canChooseMultipleFile) {
                // clear selected medias array to prevent choosing multiple file
                vm.selectedMedias.length = 0;
            }

            vm.selectedMedias.push(id);
        } else {
            vm.selectedMedias.splice(idx, 1);
        }
    }

    /**
     * Mark all files as selected
     */
    function _selectAll() {
        if (vm.selectedMedias.length == vm.files.length) {
            vm.selectedMedias = [];
        } else {
            // Select all
            vm.selectedMedias = [];
            for (var i in vm.files) {
                vm.selectedMedias.push(vm.files[i]._id);
            }
        }
    }

    function chooseAsset() {
        if ($scope.canChooseMultipleFile == false) {
            var selectedFileObj = vm.files.filter(function(file) {
                return file._id == vm.selectedMedias[0];
            });

            // Pass file to chooseAsset func
            if (angular.isDefined($scope.chooseAsset)) {
                $scope.chooseAsset(selectedFileObj[0]);
            }

            _cancel();
        } else if ($scope.canChooseMultipleFile == true) {

            var selectedFileObjs = [];
            angular.forEach(vm.selectedMedias, function(value, key) {

                vm.files.filter(function(file) {
                    if (file._id == value) {
                        selectedFileObjs.push(file);
                    }
                });

            });
            if (angular.isDefined($scope.chooseAsset)) {
                $scope.chooseAsset(selectedFileObjs);
            }

            _cancel();
        } else {
            Alertify.error('Please select a file');
        }
    }

    function onAuthApiLoad() {
        window.gapi.auth.authorize(
            {
                'client_id': clientId,
                'scope': scope,
                'immediate': false
            },
            handleAuthResult);
    }

    function onPickerApiLoad() {
        pickerApiLoaded = true;
        createPicker();
    }

    function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
            oauthToken = authResult.access_token;
            createPicker();
        }
    }

    // Create and render a Picker object for picking user Photos.
    function createPicker() {
        if (pickerApiLoaded && oauthToken) {
            var picker = new google.picker.PickerBuilder().
                addView(google.picker.ViewId.DOCS).
                setOAuthToken(oauthToken).
                setDeveloperKey(developerKey).
                setCallback(pickerCallback).
                build();
            picker.setVisible(true);
        }
    }

    // A simple callback implementation.
    function pickerCallback(data) {
        var url = 'nothing';
        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
            var doc = data[google.picker.Response.DOCUMENTS][0];
            url = doc[google.picker.Document.URL];
            var fileId = doc[google.picker.Document.ID];
            var files = [];

            gapi.client.request({
                'path': '/drive/v2/files/'+fileId,
                'method': 'GET',
                callback: function (responsejs, responsetxt){
                    var downloadUrl = responsejs.downloadUrl;
                    doc['download'] = downloadUrl;
                    doc['oauthToken'] = oauthToken;
                    files.push(doc);
                    _callMakePanoDriverGoogle(files);
                }
            });
        }

    }
}
}());

;(function() {
"use strict";

ProfileCtrl.$inject = ["Alertify", "envService", "Upload", "user", "User", "LptHelper", "$location"];
angular.module('lapentor.app')
    .controller('ProfileCtrl', ProfileCtrl);

function ProfileCtrl(Alertify, envService, Upload, user, User, LptHelper, $location) {
    var vm = this;
    vm.user = user;
    vm.invoices = [];
    vm.projectViews = [];
    vm.card = {}; // empty card for updating card detail
    vm.isSaving = false;
    vm.preview = [];
    vm.timeRange = '7days';

    switch ($location.search().tab) {
        case 'project-analytics':
            vm.activeTab = 3;
            break;
        case 'settings':
            vm.activeTab = 2;
            break;
        case 'billing':
            vm.activeTab = 1;
            break;
        default:
            vm.activeTab = 0;
            break;
    }

    vm.saveProfile = saveProfile;
    vm.upload = upload;
    vm.updateCard = updateCard;
    vm.cancelSubscription = cancelSubscription;
    vm.resumeSubscription = resumeSubscription;
    vm.getInvoiceDate = getInvoiceDate;

    ////////////////

    User.getInvoices().then(function(res) {
        vm.invoices = res;
    }, function(err) {
    });

    User.getProjectViews({ type: 'project_view' }).then(function(res) {
        vm.projectViews = res;
    }, function(err) {
    });

    ////////////////

    function cancelSubscription() {
        Alertify.confirm("Do you really want to cancel your subscription? This action is irreversible").then(function() {
            if (vm.isLoading) return;
            vm.isLoading = true;
            User.cancelSubscription().then(function(res) {
                if (res.status == 1) {
                    Alertify.success('Your subscription is cancelled');
                    vm.user = res.user;
                }
            }, function(res) {
                Alertify.error('Sorry. Please try again');
            }).finally(function() {
                vm.isLoading = false;
            });
        });
    }

    function resumeSubscription() {
        if (vm.isLoading) return;
        vm.isLoading = true;
        User.resumeSubscription().then(function(res) {
            if (res.status == 1) {
                Alertify.success('Welcome back :D');
                vm.user = res.user;
            }
        }, function(res) {
            Alertify.error('Sorry. Please try again');
        }).finally(function() {
            vm.isLoading = false;
        });
    }

    function updateCard() {
        // Prevent repeated click
        if (vm.isLoading) return;
        // Request a token from Stripe:
        vm.isLoading = true;
        Stripe.card.createToken(vm.card, stripeResponseHandler);
    }

    function stripeResponseHandler(status, response) {
        if (response.error) { // Problem!
            // Show the errors on the form:
            Alertify.error(response.error.message);
            vm.isLoading = false;
        } else { // Token was created!
            // Get the token ID:
            var token = response.id;

            // Insert the token ID into the form so it gets submitted to the server:
            // Submit the form:
            User.updateCard(token).then(function(res) {
                if (res.status == 1) {
                    vm.card = {}; // clear form
                    Alertify.success('Your card is updated');
                    vm.user = res.user;
                    vm.showUpdateCardDetailForm = false;
                }
            }, function(res) {
                Alertify.error('Sorry. Your card is not valid. Please try again');
            }).finally(function() {
                vm.isLoading = false;
            });
        }
    };

    function upload(files, type) {
        if (files && files.length) {
            vm.preview[type] = files[0];

            vm.isUploading = true;

            Upload.upload({
                url: envService.read('apiUrl') + '/user/upload',
                method: 'post',
                data: {
                    file: files[0],
                    type: type
                }
            }).then(function(res) {
                vm.user[type] = res.data.url;
            }, function(res) {
                Alertify.error('Can not upload file');
                vm.preview[type] = null;
            }, function(evt) {
                // progress
                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                vm.uploadProgress = progressPercentage;
            }).finally(function() {
                vm.isUploading = false;
                vm.uploadProgress = 0;
            });
        }
    }

    function saveProfile() {
        if (vm.user.password && vm.user.password != vm.user.repassword) {
            Alertify.error("Password confirmation is not match. Please try again");
            return false;
        }
        if (vm.user.first_name == '' && vm.user.last_name == '') {
            Alertify.error("Please enter your name");
            return false;
        }
        if (vm.user.email === '' || vm.user.email === null) {
            Alertify.error("Please enter your email");
            return false;
        }
        if (!LptHelper.validateEmail(vm.user.email)) {
            Alertify.error("Invalid email format");
            return false;
        }
        vm.isSaving = true;

        User.update(vm.user).then(function() {
            Alertify.success('Profile saved');
        }).finally(function() {
            vm.isSaving = false;
        });
    }

    function getInvoiceDate(date) {
        var months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        var dateObj = new Date(date * 1000);
        var year = dateObj.getFullYear();
        var month = months[dateObj.getMonth()];
        return month + ' ' + year;
    }
}
}());

;(function() {
"use strict";

ProjectCtrl.$inject = ["$scope", "$rootScope", "$timeout", "$state", "$filter", "ngMeta", "Alertify", "project", "Project", "CONST"];
angular.module('lapentor.app')
    .controller('ProjectCtrl', ProjectCtrl);

function ProjectCtrl($scope, $rootScope, $timeout, $state, $filter, ngMeta, Alertify, project, Project, CONST) {
    var vm = this,
        time,
        titleChangeTimeoutPromise;
    ngMeta.setTitle(project.title);

    vm.deleteProject = deleteProject;
    vm.titleIsLoading = false;
    vm.settingIsLoading = false;
    vm.project = project;
    vm.project.public = angular.isDefined(vm.project.public) ? vm.project.public : 1;
    vm.project.in_portfolio = angular.isDefined(vm.project.in_portfolio) ? vm.project.in_portfolio : 1;
    vm.project.shareUrl = $filter('shareUrl')(vm.project.slug);

    vm.updateProject = updateProject;
    vm.updateGoogleProject = updateGoogleProject; // Update project's Google Analytic ID
    vm.updatePublicAccess = updatePublicAccess; // Update project's publicity
    vm.updateCanListInPortfolio = updateCanListInPortfolio;
    vm.updatePasswordProject = updatePasswordProject; // Update project's password
    vm.openMediaLib = openMediaLib;
    vm.openMediaAssetLib = openMediaAssetLib;
    vm.deleteSnapshot = deleteSnapshot; // Delete snapshot

    // Init project meta
    if (angular.isUndefined(vm.project.meta) || vm.project.meta.length == 0) {
        vm.project.meta = {};
        var rawProject = angular.fromJson(angular.toJson(vm.project));
        vm.project.meta.title = rawProject.title;
        if (rawProject.scenes.length && !vm.project.meta.image) {
            vm.project.meta.image = rawProject.scenes[0].pano_thumb;
        }
    }

    // Open media library if there are no scenes
    if (vm.project.scenes.length == 0) {
        $timeout(function() {
            vm.openMediaLib();
        }, 1000);
    }

    // Get exported versions
    getExportedVersions();

    ///////////////

    vm.isDeletingSnapshot = false;
    function deleteSnapshot(id) {
        vm.isDeletingSnapshot = true;
        Project.deleteSnapshot(id).then(function (res) {
            if(res) {
                // delete success
                jQuery('#snapshot'+id).remove();
            }
        }, function (err) {
            console.log(err);
        }).finally(function () {
            vm.isDeletingSnapshot = false;
        });
    }

    function getExportedVersions() {
        Project.getExportedVersions(project._id).then(function(res) {
            vm.exportedVersions = res;
        }, function (err) {
            console.log(err);
        });
    }

    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            vm.project.scenes = createdScenes.concat(vm.project.scenes);
            $state.go('project.editor', { id: createdScenes[0].project_id, scene_id: createdScenes[0]._id });
        }
    }

    // Watch for changes & Update project title 
    $scope.$watch('vm.project.title', function(newVal, oldVal) {
        if (newVal != oldVal) {
            if (titleChangeTimeoutPromise) $timeout.cancel(titleChangeTimeoutPromise);
            titleChangeTimeoutPromise = $timeout(function() {
                vm.titleIsLoading = true;
                updateTitle();
            }, 1000);
        }
    });

    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback
        });
    }

    /**
     * Open media library in Asset tab
     */
    function openMediaAssetLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.project.meta.image = file.path;
        }
    }

    // Update project info
    function updateProject() {
        vm.isSaving = true;
        Project.update(vm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            vm.titleIsLoading = false;
            vm.isSaving = false;
        });
    }
    function updateGoogleProject() {
        vm.isSavingGoogle = true;
        Project.update(vm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            vm.isSavingGoogle = false;
        });
    }

    // Update project title
    function updateTitle() {
        Project.updateTitle(vm.project.title, vm.project._id).then(function(newSlug) {
                vm.project.slug = newSlug;
                vm.project.shareUrl = newSlug;
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.titleIsLoading = false;
            });
    }

    // Update project public access
    function updatePublicAccess() {
        vm.projectPublicityIsLoading = true;
        Project.updatePublicAccess(vm.project.public, vm.project._id).then(function(status) {
                Alertify.success('Project publicity updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.projectPublicityIsLoading = false;
            });
    }

    // Update project can list in portfolio
    function updateCanListInPortfolio() {
        vm.projectCanListInPortfolioLoading = true;
        Project.updateCanListInPortfolio(vm.project.in_portfolio, vm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.projectCanListInPortfolioLoading = false;
            });
    }

    // Update project enable password
    function updatePasswordProject(type) {
        if (type == 'input') {
            $timeout.cancel(time)
            time = $timeout(function() {
                if( vm.project.password.string.length > 5 ){
                    updatePassword();
                }else{
                    Alertify.error('You have entered less than 6 characters for password');
                }
            }, 1500)
        } else {
            updatePassword();
        }
    }

    function updatePassword() {
        vm.isUpdatingPassword = true;
        Project.updatePasswordProject(vm.project.password, vm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.isUpdatingPassword = false;
            });
    }

    // Delete project by id
    function deleteProject() {
        var id = vm.project._id;
        Alertify.confirm('Are you sure? All data will be lost').then(function() {
            // Remove on server
            Project.remove(id).then(function(res) {
                if (res.data.status == 1) {
                    $state.go('index');
                } else {
                    Alertify.error('Can not delete project');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not delete project');
            })
        });
    }

    function downloadProject(id) {
        Alertify.confirm('You will be charged $'+ CONST.export_price +' for each download. <br> Do you want to continue?').then(
            function onOk() {
                vm.isGettingProject = true;
                Project.download(id).then(function (res) {
                    switch(res.status) {
                        case 1:
                            window.open(res.download_link, '_blank');
                            break;
                        case 0: // on trial
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                        case -1: // payment failed
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                    }
                }, function (err) {
                    console.log(err)
                    Alertify.error('Can not download project. Please try again');
                }).finally(function () {
                    vm.isGettingProject = false;
                });
            }, 
            function onCancel() {}
        );
    }
}
}());

;(function() {
"use strict";

ProjectSettingModalCtrl.$inject = ["$scope", "$rootScope", "$uibModal"];
angular.module('lapentor.app')
    .controller('ProjectSettingModalCtrl', ProjectSettingModalCtrl);

function ProjectSettingModalCtrl($scope, $rootScope, $uibModal) {
    // Listen for open media lib event
    $rootScope.$on('evt.openProjectSettingModal', function(event, project) {
        $scope.project = project;

        $uibModal.open({
            templateUrl: "modules/lapentor.app/views/partials/project.setting.modal.html",
            scope: $scope,
            controllerAs: "projectSettingVm",
            controller: ["$scope", "$uibModalInstance", "Alertify", "Project", function($scope, $uibModalInstance, Alertify, Project) {
                var projectSettingVm = this;

                projectSettingVm.dismiss = dismiss;
                projectSettingVm.project = $scope.project;
                projectSettingVm.updateProject = updateProject;

                // Close Media Library
                function dismiss() {
                    $uibModalInstance.dismiss();
                    angular.element('body').removeClass('modal-open');
                    angular.element('.modal-backdrop').remove();
                }

                function updateProject() {
                    projectSettingVm.isLoading = true;
                    Project.update(projectSettingVm.project).then(function(status) {
                        if (status != 1) {
                            Alertify.error('Can not update project');
                        }else{
                            Alertify.success('Project saved');
                        }
                    }).finally(function() {
                        projectSettingVm.isLoading = false;
                    });
                }
            }],
        });
    });
}
}());

;(function() {
"use strict";

ProjectShareModalCtrl.$inject = ["$scope", "$rootScope", "$uibModal", "envService"];
angular.module('lapentor.app')
    .controller('ProjectShareModalCtrl', ProjectShareModalCtrl);

function ProjectShareModalCtrl($scope, $rootScope, $uibModal, envService) {
    // Listen for open media lib event
    $rootScope.$on('evt.openProjectShareModal', function(event, project) {
        $scope.project = project;

        $uibModal.open({
            templateUrl: "modules/lapentor.app/views/partials/project.share.modal.html",
            scope: $scope,
            controllerAs: "projectShareVm",
            controller: ["$scope", "$uibModalInstance", "Alertify", "Project", function($scope, $uibModalInstance, Alertify, Project) {
                var projectShareVm = this;
                projectShareVm.project = $scope.project;

                projectShareVm.shareUrl = envService.read('siteUrl') + '/sphere/' + projectShareVm.project.slug;

                projectShareVm.dismiss = dismiss;

                // Close Modal
                function dismiss() {
                    $uibModalInstance.dismiss();
                    angular.element('body').removeClass('modal-open');
                    angular.element('.modal-backdrop').remove();
                }
            }],
        });
    });
}
}());

;(function() {
"use strict";

ResendActivateAccountCtrl.$inject = ["$scope", "$state", "AuthSrv", "$timeout"];
angular.module('lapentor.app')
    .controller('ResendActivateAccountCtrl', ResendActivateAccountCtrl);

function ResendActivateAccountCtrl($scope, $state, AuthSrv, $timeout) {
    var vm = this;

    vm.submit = function() {
        vm.isLoading = true;
        if (vm.resendForm.$valid) {
            AuthSrv.resendActivation(vm.email).then(function(res) {
                vm.message = 'Your activation link was send. Please check your email (both Inbox and Spam).';
            }).catch(function(message) {
                vm.message = message;
                vm.messageClass = 'danger';

                $timeout(function() {
                    vm.message = null;
                    vm.messageClass = '';
                }, 10000);
            }).finally(function() {
                vm.isLoading = false;
                vm.errorClass = '';
            });
        } else {
            vm.isLoading = false;
            vm.errorClass = '';
            $timeout(function() {
                vm.errorClass = 'pulse';
            }, 100);
        }
    }
}
}());

;(function() {
"use strict";

ResetPasswordCtrl.$inject = ["$scope", "$state", "$timeout", "$stateParams", "Alertify", "AuthSrv"];
angular.module('lapentor.app')
    .controller('ResetPasswordCtrl', ResetPasswordCtrl);

function ResetPasswordCtrl($scope, $state, $timeout, $stateParams, Alertify, AuthSrv) {
    var vm = this;
    vm.submit = function() {
        if (vm.isLoading) return;
        if (vm.password == vm.passwordConfirmation) {

            if (vm.resetForm.$valid) {
                vm.isLoading = true;

                AuthSrv.resetPassword({
                    token: $stateParams.token,
                    password: vm.password,
                    password_confirmation: vm.passwordConfirmation
                }).then(function(res) {
                    vm.message = 'Your new password is saved. You will be redirect to sign in page in 5 seconds';
                    $timeout(function() {
                        $state.go('login');
                    }, 5000);
                }).finally(function() {
                    vm.isLoading = false;
                });
            } else {
                Alertify.error('Password field is required');
                vm.isLoading = false;
            }
        } else {
            Alertify.error('Password is not match');
            vm.isLoading = false;
        }
    }
}
}());

;(function() {
"use strict";

ShowcaseCtrl.$inject = ["$scope", "$stateParams", "ngMeta", "$filter", "user", "Showcase"];
angular.module('lapentor.app')
    .controller('ShowcaseCtrl', ShowcaseCtrl);

function ShowcaseCtrl($scope, $stateParams, ngMeta, $filter, user, Showcase) {
    var vm = this;
    vm.user = user;
    vm.user.sceneCount = 0;
    angular.forEach(vm.user.projects, function(p) {
        vm.user.sceneCount += p.scenes.length;
    });

    vm.openProject = function(slug) {
        window.open($filter('shareUrl')(slug));
    }

    try {
        if (angular.isDefined(user.first_name) && angular.isDefined(user.last_name)) {
            if (user.first_name != '' || user.last_name != '') {
                ngMeta.setTitle(user.first_name + ' ' + user.last_name);
            }
        }else{
            ngMeta.setTitle(user.username);
        }

        if (user.bio != '') ngMeta.setTag('description', user.bio);
        if (angular.isDefined(user.avatar) && user.avatar != '') {
            var ogImage = user.avatar.replace(/^https:\/\//i, 'http://');
            ngMeta.setTag('image', ogImage);
        } else {
            if (angular.isDefined(user.cover) && user.cover != '') {
                var ogImage = user.cover.replace(/^https:\/\//i, 'http://');
                ngMeta.setTag('image', ogImage);
            }
        }
    } catch (e) {
        ngMeta.setTitle(user.username);
        console.error(e);
    }

}
}());

;(function() {
"use strict";

UpgradeCtrl.$inject = ["$scope", "$http", "Alertify", "envService", "$rootScope"];
angular.module('lapentor.app')
    .controller('UpgradeCtrl', UpgradeCtrl);

function UpgradeCtrl($scope, $http, Alertify, envService, $rootScope) {
    var uVm = this;

    uVm.openUpgradeForm = openUpgradeForm;
    uVm.switchMethod = switchMethod;
    uVm.closeUpgradeForm = closeUpgradeForm;
    uVm.submit = submit;
    uVm.showPaymentForm = false;
    uVm.isLoading = false;
    uVm.card = {};

    uVm.switchMethod('yearly');

    /////// functions

    function submit() {
        // Prevent repeated click
        if (uVm.isLoading) return;
        // Request a token from Stripe:
        uVm.isLoading = true;
        Stripe.card.createToken(uVm.card, stripeResponseHandler);
    }

    function stripeResponseHandler(status, response) {
        if (response.error) { // Problem!
            // Show the errors on the form:
            Alertify.error(response.error.message);
            uVm.isLoading = false;
        } else { // Token was created!
            // Get the token ID:
            var token = response.id;

            // Insert the token ID into the form so it gets submitted to the server:
            // Submit the form:
            $http.post(envService.read('apiUrl') + '/user/upgrade', {
                stripeToken: token,
                type: uVm.method,
                coupon: uVm.coupon
            }).then(function(res) {
                // Upgrade is success
                if (res.data.status == 1) {
                    uVm.card = {}; // clear form
                    // Display success message
                    uVm.showCongrat = true;
                    $rootScope.$broadcast('user.update', res.data.user);
                }
            }, function(res) {
                Alertify.error('Sorry. Please try again');
            }).finally(function() {
                uVm.isLoading = false;
            });
        }
    };

    function openUpgradeForm(user) {
        jQuery('#upgradeModal').show();

        // Hide payment form if user is already subscribed
        if (user.subscribed) {
            uVm.showCongrat = true;
            uVm.showPaymentForm = false;
        }
    }

    function closeUpgradeForm() {
        jQuery('#upgradeModal').hide();
    }

    function switchMethod(method) {
        uVm.method = method;
        switch (method) {
            case 'monthly':
                uVm.price = envService.read('planMonthly');
                break;
            case 'yearly':
                uVm.price = envService.read('planYearly');
                break;
        }
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('editorControlbar', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/editor.controlbar.html',
            controller: 'EditorControlBarCtrl',
            controllerAs: 'ebVm'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('editorMarket', function() {

        return {
            restrict: 'E',
            controller: 'EditorMarketCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/market.html'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('editorScenesManagement', function() {

        return {
            restrict: 'E',
            controller: 'EditorScenesManagementCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/scenes.management.html'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('editorToolbar', function() {

        return {
            restrict: 'E',
            controller: 'EditorToolbarCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/toolbar.html'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app').directive('focusme',
    ["$timeout", function($timeout) {
        return {
            scope : {
                trigger : '@focus'
            },
            link : function(scope, element) {
                scope.$watch('trigger', function(value) {
                    if (value === "true") {
                        $timeout(function() {
                            element[0].focus();
                        });
                    }
                });
            }
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('lptAudio', ["$sce", function($sce) {
        return {
            restrict: 'E',
            scope: {
                hotspotid: '=',
                src: '=',
                volume: '='
            },
            replace: true,
            template: '<audio id="sound{{ hotspotid }}" ng-src="{{ url }}" controls></audio>',
            link: function(scope, element) {
                scope.$watch('src', function(newVal, oldVal) {
                    if (newVal !== undefined) {
                        scope.url = $sce.trustAsResourceUrl(newVal);
                    }else{
                    }
                });
                var audio = angular.element(element)[0];

                scope.$watch('volume', function(newVal, oldVal) {
                    if (newVal !== undefined) {
                        audio.volume = newVal/100;
                    }
                });
            }
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('marketplaceItemConfig', function() {

        return {
            restrict: 'E',
            controller: 'MarketplaceItemConfigCtrl',
            controllerAs: 'vm',
            scope: {
            	project: '='
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('mediaLibrary', function() {

        return {
            restrict: 'E',
            controller: 'MediaLibraryCtrl',
            controllerAs: 'vm',
            scope: {
            	project: '=',
                chooseAsset: '&'
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('projectSettingModal', function() {

        return {
            restrict: 'E',
            controller: 'ProjectSettingModalCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('projectShareModal', function() {

        return {
            restrict: 'E',
            controller: 'ProjectShareModalCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
	.filter('shareUrl', ["envService", function (envService) {
		return function (slug) {
			if(angular.isUndefined(slug)) return "";

        	return envService.read('siteUrl') + '/sphere/' + slug;
		}
	}]);
}());

;(function() {
"use strict";

lptInterceptor.$inject = ["$q", "$injector", "Alertify"];
angular.module('lapentor.app')
    .factory('lptInterceptor', lptInterceptor);

function lptInterceptor($q, $injector, Alertify) {
    var interceptor = {
        'response': function(response) {
            // successful response
            return response; // or $q.when(config); 
        },
        'request': function (request) {
            if (request.url.substr(-5) == '.html' && request.url.indexOf('modules/') !== -1) {
               request.url = request.url + '?ver=' + LPT_VER;
            }

            return request;
        },
        'requestError': function(rejection) { // an error happened on the request // if we can recover from the error // we can return a new request
            return $q.reject(rejection);
        },
        'responseError': function(rejection) {
            if(rejection.status == 401) {
                $injector.get('$auth').logout();
                localStorage.removeItem('satellizer_token');
                $injector.get('$state').go('login');
            }

            if(rejection.status == 404) {
                $injector.get('$state').go('404');
            }

            // if(rejection.status == 402) {
            //     Alertify.error('Your trial is ended. Please Upgrade to Premium plan');
            // }
            
            return $q.reject(rejection);
        }
    };

    return interceptor;
}
}());

;(function() {
"use strict";

AuthSrv.$inject = ["$http", "envService", "$q", "Alertify"];
angular.module('lapentor.app')
    .factory('AuthSrv', AuthSrv);

function AuthSrv($http, envService, $q, Alertify) {
    var service = {
        register: register,
        activate: activate,
        resendActivation: resendActivation,
        sendResetLink: sendResetLink,
        resetPassword: resetPassword,
        login: login
    };
    return service;

    function sendResetLink(email) {
        var d = $q.defer();

        $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/send-reset-link',
            data: {
                email: email
            }
        }).then(function(res) {
            if (res.data.status) {
                d.resolve(res.data.status);
            } else {
                d.reject(res);
            }
        }).catch(function(res) {
            switch (res.status) {
                case 500:
                    Alertify.error('There is something wrong. Please try again');
                    break;
                case 400:
                    Alertify.error('User with this email is not found or your account is not activated');
                    break;
                case 422:
                    // validation error, display error message
                    displayValidationErrors(res.data);
                    
                    break;
            }
            d.reject();
        });

        return d.promise;
    }

    function register(userData) {
        return $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/register',
            data: userData
        });
    }

    function login(userData) {
        return $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/login',
            data: userData
        });
    }

    function resetPassword(data) {
        var d = $q.defer();

        $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/reset-password',
            data: data
        }).then(function(res) {
            if (res.data.status) {
                d.resolve(res.data.status);
            } else {
                d.reject(res);
            }
        }).catch(function(res) {
            switch (res.status) {
                case 500:
                    d.reject('Can not reset your password. Please try again');
                    break;
                case 400:
                    Alertify.error('Token is not valid or expired :(');
                    d.reject();
                    break;
                case 422:
                    // validation error, display error message
                    displayValidationErrors(res.data);

                    break;
                default:
                    d.reject();
                    break;
            }
        });

        return d.promise;
    }

    function activate(token) {
        var d = $q.defer();

        $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/register/activate',
            data: {
                token: token
            }
        }).then(function(res) {
            // console.log(res);
            if (res.data.status) {
                d.resolve(res.data.status);
            } else {
                d.reject(res);
            }
        }).catch(function(res) {
            switch (res.status) {
                case 500:
                    d.reject('Can not activate your account. Please try again');
                    break;
                case 400:
                    d.reject('Token is not valid or expired :(');
                    break;
                case 422:
                    d.reject('The activation token is required');
                    break;
                default:
                    d.reject();
                    break;
            }
        });

        return d.promise;
    }

    function resendActivation(email) {
        var d = $q.defer();

        $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/auth/register/resend-activate',
            data: {
                email: email
            }
        }).then(function(res) {
            if (res.data.status) {
                d.resolve(res.data.status);
            } else {
                d.reject(res);
            }
        }).catch(function(res) {
            switch (res.status) {
                case 500:
                    d.reject('Can not generate a new activation link. Please try again');
                    break;
                case 400:
                    d.reject('User with this email is not found or your account is already activated');
                    break;
                case 422:
                    d.reject('Email is not valid');
                    break;
                default:
                    d.reject();
                    break;
            }
        });

        return d.promise;
    }

    function displayValidationErrors(errors) {
        if (errors) {
            angular.forEach(errors, function(msg) {
                Alertify.error(msg[0]);
            });
        }
    }
}
}());

;(function() {
"use strict";

Hotspot.$inject = ["$q", "$http", "envService", "LptHelper"];
angular.module('lapentor.app')
    .factory('Hotspot', Hotspot);

function Hotspot($q, $http, envService, LptHelper) {
    var service = {
        all: all,
        create: create,
        append: append,
        update: update,
        getTypes: getTypes,
        remove: remove,
        getDemoHotspots: getDemoHotspots
    };

    return service;

    /////////////

    function all(scene_id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/hotspots', {
                params: { scene_id: scene_id }
            })
            .then(function(res) {
                d.resolve(res.data);
            }, function(res) {
                console.error('ERR: Get all hotspots', res);
                d.reject(res);
            });

        return d.promise;
    }

    function create(x, y, type, scene_id, project_slug) {
        return $http.post(envService.read('apiUrl') + '/hotspot/create', {
            x: x,
            y: y,
            scene_id: scene_id,
            type: type,
            project_slug: project_slug
        });
    }

    function update(hotspot) {
        return $http.put(envService.read('apiUrl') + '/hotspot/' + hotspot._id, hotspot);
    }

    function append(hotspot, lptSphereInstance) {
        var hotspotName = 'lptHotspot' + hotspot._id;

        lptSphereInstance.addHotspot({
            title: hotspot.title,
            name: hotspotName,
            url: 'assets/images/hotspots/' + hotspot.type + '.png',
            ath: hotspot.position.x,
            atv: hotspot.position.y
        });
    }

    function getTypes(themeSlug) {
        var iconPrefix = 'assets/images/hotspots';
        if (themeSlug) {
            iconPrefix = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', themeSlug, 'images');
        }

        return [{
            name: "point",
            tooltip: 'Point Hotspot',
            icon: iconPrefix + '/point.png'
        }, {
            name: "sound",
            tooltip: 'Directional sound Hotspot',
            icon: iconPrefix + '/sound.png'
        }, {
            name: "image",
            tooltip: 'Image Hotspot',
            icon: iconPrefix + '/image.png'
        }, {
            name: "video",
            tooltip: 'Video Hotspot',
            icon: iconPrefix + '/video.png'
        }, {
            name: "article",
            tooltip: 'Article Hotspot',
            icon: iconPrefix + '/article.png'
        }, {
            name: "textf",
            tooltip: 'Info Hotspot',
            icon: iconPrefix + '/textf.png'
        }, {
            name: "url",
            tooltip: 'Url Hotspot',
            icon: iconPrefix + '/url.png'
        }];
    }

    function getDemoHotspots() {
        var xStep = -60,
            baseId = 1;

        function _getStep() {
            xStep += 16;
            return xStep;
        }

        function _getId() {
            return baseId++;
        }
        return [{
            "_id": _getId(),
            "title": "Point hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "point"
        }, {
            "_id": _getId(),
            "title": "Image hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "image"
        }, {
            "_id": _getId(),
            "title": "Video hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "video"
        }, {
            "_id": _getId(),
            "title": "Article hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "article"
        }, {
            "_id": _getId(),
            "title": "Text field hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "textf"
        }, {
            "_id": _getId(),
            "title": "Url hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "url"
        }];
    }

    function remove(id, project_slug) {
        return $http.delete(envService.read('apiUrl') + '/hotspot/' + id + '?project_slug=' + project_slug);
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .factory('Icon', Icon);

function Icon() {
    var service = {
        get: get,
    };

    return service;

    function get(fontName) {
        switch (fontName) {
            case 'glyphicon':
                return ['glyphicon glyphicon-asterisk',
                    'glyphicon glyphicon-plus',
                    'glyphicon glyphicon-euro',
                    'glyphicon glyphicon-eur',
                    'glyphicon glyphicon-minus',
                    'glyphicon glyphicon-cloud',
                    'glyphicon glyphicon-envelope',
                    'glyphicon glyphicon-pencil',
                    'glyphicon glyphicon-glass',
                    'glyphicon glyphicon-music',
                    'glyphicon glyphicon-search',
                    'glyphicon glyphicon-heart',
                    'glyphicon glyphicon-star',
                    'glyphicon glyphicon-star-empty',
                    'glyphicon glyphicon-user',
                    'glyphicon glyphicon-film',
                    'glyphicon glyphicon-th-large',
                    'glyphicon glyphicon-th',
                    'glyphicon glyphicon-th-list',
                    'glyphicon glyphicon-ok',
                    'glyphicon glyphicon-remove',
                    'glyphicon glyphicon-zoom-in',
                    'glyphicon glyphicon-zoom-out',
                    'glyphicon glyphicon-off',
                    'glyphicon glyphicon-signal',
                    'glyphicon glyphicon-cog',
                    'glyphicon glyphicon-trash',
                    'glyphicon glyphicon-home',
                    'glyphicon glyphicon-file',
                    'glyphicon glyphicon-time',
                    'glyphicon glyphicon-road',
                    'glyphicon glyphicon-download-alt',
                    'glyphicon glyphicon-download',
                    'glyphicon glyphicon-upload',
                    'glyphicon glyphicon-inbox',
                    'glyphicon glyphicon-play-circle',
                    'glyphicon glyphicon-repeat',
                    'glyphicon glyphicon-refresh',
                    'glyphicon glyphicon-list-alt',
                    'glyphicon glyphicon-lock',
                    'glyphicon glyphicon-flag',
                    'glyphicon glyphicon-headphones',
                    'glyphicon glyphicon-volume-off',
                    'glyphicon glyphicon-volume-down',
                    'glyphicon glyphicon-volume-up',
                    'glyphicon glyphicon-qrcode',
                    'glyphicon glyphicon-barcode',
                    'glyphicon glyphicon-tag',
                    'glyphicon glyphicon-tags',
                    'glyphicon glyphicon-book',
                    'glyphicon glyphicon-bookmark',
                    'glyphicon glyphicon-print',
                    'glyphicon glyphicon-camera',
                    'glyphicon glyphicon-font',
                    'glyphicon glyphicon-bold',
                    'glyphicon glyphicon-italic',
                    'glyphicon glyphicon-text-height',
                    'glyphicon glyphicon-text-width',
                    'glyphicon glyphicon-align-left',
                    'glyphicon glyphicon-align-center',
                    'glyphicon glyphicon-align-right',
                    'glyphicon glyphicon-align-justify',
                    'glyphicon glyphicon-list',
                    'glyphicon glyphicon-indent-left',
                    'glyphicon glyphicon-indent-right',
                    'glyphicon glyphicon-facetime-video',
                    'glyphicon glyphicon-picture',
                    'glyphicon glyphicon-map-marker',
                    'glyphicon glyphicon-adjust',
                    'glyphicon glyphicon-tint',
                    'glyphicon glyphicon-edit',
                    'glyphicon glyphicon-share',
                    'glyphicon glyphicon-check',
                    'glyphicon glyphicon-move',
                    'glyphicon glyphicon-step-backward',
                    'glyphicon glyphicon-fast-backward',
                    'glyphicon glyphicon-backward',
                    'glyphicon glyphicon-play',
                    'glyphicon glyphicon-pause',
                    'glyphicon glyphicon-stop',
                    'glyphicon glyphicon-forward',
                    'glyphicon glyphicon-fast-forward',
                    'glyphicon glyphicon-step-forward',
                    'glyphicon glyphicon-eject',
                    'glyphicon glyphicon-chevron-left',
                    'glyphicon glyphicon-chevron-right',
                    'glyphicon glyphicon-plus-sign',
                    'glyphicon glyphicon-minus-sign',
                    'glyphicon glyphicon-remove-sign',
                    'glyphicon glyphicon-ok-sign',
                    'glyphicon glyphicon-question-sign',
                    'glyphicon glyphicon-info-sign',
                    'glyphicon glyphicon-screenshot',
                    'glyphicon glyphicon-remove-circle',
                    'glyphicon glyphicon-ok-circle',
                    'glyphicon glyphicon-ban-circle',
                    'glyphicon glyphicon-arrow-left',
                    'glyphicon glyphicon-arrow-right',
                    'glyphicon glyphicon-arrow-up',
                    'glyphicon glyphicon-arrow-down',
                    'glyphicon glyphicon-share-alt',
                    'glyphicon glyphicon-resize-full',
                    'glyphicon glyphicon-resize-small',
                    'glyphicon glyphicon-exclamation-sign',
                    'glyphicon glyphicon-gift',
                    'glyphicon glyphicon-leaf',
                    'glyphicon glyphicon-fire',
                    'glyphicon glyphicon-eye-open',
                    'glyphicon glyphicon-eye-close',
                    'glyphicon glyphicon-warning-sign',
                    'glyphicon glyphicon-plane',
                    'glyphicon glyphicon-calendar',
                    'glyphicon glyphicon-random',
                    'glyphicon glyphicon-comment',
                    'glyphicon glyphicon-magnet',
                    'glyphicon glyphicon-chevron-up',
                    'glyphicon glyphicon-chevron-down',
                    'glyphicon glyphicon-retweet',
                    'glyphicon glyphicon-shopping-cart',
                    'glyphicon glyphicon-folder-close',
                    'glyphicon glyphicon-folder-open',
                    'glyphicon glyphicon-resize-vertical',
                    'glyphicon glyphicon-resize-horizontal',
                    'glyphicon glyphicon-hdd',
                    'glyphicon glyphicon-bullhorn',
                    'glyphicon glyphicon-bell',
                    'glyphicon glyphicon-certificate',
                    'glyphicon glyphicon-thumbs-up',
                    'glyphicon glyphicon-thumbs-down',
                    'glyphicon glyphicon-hand-right',
                    'glyphicon glyphicon-hand-left',
                    'glyphicon glyphicon-hand-up',
                    'glyphicon glyphicon-hand-down',
                    'glyphicon glyphicon-circle-arrow-right',
                    'glyphicon glyphicon-circle-arrow-left',
                    'glyphicon glyphicon-circle-arrow-up',
                    'glyphicon glyphicon-circle-arrow-down',
                    'glyphicon glyphicon-globe',
                    'glyphicon glyphicon-wrench',
                    'glyphicon glyphicon-tasks',
                    'glyphicon glyphicon-filter',
                    'glyphicon glyphicon-briefcase',
                    'glyphicon glyphicon-fullscreen',
                    'glyphicon glyphicon-dashboard',
                    'glyphicon glyphicon-paperclip',
                    'glyphicon glyphicon-heart-empty',
                    'glyphicon glyphicon-link',
                    'glyphicon glyphicon-phone',
                    'glyphicon glyphicon-pushpin',
                    'glyphicon glyphicon-usd',
                    'glyphicon glyphicon-gbp',
                    'glyphicon glyphicon-sort',
                    'glyphicon glyphicon-sort-by-alphabet',
                    'glyphicon glyphicon-sort-by-alphabet-alt',
                    'glyphicon glyphicon-sort-by-order',
                    'glyphicon glyphicon-sort-by-order-alt',
                    'glyphicon glyphicon-sort-by-attributes',
                    'glyphicon glyphicon-sort-by-attributes-alt',
                    'glyphicon glyphicon-unchecked',
                    'glyphicon glyphicon-expand',
                    'glyphicon glyphicon-collapse-down',
                    'glyphicon glyphicon-collapse-up',
                    'glyphicon glyphicon-log-in',
                    'glyphicon glyphicon-flash',
                    'glyphicon glyphicon-log-out',
                    'glyphicon glyphicon-new-window',
                    'glyphicon glyphicon-record',
                    'glyphicon glyphicon-save',
                    'glyphicon glyphicon-open',
                    'glyphicon glyphicon-saved',
                    'glyphicon glyphicon-import',
                    'glyphicon glyphicon-export',
                    'glyphicon glyphicon-send',
                    'glyphicon glyphicon-floppy-disk',
                    'glyphicon glyphicon-floppy-saved',
                    'glyphicon glyphicon-floppy-remove',
                    'glyphicon glyphicon-floppy-save',
                    'glyphicon glyphicon-floppy-open',
                    'glyphicon glyphicon-credit-card',
                    'glyphicon glyphicon-transfer',
                    'glyphicon glyphicon-cutlery',
                    'glyphicon glyphicon-header',
                    'glyphicon glyphicon-compressed',
                    'glyphicon glyphicon-earphone',
                    'glyphicon glyphicon-phone-alt',
                    'glyphicon glyphicon-tower',
                    'glyphicon glyphicon-stats',
                    'glyphicon glyphicon-sd-video',
                    'glyphicon glyphicon-hd-video',
                    'glyphicon glyphicon-subtitles',
                    'glyphicon glyphicon-sound-stereo',
                    'glyphicon glyphicon-sound-dolby',
                    'glyphicon glyphicon-sound-5-1',
                    'glyphicon glyphicon-sound-6-1',
                    'glyphicon glyphicon-sound-7-1',
                    'glyphicon glyphicon-copyright-mark',
                    'glyphicon glyphicon-registration-mark',
                    'glyphicon glyphicon-cloud-download',
                    'glyphicon glyphicon-cloud-upload',
                    'glyphicon glyphicon-tree-conifer',
                    'glyphicon glyphicon-tree-deciduous',
                    'glyphicon glyphicon-cd',
                    'glyphicon glyphicon-save-file',
                    'glyphicon glyphicon-open-file',
                    'glyphicon glyphicon-level-up',
                    'glyphicon glyphicon-copy',
                    'glyphicon glyphicon-paste',
                    'glyphicon glyphicon-alert',
                    'glyphicon glyphicon-equalizer',
                    'glyphicon glyphicon-king',
                    'glyphicon glyphicon-queen',
                    'glyphicon glyphicon-pawn',
                    'glyphicon glyphicon-bishop',
                    'glyphicon glyphicon-knight',
                    'glyphicon glyphicon-baby-formula',
                    'glyphicon glyphicon-tent',
                    'glyphicon glyphicon-blackboard',
                    'glyphicon glyphicon-bed',
                    'glyphicon glyphicon-apple',
                    'glyphicon glyphicon-erase',
                    'glyphicon glyphicon-hourglass',
                    'glyphicon glyphicon-lamp',
                    'glyphicon glyphicon-duplicate',
                    'glyphicon glyphicon-piggy-bank',
                    'glyphicon glyphicon-scissors',
                    'glyphicon glyphicon-bitcoin',
                    'glyphicon glyphicon-btc',
                    'glyphicon glyphicon-xbt',
                    'glyphicon glyphicon-yen',
                    'glyphicon glyphicon-jpy',
                    'glyphicon glyphicon-ruble',
                    'glyphicon glyphicon-rub',
                    'glyphicon glyphicon-scale',
                    'glyphicon glyphicon-ice-lolly',
                    'glyphicon glyphicon-ice-lolly-tasted',
                    'glyphicon glyphicon-education',
                    'glyphicon glyphicon-option-horizontal',
                    'glyphicon glyphicon-option-vertical',
                    'glyphicon glyphicon-menu-hamburger',
                    'glyphicon glyphicon-modal-window',
                    'glyphicon glyphicon-oil',
                    'glyphicon glyphicon-grain',
                    'glyphicon glyphicon-sunglasses',
                    'glyphicon glyphicon-text-size',
                    'glyphicon glyphicon-text-color',
                    'glyphicon glyphicon-text-background',
                    'glyphicon glyphicon-object-align-top',
                    'glyphicon glyphicon-object-align-bottom',
                    'glyphicon glyphicon-object-align-horizontal',
                    'glyphicon glyphicon-object-align-left',
                    'glyphicon glyphicon-object-align-vertical',
                    'glyphicon glyphicon-object-align-right',
                    'glyphicon glyphicon-triangle-right',
                    'glyphicon glyphicon-triangle-left',
                    'glyphicon glyphicon-triangle-bottom',
                    'glyphicon glyphicon-triangle-top',
                    'glyphicon glyphicon-console',
                    'glyphicon glyphicon-superscript',
                    'glyphicon glyphicon-subscript',
                    'glyphicon glyphicon-menu-left',
                    'glyphicon glyphicon-menu-right',
                    'glyphicon glyphicon-menu-down',
                    'glyphicon glyphicon-menu-up',
                ];
                break;
            case 'fontawesome':
                return ["fa fa-bluetooth","fa fa-bluetooth-b","fa fa-codiepie","fa fa-credit-card-alt","fa fa-edge","fa fa-fort-awesome","fa fa-hashtag","fa fa-mixcloud","fa fa-modx","fa fa-pause-circle","fa fa-pause-circle-o","fa fa-percent","fa fa-product-hunt","fa fa-reddit-alien","fa fa-scribd","fa fa-shopping-bag","fa fa-shopping-basket","fa fa-stop-circle","fa fa-stop-circle-o","fa fa-usb","fa fa-adjust","fa fa-anchor","fa fa-archive","fa fa-area-chart","fa fa-arrows","fa fa-arrows-h","fa fa-arrows-v","fa fa-asterisk","fa fa-at","fa fa-automobile","fa fa-balance-scale","fa fa-ban","fa fa-bank","fa fa-bar-chart","fa fa-bar-chart-o","fa fa-barcode","fa fa-bars","fa fa-battery-0","fa fa-battery-1","fa fa-battery-2","fa fa-battery-3","fa fa-battery-4","fa fa-battery-empty","fa fa-battery-full","fa fa-battery-half","fa fa-battery-quarter","fa fa-battery-three-quarters","fa fa-bed","fa fa-beer","fa fa-bell","fa fa-bell-o","fa fa-bell-slash","fa fa-bell-slash-o","fa fa-bicycle","fa fa-binoculars","fa fa-birthday-cake","fa fa-bolt","fa fa-bomb","fa fa-book","fa fa-bookmark","fa fa-bookmark-o","fa fa-briefcase","fa fa-bug","fa fa-building","fa fa-building-o","fa fa-bullhorn","fa fa-bullseye","fa fa-bus","fa fa-cab","fa fa-calculator","fa fa-calendar","fa fa-calendar-check-o","fa fa-calendar-minus-o","fa fa-calendar-o","fa fa-calendar-plus-o","fa fa-calendar-times-o","fa fa-camera","fa fa-camera-retro","fa fa-car","fa fa-caret-square-o-down","fa fa-caret-square-o-left","fa fa-caret-square-o-right","fa fa-caret-square-o-up","fa fa-cart-arrow-down","fa fa-cart-plus","fa fa-cc","fa fa-certificate","fa fa-check","fa fa-check-circle","fa fa-check-circle-o","fa fa-check-square","fa fa-check-square-o","fa fa-child","fa fa-circle","fa fa-circle-o","fa fa-circle-o-notch","fa fa-circle-thin","fa fa-clock-o","fa fa-clone","fa fa-close","fa fa-cloud","fa fa-cloud-download","fa fa-cloud-upload","fa fa-code","fa fa-code-fork","fa fa-coffee","fa fa-cog","fa fa-cogs","fa fa-comment","fa fa-comment-o","fa fa-commenting","fa fa-commenting-o","fa fa-comments","fa fa-comments-o","fa fa-compass","fa fa-copyright","fa fa-creative-commons","fa fa-credit-card","fa fa-crop","fa fa-crosshairs","fa fa-cube","fa fa-cubes","fa fa-cutlery","fa fa-dashboard","fa fa-database","fa fa-desktop","fa fa-diamond","fa fa-dot-circle-o","fa fa-download","fa fa-edit","fa fa-ellipsis-h","fa fa-ellipsis-v","fa fa-envelope","fa fa-envelope-o","fa fa-envelope-square","fa fa-eraser","fa fa-exchange","fa fa-exclamation","fa fa-exclamation-circle","fa fa-exclamation-triangle","fa fa-external-link","fa fa-external-link-square","fa fa-eye","fa fa-eye-slash","fa fa-eyedropper","fa fa-fax","fa fa-feed","fa fa-female","fa fa-fighter-jet","fa fa-file-archive-o","fa fa-file-audio-o","fa fa-file-code-o","fa fa-file-excel-o","fa fa-file-image-o","fa fa-file-movie-o","fa fa-file-pdf-o","fa fa-file-photo-o","fa fa-file-picture-o","fa fa-file-powerpoint-o","fa fa-file-sound-o","fa fa-file-video-o","fa fa-file-word-o","fa fa-file-zip-o","fa fa-film","fa fa-filter","fa fa-fire","fa fa-fire-extinguisher","fa fa-flag","fa fa-flag-checkered","fa fa-flag-o","fa fa-flash","fa fa-flask","fa fa-folder","fa fa-folder-o","fa fa-folder-open","fa fa-folder-open-o","fa fa-frown-o","fa fa-futbol-o","fa fa-gamepad","fa fa-gavel","fa fa-gear","fa fa-gears","fa fa-gift","fa fa-glass","fa fa-globe","fa fa-graduation-cap","fa fa-group","fa fa-hand-grab-o","fa fa-hand-lizard-o","fa fa-hand-paper-o","fa fa-hand-peace-o","fa fa-hand-pointer-o","fa fa-hand-rock-o","fa fa-hand-scissors-o","fa fa-hand-spock-o","fa fa-hand-stop-o","fa fa-hdd-o","fa fa-headphones","fa fa-heart","fa fa-heart-o","fa fa-heartbeat","fa fa-history","fa fa-home","fa fa-hotel","fa fa-hourglass","fa fa-hourglass-1","fa fa-hourglass-2","fa fa-hourglass-3","fa fa-hourglass-end","fa fa-hourglass-half","fa fa-hourglass-o","fa fa-hourglass-start","fa fa-i-cursor","fa fa-image","fa fa-inbox","fa fa-industry","fa fa-info","fa fa-info-circle","fa fa-institution","fa fa-key","fa fa-keyboard-o","fa fa-language","fa fa-laptop","fa fa-leaf","fa fa-legal","fa fa-lemon-o","fa fa-level-down","fa fa-level-up","fa fa-life-bouy","fa fa-life-buoy","fa fa-life-ring","fa fa-life-saver","fa fa-lightbulb-o","fa fa-line-chart","fa fa-location-arrow","fa fa-lock","fa fa-magic","fa fa-magnet","fa fa-mail-forward","fa fa-mail-reply","fa fa-mail-reply-all","fa fa-male","fa fa-map","fa fa-map-marker","fa fa-map-o","fa fa-map-pin","fa fa-map-signs","fa fa-meh-o","fa fa-microphone","fa fa-microphone-slash","fa fa-minus","fa fa-minus-circle","fa fa-minus-square","fa fa-minus-square-o","fa fa-mobile","fa fa-mobile-phone","fa fa-money","fa fa-moon-o","fa fa-mortar-board","fa fa-motorcycle","fa fa-mouse-pointer","fa fa-music","fa fa-navicon","fa fa-newspaper-o","fa fa-object-group","fa fa-object-ungroup","fa fa-paint-brush","fa fa-paper-plane","fa fa-paper-plane-o","fa fa-paw","fa fa-pencil","fa fa-pencil-square","fa fa-pencil-square-o","fa fa-phone","fa fa-phone-square","fa fa-photo","fa fa-picture-o","fa fa-pie-chart","fa fa-plane","fa fa-plug","fa fa-plus","fa fa-plus-circle","fa fa-plus-square","fa fa-plus-square-o","fa fa-power-off","fa fa-print","fa fa-puzzle-piece","fa fa-qrcode","fa fa-question","fa fa-question-circle","fa fa-quote-left","fa fa-quote-right","fa fa-random","fa fa-recycle","fa fa-refresh","fa fa-registered","fa fa-remove","fa fa-reorder","fa fa-reply","fa fa-reply-all","fa fa-retweet","fa fa-road","fa fa-rocket","fa fa-rss","fa fa-rss-square","fa fa-search","fa fa-search-minus","fa fa-search-plus","fa fa-send","fa fa-send-o","fa fa-server","fa fa-share","fa fa-share-alt","fa fa-share-alt-square","fa fa-share-square","fa fa-share-square-o","fa fa-shield","fa fa-ship","fa fa-shopping-cart","fa fa-sign-in","fa fa-sign-out","fa fa-signal","fa fa-sitemap","fa fa-sliders","fa fa-smile-o","fa fa-soccer-ball-o","fa fa-sort","fa fa-sort-alpha-asc","fa fa-sort-alpha-desc","fa fa-sort-amount-asc","fa fa-sort-amount-desc","fa fa-sort-asc","fa fa-sort-desc","fa fa-sort-down","fa fa-sort-numeric-asc","fa fa-sort-numeric-desc","fa fa-sort-up","fa fa-space-shuttle","fa fa-spinner","fa fa-spoon","fa fa-square","fa fa-square-o","fa fa-star","fa fa-star-half","fa fa-star-half-empty","fa fa-star-half-full","fa fa-star-half-o","fa fa-star-o","fa fa-sticky-note","fa fa-sticky-note-o","fa fa-street-view","fa fa-suitcase","fa fa-sun-o","fa fa-support","fa fa-tablet","fa fa-tachometer","fa fa-tag","fa fa-tags","fa fa-tasks","fa fa-taxi","fa fa-television","fa fa-terminal","fa fa-thumb-tack","fa fa-thumbs-down","fa fa-thumbs-o-down","fa fa-thumbs-o-up","fa fa-thumbs-up","fa fa-ticket","fa fa-times","fa fa-times-circle","fa fa-times-circle-o","fa fa-tint","fa fa-toggle-down","fa fa-toggle-left","fa fa-toggle-off","fa fa-toggle-on","fa fa-toggle-right","fa fa-toggle-up","fa fa-trademark","fa fa-trash","fa fa-trash-o","fa fa-tree","fa fa-trophy","fa fa-truck","fa fa-tty","fa fa-tv","fa fa-umbrella","fa fa-university","fa fa-unlock","fa fa-unlock-alt","fa fa-unsorted","fa fa-upload","fa fa-user","fa fa-user-plus","fa fa-user-secret","fa fa-user-times","fa fa-users","fa fa-video-camera","fa fa-volume-down","fa fa-volume-off","fa fa-volume-up","fa fa-warning","fa fa-wheelchair","fa fa-wifi","fa fa-wrench","fa fa-hand-o-down","fa fa-hand-o-left","fa fa-hand-o-right","fa fa-hand-o-up","fa fa-ambulance","fa fa-subway","fa fa-train","fa fa-genderless","fa fa-intersex","fa fa-mars","fa fa-mars-double","fa fa-mars-stroke","fa fa-mars-stroke-h","fa fa-mars-stroke-v","fa fa-mercury","fa fa-neuter","fa fa-transgender","fa fa-transgender-alt","fa fa-venus","fa fa-venus-double","fa fa-venus-mars","fa fa-file","fa fa-file-o","fa fa-file-text","fa fa-file-text-o","fa fa-cc-amex","fa fa-cc-diners-club","fa fa-cc-discover","fa fa-cc-jcb","fa fa-cc-mastercard","fa fa-cc-paypal","fa fa-cc-stripe","fa fa-cc-visa","fa fa-google-wallet","fa fa-paypal","fa fa-bitcoin","fa fa-btc","fa fa-cny","fa fa-dollar","fa fa-eur","fa fa-euro","fa fa-gbp","fa fa-gg","fa fa-gg-circle","fa fa-ils","fa fa-inr","fa fa-jpy","fa fa-krw","fa fa-rmb","fa fa-rouble","fa fa-rub","fa fa-ruble","fa fa-rupee","fa fa-shekel","fa fa-sheqel","fa fa-try","fa fa-turkish-lira","fa fa-usd","fa fa-won","fa fa-yen","fa fa-align-center","fa fa-align-justify","fa fa-align-left","fa fa-align-right","fa fa-bold","fa fa-chain","fa fa-chain-broken","fa fa-clipboard","fa fa-columns","fa fa-copy","fa fa-cut","fa fa-dedent","fa fa-files-o","fa fa-floppy-o","fa fa-font","fa fa-header","fa fa-indent","fa fa-italic","fa fa-link","fa fa-list","fa fa-list-alt","fa fa-list-ol","fa fa-list-ul","fa fa-outdent","fa fa-paperclip","fa fa-paragraph","fa fa-paste","fa fa-repeat","fa fa-rotate-left","fa fa-rotate-right","fa fa-save","fa fa-scissors","fa fa-strikethrough","fa fa-subscript","fa fa-superscript","fa fa-table","fa fa-text-height","fa fa-text-width","fa fa-th","fa fa-th-large","fa fa-th-list","fa fa-underline","fa fa-undo","fa fa-unlink","fa fa-angle-double-down","fa fa-angle-double-left","fa fa-angle-double-right","fa fa-angle-double-up","fa fa-angle-down","fa fa-angle-left","fa fa-angle-right","fa fa-angle-up","fa fa-arrow-circle-down","fa fa-arrow-circle-left","fa fa-arrow-circle-o-down","fa fa-arrow-circle-o-left","fa fa-arrow-circle-o-right","fa fa-arrow-circle-o-up","fa fa-arrow-circle-right","fa fa-arrow-circle-up","fa fa-arrow-down","fa fa-arrow-left","fa fa-arrow-right","fa fa-arrow-up","fa fa-arrows-alt","fa fa-caret-down","fa fa-caret-left","fa fa-caret-right","fa fa-caret-up","fa fa-chevron-circle-down","fa fa-chevron-circle-left","fa fa-chevron-circle-right","fa fa-chevron-circle-up","fa fa-chevron-down","fa fa-chevron-left","fa fa-chevron-right","fa fa-chevron-up","fa fa-long-arrow-down","fa fa-long-arrow-left","fa fa-long-arrow-right","fa fa-long-arrow-up","fa fa-backward","fa fa-compress","fa fa-eject","fa fa-expand","fa fa-fast-backward","fa fa-fast-forward","fa fa-forward","fa fa-pause","fa fa-play","fa fa-play-circle","fa fa-play-circle-o","fa fa-step-backward","fa fa-step-forward","fa fa-stop","fa fa-youtube-play","fa fa-500px","fa fa-adn","fa fa-amazon","fa fa-android","fa fa-angellist","fa fa-apple","fa fa-behance","fa fa-behance-square","fa fa-bitbucket","fa fa-bitbucket-square","fa fa-black-tie","fa fa-buysellads","fa fa-chrome","fa fa-codepen","fa fa-connectdevelop","fa fa-contao","fa fa-css3","fa fa-dashcube","fa fa-delicious","fa fa-deviantart","fa fa-digg","fa fa-dribbble","fa fa-dropbox","fa fa-drupal","fa fa-empire","fa fa-expeditedssl","fa fa-facebook","fa fa-facebook-f","fa fa-facebook-official","fa fa-facebook-square","fa fa-firefox","fa fa-flickr","fa fa-fonticons","fa fa-forumbee","fa fa-foursquare","fa fa-ge","fa fa-get-pocket","fa fa-git","fa fa-git-square","fa fa-github","fa fa-github-alt","fa fa-github-square","fa fa-gittip","fa fa-google","fa fa-google-plus","fa fa-google-plus-square","fa fa-gratipay","fa fa-hacker-news","fa fa-houzz","fa fa-html5","fa fa-instagram","fa fa-internet-explorer","fa fa-ioxhost","fa fa-joomla","fa fa-jsfiddle","fa fa-lastfm","fa fa-lastfm-square","fa fa-leanpub","fa fa-linkedin","fa fa-linkedin-square","fa fa-linux","fa fa-maxcdn","fa fa-meanpath","fa fa-medium","fa fa-odnoklassniki","fa fa-odnoklassniki-square","fa fa-opencart","fa fa-openid","fa fa-opera","fa fa-optin-monster","fa fa-pagelines","fa fa-pied-piper","fa fa-pied-piper-alt","fa fa-pinterest","fa fa-pinterest-p","fa fa-pinterest-square","fa fa-qq","fa fa-ra","fa fa-rebel","fa fa-reddit","fa fa-reddit-square","fa fa-renren","fa fa-safari","fa fa-sellsy","fa fa-shirtsinbulk","fa fa-simplybuilt","fa fa-skyatlas","fa fa-skype","fa fa-slack","fa fa-slideshare","fa fa-soundcloud","fa fa-spotify","fa fa-stack-exchange","fa fa-stack-overflow","fa fa-steam","fa fa-steam-square","fa fa-stumbleupon","fa fa-stumbleupon-circle","fa fa-tencent-weibo","fa fa-trello","fa fa-tripadvisor","fa fa-tumblr","fa fa-tumblr-square","fa fa-twitch","fa fa-twitter","fa fa-twitter-square","fa fa-viacoin","fa fa-vimeo","fa fa-vimeo-square","fa fa-vine","fa fa-vk","fa fa-wechat","fa fa-weibo","fa fa-weixin","fa fa-whatsapp","fa fa-wikipedia-w","fa fa-windows","fa fa-wordpress","fa fa-xing","fa fa-xing-square","fa fa-y-combinator","fa fa-y-combinator-square","fa fa-yahoo","fa fa-yc","fa fa-yc-square","fa fa-yelp","fa fa-youtube","fa fa-youtube-square","fa fa-h-square","fa fa-hospital-o","fa fa-medkit","fa fa-stethoscope","fa fa-user-md"];
                break;

        }
    }
}
}());

;(function() {
"use strict";

Marketplace.$inject = ["$q", "$http", "LptHelper", "envService"];
angular.module('lapentor.app')
    .factory('Marketplace', Marketplace);

function Marketplace($q, $http, LptHelper, envService) {
    var service = {
        getItems: getItems,
        getCategories: getCategories,
        getPluginButtons: getPluginButtons,
    };

    return service;

    /////////////

    /**
     * Get marketplace items from API
     * @return {object} all marketplace items object
     */
    function getItems() {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/marketplace/items')
            .then(function(res) {
                var items = res.data;
                angular.forEach(items, function(item) {
                    var controllerName = '';
                    switch (item.type) {
                        case 'plugin':
                            controllerName = item.type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                            break;
                        case 'theme':
                            controllerName = item.theme_type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                            break;
                    }
                    if (LptHelper.isControllerExist(controllerName)) { // check if config controller is defined or not
                        item.has_config = true;
                    } else {
                        item.has_config = false;
                    }
                    switch (item.type) {
                        case 'plugin':
                            if (item.screenshot) {
                                item.screenshot = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, item.screenshot);
                            } else {
                                item.screenshot = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, 'screenshot.jpg');
                            }
                            break;
                        case 'theme':
                            if (item.screenshot) {
                                item.screenshot = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, item.screenshot);
                            } else {
                                item.screenshot = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, 'screenshot.jpg');
                            }
                            break;
                    }
                });
                d.resolve(items);
            }, function(res) {
                d.reject(res);
            });

        return d.promise;
    }

    function getCategories() {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/marketplace/categories')
            .then(function(res) {
                var items = res.data;
                d.resolve(items);
            }, function(res) {
                d.reject(res);
            });

        return d.promise;
    }

    /**
     * Get buttons available that plugins registered
     * @param  {Object}  installedPlugins [installed plugins object]
     * @param  {Boolean} isEdit           [decide if is in edit mode]
     * @return {Object}                   [all available buttons]
     */
    function getPluginButtons(installedPlugins, isEdit) {
        var order = 'asc';
        var availableButtons = [];
        if (angular.isDefined(installedPlugins)) {
            angular.forEach(installedPlugins, function(pl) {
                if (angular.isDefined(pl.buttons)) {
                    for (var i in pl.buttons) {
                        pl.buttons[i].plugin_slug = pl.slug;
                        // Apply full asset path to icon_url
                        if (pl.buttons[i].icon_url && pl.buttons[i].icon_url.indexOf('/') == -1) {
                            pl.buttons[i].icon_url = LptHelper.makeUrl(Config.PLUGIN_PATH, pl.buttons[i].plugin_slug, 'images', pl.buttons[i].icon_url);
                        }
                    }
                    availableButtons = availableButtons.concat(pl.buttons);
                }
            });
        }
        // Sort buttons
        availableButtons = availableButtons.sort(function(a, b) {
            if (order == 'asc') {
                if (a.index == 0) return -1;
                return a.index > b.index;
            } else {
                return a.index < b.index;
            }
        });
        if (!isEdit) {
            // Hide some buttons on mobile
            var tempBtns = [];
            angular.forEach(availableButtons, function(btn) {
                if (btn.id == 'commonbuttons-fullscreen' && isMobile.apple.device) {
                    return;
                }
                if (btn.id === 'webvr-start' && !isMobile.any) return // hide WebVR btn on desktop
                tempBtns.push(btn);
            });
            availableButtons = tempBtns;

            // Remove hidden buttons from result if this is outside tour
            var availableButtonsResult = [];
            angular.forEach(availableButtons, function(btn, idx) {
                if (!btn.hide) availableButtonsResult.push(btn);
            });


            return availableButtonsResult;
        } else {
            return availableButtons;
        }

    }

}
}());

;(function() {
"use strict";

Media.$inject = ["$q", "$http", "$state", "Alertify", "Upload", "envService"];
angular.module('lapentor.app')
    .factory('Media', Media);

function Media($q, $http, $state, Alertify, Upload, envService) {
    var files = null;

    var service = {
        all: all,
        get: get,
        upload: upload,
        update: update,
        remove: remove,
    };

    return service;

    ///////// API calls

    function all(project_id) {
        var d = $q.defer();
        if (files) {
            d.resolve(files);
        } else {
            $http.get(envService.read('apiUrl') + '/files',{params: {project_id: project_id}})
                .then(function(res) {
                    if(angular.isDefined(res.data.errors)) {
                        Alertify.error(res.data.errors.message);
                        console.log(res.data.errors);
                        d.resolve([]);
                    }else{
                        d.resolve(res.data);
                    }
                }, function(res) {
                    console.error('ERR: Get all files', res);
                    d.reject(res);
                });
        }

        return d.promise;
    }

    function get(id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/file/'+id)
                .then(function(res) {
                    d.resolve(res.data);
                }, function(res) {
                    console.error('ERR: Get media', res);
                    d.reject(res);
                });
        
        return d.promise;
    }

    function upload(files, project_id, type) {
        return Upload.upload({
            url: envService.read('apiUrl') + '/file/create',
            method: 'post',
            data: {
                project_id: project_id,
                files: files,
                type: type
            },
            // resumeChunkSize: '5MB'
        });
    }

    function update(media) {
        return $http.put(envService.read('apiUrl') + '/file/'+media._id, media);
    }

    function remove(ids) {
        ids = JSON.stringify(ids);
        return $http.delete(envService.read('apiUrl') + '/files', {
            params: {
                ids: ids
            }
        });
    }
}
}());

;(function() {
"use strict";

Project.$inject = ["$q", "$http", "$auth", "$state", "envService"];
angular.module('lapentor.app')
    .factory('Project', Project);

function Project($q, $http, $auth, $state, envService) {
    var projects = null;

    var service = {
        all: all,
        get: get,
        create: create,
        duplicate: duplicate,
        update: update,
        updateTitle: updateTitle,
        updatePublicAccess: updatePublicAccess,
        updateCanListInPortfolio: updateCanListInPortfolio,
        updatePluginConfig: updatePluginConfig,
        updateThemeConfig: updateThemeConfig,
        updatePasswordProject: updatePasswordProject,
        checkPasswordProject: checkPasswordProject,
        remove: remove,
        download: download,
        getExportedVersions: getExportedVersions,
        deleteSnapshot: deleteSnapshot
    };

    return service;

    ///////// API calls

    function all(offset, limit, search) {
        var d = $q.defer();
        if (projects) {
            d.resolve(projects);
        } else {
            $http.get(envService.read('apiUrl') + '/projects',{params: { offset: offset, limit: limit, search: search }})
                .then(function(res) {
                    d.resolve(res.data);
                }, function(res) {
                    console.error('ERR: Get all projects', res);
                    d.reject(res);
                });
        }

        return d.promise;
    }

    function get(id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/project/' + id)
            .then(function(res) {
                var project = res.data;
                if (project) {
                    d.resolve(project);
                } else {
                    $auth.logout();
                    $state.go('login');
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Get project', res);
                d.reject(res);
            });

        return d.promise;
    }

    function getExportedVersions(project_id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/projects/exported/'+project_id)
            .then(function(res) {
                var res = res.data;
                if (res.status == 1) {
                    d.resolve(res.exportedVersions);
                } else {
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Get project', res);
                d.reject(res);
            });

        return d.promise;
    }

    function deleteSnapshot(id) {
        var d = $q.defer();
        $http.delete(envService.read('apiUrl') + '/projects/exported/'+id)
            .then(function(res) {
                var res = res.data;
                if (res.status == 1) {
                    d.resolve(true);
                } else {
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Delete snapshot', res);
                d.reject(res);
            });

        return d.promise;
    }

    function create(project) {
        return $http.post(envService.read('apiUrl') + '/project/create', project);
    }

    function duplicate(id) {
        var d = $q.defer();
        $http.post(envService.read('apiUrl') + '/project/duplicate/' + id).then(function(res) {
            if (res.data.status == 1) {
                d.resolve(res.data.duplicatedProject);
            } else {
                d.reject();
            }
        }, function(res) {
            console.error('ERR: Can not duplicate project');
            console.log(res);
            d.reject(false);
        });

        return d.promise;
    }

    function download(id, token, email) {
        var d = $q.defer();
        var url = envService.read('apiUrl') + '/export-project/' + id;
        var params = {
            token: token,
            email: email
        };

        $http.post(url, params).then(function(res) {
            d.resolve(res.data);
        }, function(res) {
            console.error('ERR: Can not download project');
            console.log(res);
            d.reject(false);
        });

        return d.promise;
    }

    function update(project) {
        var d = $q.defer();

        if (project.google) {
            project.google = Object.assign({}, project.google);
        }

        $http.put(envService.read('apiUrl') + '/project/' + project._id, project)
            .then(function(res) {
                d.resolve(res.data.status);
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.resolve(false);
            });

        return d.promise;
    }

    function updateTitle(title, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/title/' + project_id, { title: title })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.slug);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updatePublicAccess(is_public, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/public-access/' + project_id, { public: is_public })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updateCanListInPortfolio(in_portfolio, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/can-list-in-portfolio/' + project_id, { in_portfolio: in_portfolio })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updatePasswordProject(password, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/password/' + project_id, { password: password })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function checkPasswordProject(password, project_id) {
        var result = false;
        $http.patch(envService.read('apiUrl') + '/sphere/active-password/' + project_id, { password: password })
            .then(function(res) {
                if (res.data.status) {
                    result = true;
                }
                return result;
            }, function(res) {

            });
        return result;

    }

    function updatePluginConfig(plugin, project_id) {
        var d = $q.defer();
        $http.patch(envService.read('apiUrl') + '/project/plugin/' + project_id, plugin)
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updateThemeConfig(theme_type, project_id, config) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/theme/' + project_id, {
                theme_type: theme_type,
                config: config
            })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function remove(id) {
        return $http.delete(envService.read('apiUrl') + '/project/' + id);
    }
}
}());

;(function() {
"use strict";

Scene.$inject = ["$q", "$http", "LptHelper", "envService"];
angular.module('lapentor.app').decorator("$xhrFactory", [
        "$delegate", "$injector",
        function($delegate, $injector) {
            return function(method, url) {
                var xhr = $delegate(method, url);
                var $http = $injector.get("$http");
                var callConfig = $http.pendingRequests[$http.pendingRequests.length - 1];
                if (angular.isFunction(callConfig.onProgress))
                    xhr.addEventListener("progress", callConfig.onProgress);
                return xhr;
            };
        }
    ])
    .factory('Scene', Scene);

function Scene($q, $http, LptHelper, envService) {
    var scenes = null;
    var service = {
        all: all,
        get: get,
        create: create,
        replace: replace,
        update: update,
        updateLimitViewForAllScene: updateLimitViewForAllScene,
        remove: remove,
    };

    return service;

    ///////// API calls

    function all(project_id) {
        var d = $q.defer();
        if (scenes) {
            d.resolve(scenes);
        } else {
            $http.get(envService.read('apiUrl') + '/scenes', {
                    params: { project_id: project_id }
                })
                .then(function(res) {
                    d.resolve(res.data);
                }, function(res) {
                    console.error('ERR: Get all scenes', res);
                    d.reject(res);
                });
        }

        return d.promise;
    }

    function create(ids, type, project_id, project_slug, pano_type) {
        return $http({
            method: 'POST',
            url: envService.read('apiUrl') + '/scene/create',
            eventHandlers: {
                "progress": function (c) {
                    var text = c.target.responseText;

                    text = text.split('##').splice(-1)[0];
                    if (text) {
                        //angular.element('#process').html(text);
                        text = text.split("%%");
                        if(text[0] == 100){
                            if(type =="lapentor"){
                                angular.element("#"+ids[0]).html('Complete.');
                            }
                            if(type =="dropbox"){
                                angular.element("#"+ids[0].id).html('Complete.');
                            }
                        }else{
                            if(type =="lapentor"){
                                angular.element("#"+ids[0]).html(text[1]);
                            }
                            if(type =="dropbox"){
                                angular.element("#"+ids[0].id).html(text[1]);
                            }
                        }

                    }
                }
            },
            onProgress: function(event) {
                //var text = event.target.responseText;
                //
                ////hien thi text
                //// text = text.replace(new RegExp("##[0-9]{1,20}##", "g"), "");
                //text = text.split('##').splice(-1)[0];
                //if (text) {
                //    angular.element('#process').html(text);
                //}
                //
                //// auto scroll
                //var objDiv = document.getElementById("process");
                //objDiv.scrollTop = objDiv.scrollHeight;
            },
            data: {
                ids: ids,
                type: type,
                project_id: project_id,
                project_slug: project_slug,
                pano_type: pano_type
            }
        });
    }

    function replace(scene_id, media_id, type, project_id, project_slug, pano_type) {
        var d = $q.defer();
        $http({
            method: 'PUT',
            url: envService.read('apiUrl') + '/scene/replace/' + scene_id,
            eventHandlers: {
                "progress": function (c) {
                    var text = c.target.responseText;

                    text = text.split('##').splice(-1)[0];
                    if (text) {
                        //angular.element('#process').html(text);
                        text = text.split("%%");
                        if(text[0] == 100){
                            angular.element("#"+media_id).html('Complete.');
                        }else{
                            angular.element("#"+media_id).html(text[1]);
                        }
                    }
                }
            },
            onProgress: function(event) {
                //var text = event.target.responseText;
                //
                //text = text.split('##').splice(-1)[0];
                //if (text) {
                //    angular.element('#process').html(text);
                //}
                //
                //// auto scroll
                //var objDiv = document.getElementById("process");
                //objDiv.scrollTop = objDiv.scrollHeight;
            },
            data: {
                id: media_id,
                type:type,
                project_id:project_id,
                project_slug:project_slug,
                pano_type:pano_type
            }
        }).then(function(res) {
            d.resolve(res.data.status);
        }, function(res) {
            console.error(res, 'ERR: can not replace scene');
            d.reject(false);
        });

        return d.promise;
    }

    function update(scene) {
        var d = $q.defer();
        if (LptHelper.isEmpty(scene)) d.reject(false);
        $http.put(envService.read('apiUrl') + '/scene/' + scene._id, scene).then(function(res) {
            d.resolve(res.data.status);
        }, function(res) {
            console.error(res, 'ERR: can not update scene');
            d.reject(false);
        });

        return d.promise;
    }

    function updateLimitViewForAllScene(limitView, projectId, projectSlug) {
        var d = $q.defer();
        if (LptHelper.isEmpty(limitView)) d.reject(false);
        $http.put(envService.read('apiUrl') + '/scenes/save-limit-view',{
            limit_view: limitView,
            project_id: projectId,
            project_slug: projectSlug
        }).then(function(res) {
            d.resolve(res.data.status);
        }, function(res) {
            console.error(res, 'ERR: Can not update scene');
            d.reject(false);
        });

        return d.promise;
    }

    function get(id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/scene/' + id)
            .then(function(res) {
                d.resolve(res.data);
            }, function(res) {
                console.error('ERR: Get scene', res);
                d.reject(res);
            });

        return d.promise;
    }

    function remove(id, project_slug) {
        return $http.delete(envService.read('apiUrl') + '/scene/' + id + '?project_slug=' + project_slug);
    }
}
}());

;(function() {
"use strict";

SceneGroup.$inject = ["$q", "$http", "envService", "Alertify"];
angular.module('lapentor.app')
    .factory('SceneGroup', SceneGroup);

function SceneGroup($q, $http, envService, Alertify) {
    var groups = null;
    var service = {
        all: all,
        get: get,
        create: create,
        update: update,
        updateAll: updateAll,
        remove: remove,
    };

    return service;

    ///////// API calls

    function all(project_id) {
        var d = $q.defer();
        if (groups) {
            d.resolve(groups);
        } else {
            $http.get(envService.read('apiUrl') + '/groups', {
                    params: { project_id: project_id }
                })
                .then(function(res) {
                    d.resolve(res.data);
                }, function(res) {
                    console.error('ERR: Get all groups', res);
                    d.reject(res);
                });
        }

        return d.promise;
    }

    function create(title, project) {
        var d = $q.defer();
        $http.post(envService.read('apiUrl') + '/group/create', {
            title: title,
            project_id: project._id,
            project_slug: project.slug
        }).then(function(res) {
            d.resolve(res.data);
        }, function(res) {
            console.error('ERR: Create group', res);
            d.reject(res);
        });
        
        return d.promise;
    }

    function update(group) {
        var d = $q.defer();
        $http.put(envService.read('apiUrl') + '/group/' + group._id, group).then(function (res) {
            if(res.data.status == 1) {
                d.resolve(true);
            }else{
                d.reject(false);
            }
        }, function (res) {
            console.error('ERR: ',res);
            d.reject(false);
        });
        return d.promise;
    }

    function updateAll(groups, project_slug) {
        var d = $q.defer();
        $http.put(envService.read('apiUrl') + '/groups', {groups: groups, project_slug: project_slug}).then(function (res) {
            if(res.data.status == 1) {
                d.resolve(true);
            }else{
                d.reject(false);
            }
        }, function (res) {
            console.log(res);
            d.reject(false);
        });
        return d.promise;
    }

    function get(id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/group/' + id)
            .then(function(res) {
                d.resolve(res.data);
            }, function(res) {
                console.error('ERR: Get group', res);
                d.reject(res);
            });

        return d.promise;
    }

    function remove(id, project_slug) {
        var d = $q.defer();
        $http.delete(envService.read('apiUrl') + '/group/' + id + '?project_slug=' + project_slug).then(function (res) {
            if(res.data.status == 1) {
                d.resolve(true);
            }else{
                Alertify.error("Can not delete group");
                console.log(res);
                d.reject(false);
            }
        }, function (res) {
            Alertify.error("Can not delete group");
            console.log(res);
            d.reject(false);
        });

        return d.promise;
    }
}
}());

;(function() {
"use strict";

Showcase.$inject = ["$q", "$http", "$auth", "$state", "envService"];
angular.module('lapentor.app')
    .factory('Showcase', Showcase);

function Showcase($q, $http, $auth, $state, envService) {
    var service = {
        get: get,
        getRandomCover: getRandomCover
    };

    return service;

    ///////// API calls

    function getRandomCover() {
        var d = $q.defer();
        $http.get('http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US')
            .then(function(res) {
                if (res.images) {
                    var url = 'http://bing.com' + res.images[0].url;
                    d.resolve(url);
                } else {
                    d.reject();
                }
            }, function(res) {
                d.reject();
            });
        return d.promise;
    }

    function get(username) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/u/' + username)
            .then(function(res) {
                var user = res.data;
                if (user) {
                    d.resolve(user);
                } else {
                    d.reject();
                }
            }, function(res) {
                if (res.status == 404) {
                    $state.go('404');
                }
                d.reject(res);
            });

        return d.promise;
    }

}
}());

;(function() {
"use strict";

User.$inject = ["$q", "$http", "$state", "envService", "Alertify"];
angular.module('lapentor.app')
    .factory('User', User);

function User($q, $http, $state, envService, Alertify) {
    var service = {
        get: get,
        update: update,
        updateCard: updateCard,
        cancelSubscription: cancelSubscription,
        resumeSubscription: resumeSubscription,
        getInvoices: getInvoices,
        getProjectViews: getProjectViews
    };

    return service;

    function updateCard(token) {
        var deferred = $q.defer();
        $http.put(envService.read('apiUrl') + '/user/update-card', {
            stripeToken: token
        }).then(function(res) {
            deferred.resolve(res.data);
        }, function(res) {
            deferred.reject(res);
        });
        return deferred.promise;
    }

    function cancelSubscription() {
        var deferred = $q.defer();
        $http.put(envService.read('apiUrl') + '/user/cancel-subscription', {
        }).then(function(res) {
            deferred.resolve(res.data);
        }, function(res) {
            deferred.reject(res);
        });
        return deferred.promise;
    }

    function resumeSubscription() {
        var deferred = $q.defer();
        $http.put(envService.read('apiUrl') + '/user/resume-subscription', {
        }).then(function(res) {
            deferred.resolve(res.data);
        }, function(res) {
            deferred.reject(res);
        });
        return deferred.promise;
    }

    function get() {
        var deferred = $q.defer();

        $http.get(envService.read('apiUrl') + '/user/me')
            .then(function(res) {
                deferred.resolve(res.data);
            }, function(res) {
                deferred.reject(res);
            });

        return deferred.promise;
    }

    function update(user) {
        var d = $q.defer();
        $http.put(envService.read('apiUrl') + '/user/me', user)
            .then(function(res) {
                d.resolve(res.data.status);
            }, function(res) {
                if (res.status == 400) {
                    angular.forEach(res.data.errors.message, function(msgs, key) {
                        angular.forEach(msgs, function(msg) {
                            Alertify.error(msg);
                        });
                    });
                }
                d.reject(false);
            });

        return d.promise;
    }

    function getInvoices() {
        var deferred = $q.defer();

        $http.get(envService.read('apiUrl') + '/user/me/invoices')
            .then(function(res) {
                deferred.resolve(res.data);
            }, function(res) {
                deferred.reject(res);
            });

        return deferred.promise;
    }

    function getProjectViews(params) {
        var deferred = $q.defer();

        $http.get(envService.read('apiUrl') + '/google-analytics', {
            params: params
        })
            .then(function(res) {
                deferred.resolve(res.data);
            }, function(res) {
                deferred.reject(res);
            });

        return deferred.promise;
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.themes')
    .directive('controlbar', ["$compile", "$rootScope", "LptHelper", function($compile, $rootScope, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=',
                project: '=',
                lptsphereinstance: '='
            },
            link: function(scope, element, attrs) {
                scope.onbtnclick = function(btn) {
                        $rootScope.$emit('evt.controlbar.' + btn.plugin_slug + btn.id, 'click');
                    }
                    // Interface method
                scope.initDefaultConfig = initDefaultConfig;

                if (angular.isUndefined(scope.project.theme_controlbar)) return;

                // Force init config as Object
                if (angular.isUndefined(scope.project.theme_controlbar.config)) scope.project.theme_controlbar.config = {};

                // Load style
                // if (angular.isDefined(scope.project.theme_controlbar) && angular.isDefined(scope.project.theme_controlbar.slug)) {
                //     loadThemeStyle(scope.project.theme_controlbar.slug);
                // } else {
                //     loadThemeStyle('default');
                // }

                //  Watch method to detect changes on project config and re-render child Theme
                generateChildDirective(scope.project.theme_controlbar.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeSlug) {
                    // Generate Theme element
                    var generatedTemplate = '<controlbar-' + themeSlug + '></controlbar-' + themeSlug + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                function initDefaultConfig(configModel, defaultConfig) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Define <hotspot> directive that generate hotspot base on theme and add it into scene
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspot', ["$compile", "$sce", "$timeout", "$window", "$uibModal", "$rootScope", "LptHelper", "$filter", function($compile, $sce, $timeout, $window, $uibModal, $rootScope, LptHelper, $filter) {
        return {
            restrict: 'E',
            scope: {
                scene: '=', // current loaded scene
                hotspot: '=',
                project: '=', // all project data
                lptsphereinstance: '=' // lptSphere instance to manipulate sphere
            },
            link: function(scope, element, attrs) {
                var myAudio = null,
                    thisHotspot = scope.hotspot;
                // Register hotspot GLOBAL method
                scope.loadScene = loadScene;
                scope.addHotspotToViewer = addHotspotToViewer;
                scope.config = scope.project.theme_hotspot.config;

                // scope.onHotspotClick = onHotspotClick;

                if (angular.isUndefined(scope.project.theme_hotspot.slug)) scope.project.theme_hotspot.slug = "default";
                // Force init config as Object
                if (angular.isUndefined(scope.project.theme_hotspot.config)) scope.project.theme_hotspot.config = {};

                // Register hotspot GLOBAL properties
                scope.hotspot.name = 'lptHotspot' + scope.hotspot._id;
                scope.themePath = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', scope.project.theme_hotspot.slug);

                element.empty();

                $rootScope.$on('evt.krpano.hp' + thisHotspot.name, function() {
                    scope.lptsphereinstance.set('hotspot', {
                        name: thisHotspot.name,
                        "sprite.id": "sprite-" + thisHotspot.name
                    });
                    generateDirective(scope.project.theme_hotspot.slug);
                })
                $timeout(function() {
                    // Only generate directive if hotspot have UI layout
                    generateDirective(scope.project.theme_hotspot.slug);

                    // Add default behaviour for all point hotspot
                    switch (thisHotspot.type) {
                        case 'video':
                            scope.lptsphereinstance.addHotspotEventCallback(thisHotspot.name, 'onclick', function() {
                                checkPassword(_onVideoHotspotClick);
                            });
                            break;
                        case 'point':
                            scope.lptsphereinstance.addHotspotEventCallback(thisHotspot.name, 'onclick', function() {
                                checkPassword(gotoScene);
                            });

                            scope.lptsphereinstance.addHotspotEventCallback('c-'+thisHotspot.name, 'onclick', gotoScene);
                            break;
                        case 'url':
                            // Attach events to this hotspot
                            scope.lptsphereinstance.addHotspotEventCallback(thisHotspot.name, 'onclick', function() {
                                checkPassword(_onUrlHotspotClick);
                            });
                        case 'article':
                            scope.hotspot.content = $sce.trustAsHtml(scope.hotspot.content);
                            break;
                        case 'textf':
                            scope.hotspot.content = $sce.trustAsHtml(scope.hotspot.content);
                            break;
                        case 'sound':
                            // sound hotspot no need for theme
                            var loop = (thisHotspot.is_loop == 1) ? 'loop' : '';
                            var soundTemplate = '<audio class="lpt-sound-hotspot" muted="muted" id="sound-' + thisHotspot._id + '" '+ (thisHotspot.autoplay === 'off' ? '' : 'autoplay') +' ' + loop + '><source src="' + thisHotspot.src + '" type="audio/mp3"></audio>';
                            element.append($compile(soundTemplate)(scope));
                            myAudio = document.getElementById('sound-' + thisHotspot._id);
                            initSoundHotspot();

                            // Attach events to this hotspot
                            scope.lptsphereinstance.addHotspotEventCallback(thisHotspot.name, 'onclick', function() {
                                if (myAudio) {
                                    if (myAudio.paused) {
                                        stopAllSoundHotspot();
                                        myAudio.muted = false;
                                        myAudio.play();
                                    }else{
                                        myAudio.pause();

                                        if (thisHotspot.click_action === 'restart') {
                                            myAudio.currentTime = 0;
                                        }
                                    }
                                }
                            });
                            break;
                    }
                }, 100);

                function checkPassword(successCallback) {
                    LptHelper.checkHotspotPassword(thisHotspot, successCallback);
                }

                function gotoScene() {
                    if (thisHotspot.target_scene_id) {
                        var targetScene = LptHelper.getObjectBy('_id', thisHotspot.target_scene_id, scope.project.scenes);
                        if (thisHotspot.target_view) {
                            targetScene.target_view = thisHotspot.target_view;
                        }
                        $rootScope.$emit('evt.livesphere.changescene', targetScene);
                    }
                }

                function stopAllSoundHotspot() {
                    var listSoundHotspots = document.getElementsByClassName("lpt-sound-hotspot");
                    for(var i = 0, len = listSoundHotspots.length; i < len;i++){
                        listSoundHotspots[i].pause();
                    }
                }

                var audioInited = []

                function initSoundHotspot() {
                    // Hotspot sound
                    if (scope.hotspot.type == 'sound') {
                        // Detect user interaction & do audio trick
                        document.body.addEventListener('click', function() {
                            if(myAudio && audioInited.indexOf(myAudio.id) === -1) {
                                audioInited.push(myAudio.id);
                                try {
                                    myAudio.play();
                                } catch (error) {
                                    
                                }
                                if (!(scope.hotspot.autoplay === "on")) {
                                    myAudio.pause();
                                    myAudio.currentTime = 0;
                                }
                            }
                        }, false);

                        if (thisHotspot.autoplay === 'off') {
                            myAudio.pause();
                        }

                        //Mobile only play audio if user interact with browser element
                        if (isMobile.any) {
                            var listenAllowMusicMobile = $rootScope.$on('evt.allowMusicMobile', function() {
                                localStorage.setItem('sound.allow', 'yes');
                                if (localStorage.getItem('sound') != "off") {
                                    myAudio.play();
                                    if (thisHotspot.autoplay === 'off') {
                                        myAudio.pause();
                                    }
                                }

                                listenAllowMusicMobile();
                            });
                        }

                        if (myAudio.muted) myAudio.muted = false;

                        $rootScope.$on('evt.krpano.onviewchange', function() {
                            try {
                                var volume = scope.hotspot.volume / 100;
                                if (myAudio != null) {
                                    myAudio.volume = calcVolume(scope.hotspot.position.x, scope.hotspot.position.y, scope.hotspot.reach) * volume;
                                }
                            } catch (e) {
                                // console.error(e);
                            }
                        });

                        if (localStorage.getItem('sound') == 'off') {
                            myAudio.pause();
                        }
                    }
                }

                function calcVolume(ath, atv, dp) {
                    var view = scope.lptsphereinstance.screentosphere($window.innerWidth / 2, $window.innerHeight / 2),
                        x = view.x,
                        y = view.y,
                        hp_left = ath - dp,
                        hp_right = ath + dp,
                        hp_top = atv - dp,
                        hp_bottom = atv + dp,
                        kc_h, kc_v, volume;
                    if (x - hp_left > 360) {
                        x = x - 360;
                    }
                    if ((hp_right - x) > 360) {
                        x = x + 360;
                    }
                    if (hp_left < x && x < hp_right && hp_top < y && y < hp_bottom) {
                        if (x < ath) kc_h = ath - x;
                        if (x > ath) kc_h = x - ath;
                        if (y < atv) kc_v = atv - y;
                        if (y > atv) kc_v = y - atv;
                        if (kc_h > kc_v) {
                            volume = (dp - kc_h) / dp;
                        } else {
                            volume = (dp - kc_v) / dp;
                        }
                        volume = volume.toFixed(2);
                    } else {
                        volume = 0;
                    }
                    return volume;
                }

                function loadScene(xml) {
                    if (angular.isDefined(scope.lptsphereinstance)) {
                        scope.lptsphereinstance.loadScene(xml);
                    } else {
                        console.error('lptsphereinstance is undefined');
                    }
                }

                // Generate child Theme
                function generateDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId;
                    var generatedTemplate = '<' + directiveName + ' id="' + thisHotspot.name + '" class="hotspot-move-trigger" px="' + thisHotspot.position.x + '" py="' + thisHotspot.position.y + '" size="' + thisHotspot.width + '"></' + directiveName + '>';

                    var htmlThemes = ['bubble', 'royal', 'gify', 'crystal', 'pentagon'];
                    if (htmlThemes.indexOf(themeId) != -1) {
                        angular.element('#sprite-' + thisHotspot.name).empty();
                        angular.element('#sprite-' + thisHotspot.name).append($compile(generatedTemplate)(scope));
                    } else {
                        element.empty();
                        element.append($compile(generatedTemplate)(scope));
                    }
                }

                // Add hotspot to viewer
                function addHotspotToViewer(hotspot, isVisible, isHtml) {
                    if (angular.isUndefined(iconUrl)) {
                        var iconUrl = LptHelper.makeUrl(scope.themePath, 'images', hotspot.type + '.png');
                    }
                    // Apply custom hotspot icon to whole set
                    try {
                        var config = scope.project.theme_hotspot.config;
                        if (config[scope.hotspot.type + '_icon_custom']) {
                            iconUrl = config[scope.hotspot.type + '_icon_custom'];
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

                    // if (hotspot.type == 'sound') {
                    //     iconUrl = null;
                    // }

                    if (angular.isUndefined(isVisible)) {
                        isVisible = true;
                    }

                    var hotspotConfig = {
                        title: hotspot.title,
                        name: hotspot.name,
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

                    scope.lptsphereinstance.addHotspot(hotspotConfig);
                }

                function _onVideoHotspotClick() {
                    if(!thisHotspot.src) return;
                    
                    switch (thisHotspot.display_type) {
                        case 'window':
                            if ($filter('parseEmbed')(thisHotspot.src)) {
                                scope.hotspotVideoSrc = $filter('parseEmbed')(thisHotspot.src);
                                scope.hotspotVideoSrc = $sce.trustAsHtml(scope.hotspotVideoSrc);
                            }
                            scope.closeHotspotVideo = function() {
                                angular.element('#hotspot-video-' + thisHotspot.name).remove();
                            };
                            if (!thisHotspot.window_width) thisHotspot.window_width = 480;
                            if (!thisHotspot.window_height) thisHotspot.window_height = 300;
                            if (!thisHotspot.window_position) thisHotspot.window_position = 'bottom-right';

                            var generatedTemplate = '<div id="hotspot-video-'+thisHotspot.name+'" class="hotspot-'+ scope.project.theme_hotspot.slug +'-window-video hotspot-window-video '+thisHotspot.window_position+'" style="width: '+thisHotspot.window_width+'px; height: '+thisHotspot.window_height+'px"><div class="close" ng-click="closeHotspotVideo()"><i class="ilpt-close"></i></div><div ng-bind-html="hotspotVideoSrc"></div></div>';
                            angular.element('.hotspot-window-video').remove();
                            element.append($compile(generatedTemplate)(scope));
                            break;
                    
                        default: // popup
                            angular.element('.hotspot-window-video').remove();
                            
                            $uibModal.open({
                                template: '<div class="hotspot-modal hotspot-'+ scope.project.theme_hotspot.slug +'-video hotspot-modal-video"><div class="close close-black" ng-click="cancel()"><i class="ilpt-close"></i></div><div style="line-height: 0;" ng-bind-html="hotspotSrc"></div></div>',
                                scope: scope,
                                controller: ["$scope", "$uibModalInstance", "$filter", function($scope, $uibModalInstance, $filter) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                    $scope.config = scope.project.theme_hotspot.config ? scope.project.theme_hotspot.config : {};
        
                                    if ($filter('parseEmbed')(thisHotspot.src)) {
                                        $scope.hotspotSrc = $filter('parseEmbed')(thisHotspot.src);
                                        $scope.hotspotSrc = $sce.trustAsHtml($scope.hotspotSrc);
                                    }
                                }]
                            });
                            break;
                    }
                }

                function _onUrlHotspotClick() {
                    if (angular.isDefined(thisHotspot.url)) {
                        var pattern = /^((http|https):\/\/)/;

                        if (!pattern.test(thisHotspot.url) && thisHotspot.url.indexOf('mailto') === -1) {
                            thisHotspot.url = "http://" + thisHotspot.url;
                        }
                        if (thisHotspot.iframe) {
                            $uibModal.open({
                                template: '<div class="hotspot-modal hotspot-url-iframe-popup"><iframe src="' + thisHotspot.url + '" style="width:100%;height: 80vh"></iframe>' +
                                    '<span class="close close-black" ng-click="cancel()"><i class="ilpt-close"></i></span>' +
                                    '</div>',
                                size: 'lg',
                                // windowClass : "hotspot-url-iframe-" + scope.project.theme_hotspot.slug,
                                scope: scope,
                                controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                }]
                            });
                            return;
                        } else {
                            if (thisHotspot.url.indexOf('mailto') !== -1) {
                                location.href = thisHotspot.url;
                            } else {
                                window.open(thisHotspot.url, '_blank');
                            }
                        }
                    }
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.themes')
    .directive('sceneList', ["$compile", "$timeout", "LptHelper", function($compile, $timeout, LptHelper) {
        return {
            restrict: 'E',
            scope: {
                scene: '=',
                project: '=',
                lptsphereinstance: '='
            },
            link: function(scope, element, attrs) {
                // Interface method
                scope.ScenelistHelper = {
                    initDefaultConfig: initDefaultConfig,
                    getConfig: getConfig,
                    allGroupIsEmpty: true
                };

                angular.forEach(scope.project.groups, function(g) {
                    if (g.scenes.length) {
                        scope.ScenelistHelper.allGroupIsEmpty = false;
                        return;
                    }
                });

                if (angular.isUndefined(scope.project.theme_scenelist)) return;
                // Force init config as Object
                if (angular.isUndefined(scope.project.theme_scenelist.config)) scope.project.theme_scenelist.config = {};

                // Load style
                // if (angular.isDefined(scope.project.theme_scenelist) && angular.isDefined(scope.project.theme_scenelist.slug)) {
                //     loadThemeStyle(scope.project.theme_scenelist.slug);
                // } else {
                //     loadThemeStyle('default');
                // }

                //  Watch method to detect changes on project config and re-render child Theme
                generateChildDirective(scope.project.theme_scenelist.slug);

                /////////////////

                function getConfig() {
                    try {
                        var config = scope.project.theme_scenelist.config ? scope.project.theme_scenelist.config : {};
                    } catch (e) {
                        var config = {};
                    }
                    return config;
                }

                // Generate child Theme
                function generateChildDirective(themeSlug) {
                    // Generate Theme element
                    var generatedTemplate = '<scenelist-' + themeSlug + '></scenelist-' + themeSlug + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                function initDefaultConfig(defaultConfig, configModel) {
                    // Loop through all defaultConfig properties and find out if it's set or not, if not then grap the default value
                    angular.forEach(defaultConfig, function(val, key) {
                        configModel[key] = angular.isUndefined(configModel[key]) ? val : configModel[key];
                    });
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginArrows', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            template: '<style>.hotspot-{{project.theme_hotspot.slug}}-point{display: none!important;}</style>',
            controller: ["$scope", "$ocLazyLoad", "$timeout", "$rootScope", "LptHelper", function($scope, $ocLazyLoad, $timeout, $rootScope, LptHelper) {

                var vm = $scope.pluginVm,
                    loop = 0,
                    krpano = vm.lptsphereinstance.krpano();
                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    krpano.set('krpano.arrows',true);
                    var webvrIsEnable = krpano.get('webvr.isenabled');
                    try {
                        if (!webvrIsEnable &&  krpano.get('view.fisheye') == 0) {
                            addchevrons();

                        }
                    } catch (e) {
                        console.error(e);
                        addchevrons();
                    }
                    angular.element('.hotspot-' + $scope.project.theme_hotspot.slug + '-point').css('display', 'none');
                });

                function addchevrons() {
                    var y = 0;

                    for (var i = 0; i < krpano.get('hotspot.count'); i++) {

                        if(krpano.get('hotspot['+i+'].lpttype') && krpano.get('hotspot['+i+'].sceneId') == krpano.get('krpano.sceneId') && krpano.get('hotspot['+i+'].hptype') !='clone' ){
                            if(krpano.get('hotspot['+i+'].lpttype') == 'point' ){
                                if(krpano.get('hotspot['+i+'].onclick') != null){
                                    y++;
                                }
                            }else{
                                y++;
                            }
                        }            
                    }

                    if( y == $scope.scene.hotspots.length ){
                        krpano.call("removechevrons()");
                        krpano.call("addchevrons()");
                    }else{
                        if(loop < 50 ){
                            loop++;
                            $timeout(function() {
                               addchevrons();     
                            }, 100);
                        } 
                    }
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginAutotransitionConfigCtrl', ["$scope", "LptHelper", "project", "item", function($scope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config;

        ///////
        vm.updateConfig = function() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginAutotransition', function() {
        return {
            restrict: 'E',
            // controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                var scenes = [];

                if($scope.project.groups && $scope.project.groups.length > 0){
                    angular.forEach($scope.project.groups, function(group, key) {

                        if(group.scenes.length > 0){
                            angular.forEach(group.scenes, function(g_scene, key) {
                                angular.forEach($scope.project.scenes, function(scene, key) {
                                    if(g_scene._id == scene._id){
                                        scenes.push(scene);
                                    }
                                });
                            });
                        }
                    });
                }else{
                    scenes = $scope.project.scenes;

                }

                var time;

                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    $timeout.cancel(time);
                    var index = 0;

                    angular.forEach(scenes, function(scene, key) {
                        if($scope.scene._id == scene._id){
                            index = key;
                        }
                    });

                    var newScene = scenes[index+1];

                    if (!newScene) {
                        newScene = scenes[0];
                    }

                    krpano.set('krpano.autorotate', true);
                    if (vm.config.enabled) {
                        if( krpano.get('view.fisheye') != 0 || krpano.get('webvr.isenabled') ){

                            krpano.set('autorotate.enabled', false);
                        }else{
                            krpano.set('autorotate.enabled', true);
                        }
                        krpano.set('autorotate.waittime', vm.config.waittime ? vm.config.waittime : 2);
                        krpano.set('autorotate.speed', vm.config.speed ? vm.config.speed : 1);
                    }else{
                        krpano.set('krpano.autorotate', false);
                    }
                    if (vm.config.changeEnabled) {
                        if (scenes && scenes.length > 1) {
                            angular.element('html,body').on('mousedown mousewheel', function() {
                                $timeout.cancel(time);
                                nextScene(newScene);
                            });
                            nextScene(newScene);
                        }
                    }
                }


                function nextScene(scene) {

                    time = $timeout(function() {
                        if(!krpano.get('webvr.isenabled')){
                            $rootScope.$emit('evt.livesphere.changescene', scene);
                        }else{
                            nextScene(scene);
                        }
                    }, vm.config.changeWaittime ? parseInt(vm.config.changeWaittime + '000') : 10000)
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// $scope inherited from marketplace.item.config.js
pluginBackgroundsoundConfigCtrl.$inject = ["$scope", "$sce", "$rootScope", "$timeout", "project", "item"];
angular
  .module("lapentor.marketplace.plugins")
  .controller(
    "pluginBackgroundsoundConfigCtrl",
    pluginBackgroundsoundConfigCtrl
  );

/**
 * Controller for Google map plugin config modal
 * @param  {object} project   [project resolved]
 * @param  {object} item      [it can be theme or plugin]
 */
function pluginBackgroundsoundConfigCtrl(
  $scope,
  $sce,
  $rootScope,
  $timeout,
  project,
  item
) {
  var vm = this;
  vm.project = project;
  vm.scenes = project.scenes;
  vm.updateConfig = updateConfig;
  vm.openMediaLib = openMediaLib;
  vm.trustAsResourceUrl = trustAsResourceUrl;
  vm.config = item.config ? item.config : {};
  vm.config.audios = angular.isDefined(vm.config.audios)
    ? vm.config.audios
    : {};

  vm.toggleAll = function () {
    var toggleStatus = vm.select_all;
    angular.forEach(
      vm.config.audios[vm.targetAudio].scenes,
      function (itm, key) {
        vm.config.audios[vm.targetAudio].scenes[key] = toggleStatus;
      }
    );
  };

  vm.selectScene = function () {
    vm.select_all = true;
    angular.forEach(
      vm.config.audios[vm.targetAudio].scenes,
      function (itm, key) {
        if (!itm) vm.select_all = false;
      }
    );
  };

  vm.showOptionAudio = function (id) {
    vm.targetAudio = id;
    vm.config.audios[vm.targetAudio]["scenes"] =
      vm.config.audios[vm.targetAudio]["scenes"] || {};
    angular.forEach(vm.scenes, function (scene, key) {
      //vm.config.logos[vm.targetLogo]['scenes'][scene._id] = vm.config.logos[vm.targetLogo]['scenes'][scene._id] || true;
      if (
        angular.isUndefined(
          vm.config.audios[vm.targetAudio]["scenes"][scene._id]
        )
      ) {
        vm.config.audios[vm.targetAudio]["scenes"][scene._id] = false;
      }
    });
    vm.selectScene();
  };

  vm.deleteAudio = function (id) {
    delete vm.config.audios[id];
  };

  // Init
  chooseFirstAudio();

  ////// Internal functions

  function updateConfig() {
    vm.isUpdating = true;
    vm.config.version = 1;

    // Validate before submit
    var errorAudios = [];
    angular.forEach(vm.config.audios, function (au) {
        var allIsFalse = true;

        angular.forEach(au.scenes, function (scene) {
            if (scene) allIsFalse = false;
        })

        if (allIsFalse) {
            errorAudios.push(au.name);
        }
    })

    if (errorAudios.length) {
        vm.isUpdating = false;
        vm.errorMsg = 'Please choose at least one Scene to play for these sounds: ' + errorAudios.join(', ');

        $timeout(function () {
            vm.errorMsg = '';
        }, 4000);
    } else {
        $scope.updateConfig(item, vm.config, function () {
            vm.isUpdating = false;
        });
    }
  }

  /**
   * Open Media Library
   */
  function openMediaLib() {
    $rootScope.$broadcast("evt.openMediaLib", {
      tab: "asset",
      chooseAssetCallback: __chooseAssetCallback,
      canChooseMultipleFile: true,
    });
  }

  /**
   * Callback to receive file choosed from Media Library
   * @param  {object} file [file object contain file info from DB]
   */
  function __chooseAssetCallback(files) {
    var fileIds = [];
    if (vm.config.audios) {
      angular.forEach(vm.config.audios, function (value, key) {
        fileIds.push(value._id);
      });
    }

    angular.forEach(files, function (value, key) {
      var file = value;

      if (
        file.mime_type.indexOf("audio") != -1 &&
        fileIds.indexOf(file._id) < 0
      ) {
        file.volume = 80;
        file.is_loop = "1";
        vm.config.audios[file._id] = file;
      }
    });

    chooseFirstAudio();
  }

  function chooseFirstAudio() {
    try {
      if (vm.config.audios && Object.keys(vm.config.audios).length)
        vm.showOptionAudio(Object.values(vm.config.audios)[0]._id);
    } catch (error) {
      console.error(error);
    }
  }

  function trustAsResourceUrl(url) {
    return $sce.trustAsResourceUrl(url);
  }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginDetailGooglemap', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + 'googlemap/tpl/detail.html',
            controller: ["$scope", function($scope) {
                var vm = $scope.vm;
            }],
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginBackgroundsound', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            template: '<audio ng-if="!vm.pluginInterface.config.version" muted="muted" id="background-sound" autoplay><source id="background-source" src="{{ getAudioUrl() }}" type="audio/mpeg"></audio>' +
            '<audio ng-if="vm.pluginInterface.config.version" ng-repeat="audio in vm.pluginInterface.config.audios" muted="muted" id="background-sound-{{ audio._id }}"><source id="background-source-{{ audio._id }}"  type="audio/mpeg"></audio>',
            controller: ["$scope", "$sce", "$rootScope", "$timeout", function($scope, $sce, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                if(!vm.pluginInterface.config.version){
                    try {
                        $timeout(function() {
                            document.getElementById("background-sound").onplay = function() {
                                //document.getElementById("background-sound").volume = vm.pluginInterface.config.volume / 100;
                                if (vm.pluginInterface.config.is_loop == 1) {
                                    document.getElementById("background-sound").loop = true;
                                }
                            };
                        });
                    } catch (e) {
                        console.error(e);
                    }
                    try {
                        if (isMobile.any) {
                            $rootScope.$on('evt.allowMusicMobile', function() {
                                if (localStorage.getItem('sound') != "off" && document.getElementById('background-sound')) {
                                    document.getElementById('background-sound').play();
                                }
                            });
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }


                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    vm.sceneId = $scope.scene._id;

                    if (!angular.isUndefined(vm.pluginInterface.config.audios) && vm.pluginInterface.config.version == 1){
                        angular.forEach(vm.pluginInterface.config.audios, function(audio, key) {

                            var $audio = document.getElementById('background-sound-'+audio._id);
                            var $source = document.getElementById('background-source-'+audio._id);

                            if (!angular.isUndefined(audio['scenes']) && !angular.isUndefined(audio['scenes'][vm.sceneId]) && audio['scenes'][vm.sceneId]){

                                if(angular.isUndefined(audio.run)){

                                    $source.src = audio.path;
                                    $audio.load();
                                    $audio.muted = false;

                                    $rootScope.$on('evt.allowAutoplayAudio', function() {
                                        $audio.play();
                                    });
                                    
                                    var playPromise =  $audio.play();

                                    try {
                                        if (playPromise !== undefined) {
                                            playPromise.catch(function() {
                                                $rootScope.$broadcast('evt.showConfirmPermission');
                                            });
                                        }
                                    } catch (error) {
                                        console.error(error);
                                    }

                                    if(audio.is_loop == "1"){
                                        $audio.loop = true;
                                    }else{
                                        $audio.loop = false;
                                    }
                                    audio.run = true;
                                    try {
                                        if (isMobile.any) {
                                            $rootScope.$on('evt.allowMusicMobile', function() {
                                                if (localStorage.getItem('sound') != "off") {
                                                    $audio.load();
                                                    $audio.play();
                                                    $audio.volume = audio.volume / 100;
                                                }
                                            });
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    }

                                }
                                if(audio.run){
                                    $audio.volume = audio.volume / 100;
                                }
                            }else{
                                if(audio.run){
                                    $audio.volume = 0;
                                }

                            }
                        });
                    }else{
                        try{
                            if (vm.pluginInterface.config.scenes[$scope.scene._id] && vm.pluginInterface.config.scenes[$scope.scene._id] == true) {
                                document.getElementById("background-sound").volume = vm.pluginInterface.config.volume / 100;
                            }else{
                                document.getElementById("background-sound").volume = 0;
                            }
                        }catch(e){
                            // console.error(e);
                        }
                    }
                }
                $scope.getAudioUrl = function() {
                    return $sce.trustAsResourceUrl(vm.pluginInterface.config.src);
                };
            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginChangesceneeffectConfigCtrl', ["$scope", "LptHelper", "project", "item", function($scope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config;
        vm.blend = {
            'Simple crossblending' : 'simple-crossblending',
            'Zoom blend' : 'zoom-blend',
            'Black-out' : 'black-out',
            'White-flash' : 'white-flash',
            'Right-to-left' : 'right-to-left',
            'Top-to-bottom' : 'top-to-bottom',
            'Diagonal' : 'diagonal',
            'Circle open' : 'circle-open',
            'Vertical open' : 'vertica-open',
            'Horizontal open' : 'horizontal-open',
            'Elliptic + zoom' : 'elliptic-zoom'
        }
        ///////
        vm.updateConfig = function() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginChangesceneeffect', function() {
        return {
            restrict: 'E',
            controller: ["$scope", "$rootScope", function($scope, $rootScope) {
                var vm = $scope.pluginVm;
                try {
                    if (vm.config.effect_type) {
                        if(vm.config.effect_type == 'simple-crossblending'){
                            $rootScope.changeSceneEffect = 'BLEND('+(vm.config.time || '1.0')+', easeInCubic)';
                        }else if(vm.config.effect_type == 'zoom-blend'){
                            $rootScope.changeSceneEffect = 'ZOOMBLEND('+(vm.config.time || '2.0')+', 2.0, easeInOutSine)';
                        }else if(vm.config.effect_type == 'black-out'){
                            $rootScope.changeSceneEffect = 'COLORBLEND('+(vm.config.time || '2.0')+', 0x000000, easeOutSine)';
                        }else if(vm.config.effect_type == 'white-flash'){
                            $rootScope.changeSceneEffect = 'LIGHTBLEND('+(vm.config.time || '1.0')+', 0xFFFFFF, 2.0, linear)';
                        }else if(vm.config.effect_type == 'right-to-left'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 0.0, 0.2, linear)';
                        }else if(vm.config.effect_type == 'top-to-bottom'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 90.0, 0.01, linear)';
                        }else if(vm.config.effect_type == 'diagonal'){
                            $rootScope.changeSceneEffect = 'SLIDEBLEND('+(vm.config.time || '1.0')+', 135.0, 0.4, linear)';
                        }else if(vm.config.effect_type == 'circle-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', 0.0, 0.2, 0.0, linear)';
                        }else if(vm.config.effect_type == 'vertica-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '0.7')+', 1.0, 0.1, 0.0, linear)';
                        }else if(vm.config.effect_type == 'horizontal-open'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', -1.0, 0.3, 0.0, linear)';
                        }else if(vm.config.effect_type == 'elliptic-zoom'){
                            $rootScope.changeSceneEffect = 'OPENBLEND('+(vm.config.time || '1.0')+', -0.5, 0.3, 0.8, linear)';
                        }else{
                            $rootScope.changeSceneEffect = vm.config.effect_type;
                        }

                    }
                } catch (e) {
                    console.error(e);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginCommonbuttons', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", function($scope, $rootScope) {
                var vm = $scope.pluginVm;

                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'commonbuttons-';
                $rootScope.$on(eventPrefix+'zoomin', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.zoomIn();
                    }
                });
                $rootScope.$on(eventPrefix+'zoomout', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.zoomOut();
                    }
                });
                $rootScope.$on(eventPrefix+'fullscreen', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.toggleFullScreen();
                    }
                });
                $rootScope.$on(eventPrefix+'up', function(event, eventType) {
                    if (eventType == 'click') {
                        var vlookat = vm.lptsphereinstance.krpano().get('view.vlookat') - 10;
                        vm.lptsphereinstance.tween('view.vlookat',vlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'down', function(event, eventType) {
                    if (eventType == 'click') {
                        var vlookat = vm.lptsphereinstance.krpano().get('view.vlookat') + 10;
                        vm.lptsphereinstance.tween('view.vlookat',vlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'left', function(event, eventType) {
                    if (eventType == 'click') {
                        var hlookat = vm.lptsphereinstance.krpano().get('view.hlookat') - 10;
                        vm.lptsphereinstance.tween('view.hlookat',hlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'right', function(event, eventType) {
                    if (eventType == 'click') {
                        var hlookat = vm.lptsphereinstance.krpano().get('view.hlookat') + 10;
                        vm.lptsphereinstance.tween('view.hlookat',hlookat);
                    }
                });
                var isplay = true;
                $rootScope.$on(eventPrefix+'sound', function(event, eventType) {
                    if (eventType == 'click') {
                        var audios = angular.element('audio');
                        if(isplay) {
                            // angular.element('#commonbuttons-sound span').css('background-image','url('+vm.pluginPath + '/images/soundoff.svg'+')');
                            angular.forEach(audios, function(audio){
                                audio.pause();
                            });
                            isplay = false;
                            localStorage.setItem('sound','off');
                            $rootScope.$emit('evt.commonbuttons.togglesound', 'off');
                        }else{
                            isplay = true;
                            // angular.element('#commonbuttons-sound span').css('background-image','url('+vm.pluginPath + '/images/soundon.svg'+')');
                            angular.forEach(audios, function(audio){
                                audio.play();
                            });
                            localStorage.setItem('sound','on');
                            $rootScope.$emit('evt.commonbuttons.togglesound', 'on');
                        }

                    }
                });
            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginCopyrightConfigCtrl', ["$scope", "$rootScope", "$ocLazyLoad", "$http", "LptHelper", "project", "item", function($scope,$rootScope,$ocLazyLoad,$http, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);
        vm.textSummernoteOptions = {
            height: 200,
            focus: true,
            dialogsInBody: true,
            toolbar: [
                ['style', ['bold', 'italic', 'underline','link', 'picture']],
            ]
        };

        vm.googlefonts = [];
        
        vm.positionOptions = [{
            value: 'top-left',
            title: 'Top left'
        },{
            value: 'top-right',
            title: 'Top right'
        },{
            value: 'bottom-left',
            title: 'Bottom left'
        },{
            value: 'bottom-right',
            title: 'Bottom right'
        }];

        // init config
        vm.config = item.config || {};
        vm.config.position = vm.config.position || 'bottom-right';
        vm.config.offest_top = vm.config.offest_top || 20;
        vm.config.offest_left = vm.config.offest_left || 0;
        vm.config.offest_right = vm.config.offest_right || 0;
        vm.config.offest_bottom = vm.config.offest_bottom || 20;
        vm.config.color = vm.config.color || '#ffffff';
        vm.config.text = vm.config.text || 'text here';
        
        // functions
        vm.updateConfig = updateConfig;
        vm.fontFamilyChange = fontFamilyChange;

        if(vm.config.fontfamily){
            $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
        }

        $http.get('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDY31rAJVkfb6GoONiVs03LB87ThdbHZj0')
            .then(function(res) {
                if(res.data) {
                    vm.googlefonts = res.data.items;
                }
            }, function(res) {
                console.log(res);
            });

        /////////
        
        function fontFamilyChange(){
            if(!angular.isDefined(vm.config.fontfamily) ||  vm.config.fontfamily !=""){
                $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
            }
        }

        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginCopyright', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/copyright/tpl/copyright.html',
            controllerAs: 'vm',
            controller: ["$scope", "$ocLazyLoad", "$timeout", "$rootScope", "LptHelper", function($scope,$ocLazyLoad, $timeout, $rootScope, LptHelper) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.config.position = vm.config.position || 'bottom-right';
                if(vm.config.url && vm.config.url.indexOf('http') == -1) {
                    vm.config.url = 'http://' + vm.config.url;
                }
                
                if(vm.config.fontfamily){
                    $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
                }
                vm.style = {
                    'font-family': vm.config.fontfamily || 'sans-serif',
                    'font-size': vm.config.fontsize || 14,
                    'color': vm.config.color || 'white'
                };

                switch(vm.config.position) {
                    case 'top-left':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.left = vm.config.offset_left || 0;
                        break;
                    case 'top-right':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.right = vm.config.offset_right || 0;
                        break;
                    case 'bottom-left':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.left = vm.config.offset_left || 0;
                        break;
                    case 'bottom-right':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.right = vm.config.offset_right || 0;
                        break;
                    case 'bottom-center':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        break;
                    default: // top-center
                        vm.style.top = vm.config.offset_top || 20;
                        break;
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.currentSceneTitle = $scope.scene.title;
                });
            }]
        }
    });
}());

;(function() {
"use strict";

pluginCustomcodeConfigCtrl.$inject = ["$scope", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginCustomcodeConfigCtrl', pluginCustomcodeConfigCtrl);

function pluginCustomcodeConfigCtrl($scope, project, item) {
    var vm = this;
    vm.project = project;
    vm.config = item.config || {};

    vm.updateConfig = updateConfig;

    //////

    function updateConfig() {
        vm.isUpdating = true;
        var _config = {
            custom_html: vm.config['custom_html'],
            custom_css: vm.config['custom_css']
        };
        $scope.updateConfig(item, _config, function() {
            vm.isUpdating = false;
        });
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginCustomcode', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/plugins/customcode/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$sce", function($scope, $sce) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm || {};
                vm.config = vm.pluginInterface.config;
                vm.project = $scope.project;

                try{
                    vm.config.custom_html = $sce.trustAsHtml(vm.config.custom_html);
                }catch(e) {
                    console.error(e);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

pluginFloorplanConfigCtrl.$inject = ["$scope", "$rootScope", "$uibModal", "Alertify", "LptHelper", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginFloorplanConfigCtrl', pluginFloorplanConfigCtrl);

function pluginFloorplanConfigCtrl($scope, $rootScope, $uibModal, Alertify, LptHelper, project, item) {
    ConfigPlacemarkerCtrl.$inject = ["$scope", "$timeout", "$uibModalInstance", "Alertify", "LptHelper", "lptSphere"];
    var vm = this;
    vm.project = project;
    vm.updateConfig = saveFloorplan;
    vm.config = item.config;

    if (angular.isUndefined(vm.config)) {
        vm.config = {
            position: 'bottom-left'
        };
    };
    vm.config.bg_color = vm.config.bg_color || '#1b1b1b';
    if (angular.isUndefined(vm.config.floorplans)) { vm.config.floorplans = [] };
    vm.config.icon = vm.config.icon ? vm.config.icon : (Config.PLUGIN_PATH + 'floorplan/images/radar.png');
    if (angular.isUndefined(vm.config.radars)) {
        vm.config.radars = {
            active: false,
            radius: 50,
            left: 12.5,
            top: 12.5,
            border: "none",
            background: 'rgba(241, 118, 118, 0.49)'
        }
    }
    vm.config.placemarkWidthHeight = vm.config.placemarkWidthHeight || 25;

    vm.openLiveView = function() {
        $rootScope.$emit('evt.editor.openLiveView');
    }

    vm.openMediaLib = function(type) {
        if (type == 'icon') {
            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: false
            });
        }
        if (type == 'floorplan') {
            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackFloorplan,
                canChooseMultipleFile: true
            });
        }
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.icon = file.path;
        }
    }

    function __chooseAssetCallbackFloorplan(files) {
        var fileIds = [];
        if (vm.config.floorplans) {
            angular.forEach(vm.config.floorplans, function(value, key) {
                fileIds.push(value._id);
            });
        }

        angular.forEach(files, function(value, key) {
            var file = value;

            file.placemarkers = [];
            if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {
                vm.config.floorplans.push(file);
            }
        });
    }

    vm.showFloorplan = function(id) {
        vm.formMap = true;
        var floorplan = getFloorplan(id);

        vm.mapId = id;
        vm.mapName = floorplan.name;
        vm.map = floorplan.path;
        vm.mapWidth = floorplan.resizeWidth?floorplan.resizeWidth:floorplan.width;
        vm.mapHeight = floorplan.resizeHeight?floorplan.resizeHeight: floorplan.height;
        if(!floorplan.resizeWidth){
            if (floorplan.width > 400 && floorplan.width > floorplan.height) {
                vm.mapWidth = 400;
                vm.mapHeight = parseInt(400 / floorplan.width * floorplan.height);

                floorplan.resizeWidth = vm.mapWidth;
                floorplan.resizeHeight = vm.mapHeight;

            } else if (floorplan.height > 400 && floorplan.height > floorplan.width) {

                vm.mapWidth = parseInt(400 / floorplan.height * floorplan.width);
                vm.mapHeight = 400;

                floorplan.resizeWidth = vm.mapWidth;
                floorplan.resizeHeight = vm.mapHeight;
            } else if (floorplan.width > 400 && floorplan.width == floorplan.height){

                vm.mapWidth = 400;
                vm.mapHeight = 400;

                floorplan.resizeWidth = 400;
                floorplan.resizeHeight = 400;
            }
        }

        vm.placemarkers = floorplan.placemarkers ? floorplan.placemarkers : []
    }

    vm.floorplanUpdate = function(id) {
        var floorplan = getFloorplan(id);
        floorplan.name = vm.mapName;
        vm.mapHeight = parseInt(vm.mapWidth / floorplan.width * floorplan.height);
        floorplan.resizeWidth = vm.mapWidth;
        floorplan.resizeHeight = vm.mapHeight;
    }

    vm.newPlacemarker = function(event, ui) {
        if (!vm.mapId) return;
        var floorplan = getFloorplan(vm.mapId);
        if (angular.isUndefined(floorplan.placemarkers)) { floorplan.placemarkers = []; }

        vm.placemarkers.push({
            type: 'placemarker',
            top: vm.positionTop,
            left: vm.positionLeft - 12.5,
            targetScene: null,
            heading: 0

        });
        //$scope.$parent.updateConfig('plugin', 'floorplan', vm.config);
    }

    vm.markerUpdateWidthHeight = function(){
        if(vm.config.radars.top > vm.config.placemarkWidthHeight){
            vm.config.radars.top = vm.config.placemarkWidthHeight;
        }
        if(vm.config.radars.left > vm.config.placemarkWidthHeight){
            vm.config.radars.left = vm.config.placemarkWidthHeight;
        }
    }

    vm.updatePlacemarker = function(event, ui, id) {

        vm.placemarkers[id].top = vm.positionTop;
        vm.placemarkers[id].left = vm.positionLeft;
    }

    vm.drag = function(event, ui) {

        vm.positionTop = ui.position.top;
        vm.positionLeft = ui.position.left;
    }

    vm.menuOptionsPlacemarker = [
        ['Choose represent scene', function($item) {

            vm.placemarker = $item.placemarker;

            $uibModal.open({
                templateUrl: 'modules/lapentor.marketplace/plugins/floorplan/tpl/marker-config.html',
                controller: ConfigPlacemarkerCtrl,
                controllerAs: "vmPm",
                size: 'sm',
                scope: $scope
            });
        }],
        // null, // Dividier
        ['Delete marker', function($item) {
            vm.placemarkers.splice($item.$index, 1);
        }]
    ];

    vm.menuOptionsFloorplan = [
        ['Delete floor plan', function($item) {

            vm.config.floorplans.splice($item.$index, 1);

            if (vm.mapId && vm.mapId == $item.floorplan._id) {
                vm.formMap = false;
            }

        }],
        // null // Dividier
    ];

    function getFloorplan(id) {
        return vm.config.floorplans.filter(function(floorplan) {
            return floorplan._id == id
        })[0];
    };

    function saveFloorplan() {

        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }

    function ConfigPlacemarkerCtrl($scope, $timeout, $uibModalInstance, Alertify, LptHelper, lptSphere) {
        var vmPm = this;
        var embed = false;
        var krpanoSphere = new lptSphere('embedKrpano');
        vmPm.project = vm.project
        vmPm.placemarker = vm.placemarker;

        if (vmPm.placemarker.targetScene) {

            vmPm.targetScene = vmPm.placemarker.targetScene;
            vmPm.selectedScene = LptHelper.getObjectBy('_id', vmPm.targetScene, vmPm.project.scenes);

            if (vmPm.selectedScene._id) {
                var defaultView = {
                    'view.fov': 90,
                    'view.hlookat': vmPm.placemarker.heading
                };
                $uibModalInstance.opened.then(
                    $timeout(function() {
                        vmPm.shouldShowPreview = true;
                        krpanoSphere.init('krpanoTour', vmPm.selectedScene.xml, defaultView);
                    }));
                embed = true;
            }
        }

        vmPm.select = function() {
            vmPm.selectedScene = LptHelper.getObjectBy('_id', vmPm.targetScene, vmPm.project.scenes);

            var defaultView = {
                'view.fov': 90
            };
            if (embed == false) {
                embed = true;
                vmPm.shouldShowPreview = true;
                krpanoSphere.init('krpanoTour', vmPm.selectedScene.xml, defaultView);
            } else {
                krpanoSphere.loadScene(vmPm.selectedScene.xml);
            }
        }

        vmPm.getHeading = function() {
            if (embed == false) return;

            vmPm.heading = krpanoSphere.screentosphere(angular.element('#krpanoTour').width() / 2, (angular.element('#krpanoTour').height() / 2)).x;

            vm.placemarker.targetScene = vmPm.targetScene;
            vm.placemarker.heading = vmPm.heading;
        }

        vmPm.dismiss = function() {
            vmPm.getHeading();
            vm.updateConfig();
            $uibModalInstance.dismiss();
        }

        vmPm.cancel = function() {
            $uibModalInstance.dismiss();
        }
    };

}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginFloorplan', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.marketplace/plugins/floorplan/tpl/floorplan.html',
            controller: ["$scope", "$timeout", "$rootScope", "LptHelper", function($scope, $timeout, $rootScope, LptHelper) {
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
            }]
        };
    });
}());

;(function() {
"use strict";

pluginGalleryConfigCtrl.$inject = ["$scope", "$rootScope", "$timeout", "$uibModal", "lptSphere", "LptHelper", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginGalleryConfigCtrl', pluginGalleryConfigCtrl);

function pluginGalleryConfigCtrl($scope, $rootScope,$timeout, $uibModal, lptSphere, LptHelper, project, item) {
    var vm = this,
        enabledSave = true;
    vm.project = project;
    vm.updateConfig = saveGallery;
    vm.openMediaLib = openMediaLib;
    vm.arrayTargetSceneGallery = arrayTargetSceneGallery;
    vm.deletePhoto = deletePhoto;
    vm.config = item.config || {};
    vm.galleryType = {
        'clipped':'Clipped SVG',
        'fancybox': "Fancy"
    }
    // Default config
    vm.config.theme_type = vm.config.theme_type || Object.keys(vm.galleryType)[0];

    vm.sortableOptions = {
        update: function(e, ui) {
            sortGallery();
        }
    };

    if (angular.isUndefined(vm.config)) { vm.config = {}; }
    if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }

    function sortGallery() {
        enabledSave = false;

        angular.element('#gallery').children('.photo').each(function($index) {
                
            var photoId = $(this).attr('photo-id');

            if(vm.config.type == "scene"){
                vm.config.gallery[vm.targetScene][photoId].sort =  $index;
            } 
            if(vm.config.type == "project"){
                vm.config.gallery.project[photoId].sort =  $index;
            }
            
        });

        enabledSave = true;
    }

    function arrayTargetSceneGallery() {

        if(vm.config.type == "scene"){
             return $.map(vm.config.gallery[vm.targetScene], function(value, index) {
                return [value];
            });
        }
        if(vm.config.type == "project"){
             return $.map(vm.config.gallery.project, function(value, index) {
                return [value];
            });
        }
       
    }

    function openMediaLib() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: true
        });
    }

    function __chooseAssetCallback(files) {
        var fileIds = [];
        if (vm.config.gallery[vm.targetScene]) {
            angular.forEach(vm.config.gallery[vm.targetScene], function(value, key) {
                fileIds.push(value._id);
            });
        }

        angular.forEach(files, function(value, key) {
            var file = value;

            if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {

                if(vm.config.type == "project"){
                    if(!vm.config.gallery.project) vm.config.gallery.project = {};

                    vm.config.gallery.project[file._id] = file;
                }
                if(vm.config.type == "scene"){
                    if(!vm.config.gallery[vm.targetScene]) vm.config.gallery[vm.targetScene] = {};

                    vm.config.gallery[vm.targetScene][file._id] = file;
                }
            }
        });
    }

    function deletePhoto(id){

        if(vm.config.type == "project"){
            delete vm.config.gallery.project[id];
        }
        if(vm.config.type == "scene"){
            delete vm.config.gallery[vm.targetScene][id];
        }

        $timeout(function() {
            sortGallery();
        })
    }

    function saveGallery(){
    
        if(enabledSave == false) return; 

        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }

}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginGallery', ["$compile", function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(!config.theme_type){
                    config.theme_type = 'clipped';          
                }
                generateDirective(config.theme_type);

                /////////////

                // Generate installed plugin directive
                function generateDirective(type) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

// $scope inherited from marketplace.item.config.js
//document.write('<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJQcf5T_NL7NrMTup90nAkm3070LmifYk&libraries=places"></script>');
pluginGooglemapConfigCtrl.$inject = ["$scope", "$rootScope", "$timeout", "$ocLazyLoad", "Alertify", "LptHelper", "project", "item"];
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
}());

;(function() {
"use strict";

pluginGooglemapCtrl.$inject = ["$scope", "$ocLazyLoad", "$timeout", "$rootScope", "LptHelper"];
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
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginGyroConfigCtrl', ["$scope", "$rootScope", "LptHelper", "project", "item", function($scope,$rootScope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        vm.config = angular.isDefined(item.config)?item.config:{};
        vm.updateConfig = updateConfig;

        /////
        
        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginGyro', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$rootScope", "Alertify", function($scope, $timeout, $rootScope, Alertify) {
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

            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginHotspotlistConfigCtrl', ["$scope", "project", "item", function($scope, project, item) {
        var vm = this;
        vm.project = project;

        // init config
        vm.config = item.config || {};
        vm.hotspots = [];
        vm.changeScene = changeScene;
        // functions
        vm.updateConfig = updateConfig;
        if (angular.isUndefined(vm.config.scenes)){
            vm.config.scenes = {};
        }
        vm.config.show_on_start = vm.config.show_on_start || false;
        /////////
        function changeScene(){

            angular.forEach(vm.project.scenes, function(scene, key) {
                if(scene._id == vm.targetScene ){
                    vm.hotspots = scene.hotspots;
                    if (angular.isUndefined(vm.config.scenes[scene._id])){
                        vm.config.scenes[scene._id] = {};
                    }
                    angular.forEach(vm.hotspots, function(hotspot, key) {
                        if (angular.isUndefined(vm.config.scenes[scene._id][hotspot._id]) && hotspot.type !='sound'){
                            vm.config.scenes[scene._id][hotspot._id] = true;
                        }
                    });
                }
            });
            vm.selectHotspot();
        }

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.scenes[vm.targetScene], function(itm,key){ vm.config.scenes[vm.targetScene][key] = toggleStatus;});
        }

        vm.selectHotspot = function() {
            vm.select_all = true;
            angular.forEach(vm.config.scenes[vm.targetScene], function(itm,key){ if(!itm)vm.select_all = false; });

        }
        
        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginHotspotlist', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/hotspotlist/tpl/hotspotlist.html',
            controllerAs: 'vm',
            controller: ["$scope", "$ocLazyLoad", "$timeout", "Hotspot", "$rootScope", function($scope, $ocLazyLoad, $timeout, Hotspot, $rootScope) {
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
            }]
        }
    });
}());

;(function() {
"use strict";

pluginIntropopupConfigCtrl.$inject = ["$scope", "$http", "$rootScope", "$ocLazyLoad", "Alertify", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginIntropopupConfigCtrl', pluginIntropopupConfigCtrl);


function pluginIntropopupConfigCtrl($scope, $http, $rootScope, $ocLazyLoad, Alertify, project, item) {
    var vm = this;

    vm.project = project;
    vm.config = item.config;
    vm.updateConfig = saveIntroPopup;
    vm.introTheme = {
        'fullscreen': 'Full screen',
        'circle': 'Circle',
        'bootstrap': 'Popup'
    };
    vm.googlefonts = [];

    vm.config = vm.config || {};
    vm.config.theme_type = vm.config.theme_type || 'fullscreen';
    vm.fontFamilyChange = fontFamilyChange;

    vm.summernoteOptions = {
        height: 300,
        focus: true,
        dialogsInBody: true,
        toolbar: [
            ['headline', ['style']],
            ['style', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
            ['fontface', ['fontname']],
            ['textsize', ['fontsize']],
            ['fontclr', ['color']],
            ['alignment', ['ul', 'ol', 'paragraph', 'lineheight']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link', 'image', 'video', 'hr']],
            ['view', ['fullscreen', 'codeview']]
        ],
        buttons: {
            image: imageButton
        }
    };

    if(vm.config.fontfamily){
        $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
    }

    //////////

    $http.get('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDY31rAJVkfb6GoONiVs03LB87ThdbHZj0')
    .then(function(res) {
        if(res.data) {
            vm.googlefonts = res.data.items;
        }
    }, function(res) {
        console.log(res);
    });

    //////////

    function fontFamilyChange(){
        if(!angular.isDefined(vm.config.fontfamily) ||  vm.config.fontfamily !=""){
            $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
        }
    }

    function imageButton(context) {
        var ui = $.summernote.ui;

        // create button
        var button = ui.button({
            contents: '<i class="note-icon-picture"/>',
            tooltip: 'Image',
            click: function() {
                // invoke insertText method with 'hello' on editor module.
                context.invoke('editor.saveRange');
                $rootScope.$broadcast('evt.openMediaLib', {
                    tab: 'asset',
                    chooseAssetCallback: function(files) {
                        context.invoke('editor.restoreRange');

                        angular.forEach(files, function(file, key) {
                            if (file.mime_type.indexOf('image') != -1) {
                                context.invoke('editor.insertImage',file.path );
                            }
                        });
                    },
                    canelMediaLibCallback: function(){
                        context.invoke('editor.restoreRange');
                    },
                    canChooseMultipleFile: true
                });
            }
        });

        return button.render();
    }

    function saveIntroPopup() {
        if (vm.config.content && vm.config.content.indexOf('data:image') !== -1) {
            Alertify.error('Please upload all photos to Media Library instead of pasting it directly');
        } else {
            vm.isUpdating = true;
    
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopup', ["$compile", "$ocLazyLoad", function($compile, $ocLazyLoad) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(!config.theme_type){
                    config.theme_type = 'bootstrap';          
                }
                generateDirective(config.theme_type);

                if(config.fontfamily){
                    $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+config.fontfamily);
                }

                /////////////

                // Generate installed plugin directive
                function generateDirective(type) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

pluginLensflareConfigCtrl.$inject = ["$scope", "$rootScope", "$uibModal", "lptSphere", "LptHelper", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginLensflareConfigCtrl', pluginLensflareConfigCtrl);

function pluginLensflareConfigCtrl($scope, $rootScope, $uibModal, lptSphere, LptHelper, project, item) {
    var vm = this;
    vm.project = project;
    vm.updateConfig = saveLensflare;
    vm.selectScene = selectScene;
    vm.config = item.config;
    vm.removeLensflare = removeLensflare;

    var embed = false;
    var krpanoSphere = new lptSphere('lensflareKrpano');

    if (angular.isUndefined(vm.config)) { vm.config = {}; }
    if (angular.isUndefined(vm.config.lensflare)) { vm.config.lensflare = {}; }

    function selectScene() {
        vm.selectedScene = LptHelper.getObjectBy('_id', vm.targetScene, vm.project.scenes);

        var defaultView = {
            'view.fov': 90
        };
        if (vm.config.lensflare[vm.selectedScene._id]) {

            defaultView['view.hlookat'] = vm.config.lensflare[vm.selectedScene._id].x;
            defaultView['view.vlookat'] = vm.config.lensflare[vm.selectedScene._id].y;
        }
        if (embed == false) {
            embed = true;
            vm.shouldShowPreview = true;

            krpanoSphere.init('lensTour', vm.selectedScene.xml, defaultView);
            krpanoSphere.on('onxmlcomplete', function() {

                krpanoSphere.set('layer', {
                    name: 'h',
                    type: 'container',
                    width: '100',
                    height: '2',
                    align: 'center',
                    bgcolor: '0xef5041',
                    bgalpha: '1',
                    keep: true

                });
                krpanoSphere.set('layer', {
                    name: 'v',
                    type: 'container',
                    width: '2',
                    height: '100',
                    align: 'center',
                    bgcolor: '0xef5041',
                    bgalpha: '1',
                    keep: true
                });
                krpanoSphere.deleteHotspot('lensflare');
                if(vm.config.lensflare[vm.targetScene]) {
                    addHotspotLensFlare(vm.config.lensflare[vm.targetScene].x,vm.config.lensflare[vm.targetScene].y);
                }    
            });
        } else {
            krpanoSphere.loadScene(vm.selectedScene.xml, defaultView);
        }
    }

    function saveLensflare() {

        if (embed == true) {
            vm.config.lensflare[vm.targetScene] = {
                x: krpanoSphere.getCurrentView('hlookat'),
                y: krpanoSphere.getCurrentView('vlookat')
            }
        }
        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            addHotspotLensFlare(vm.config.lensflare[vm.targetScene].x,vm.config.lensflare[vm.targetScene].y);
        });
    }

    function addHotspotLensFlare(x, y) {

        krpanoSphere.addHotspot({
            name: 'lensflare',
            url: 'modules/lapentor.marketplace/plugins/lensflare/images/flare1.png',
            width: 400,
            height: 400,
            ath: x,
            atv: y,
            enabled: false
        });
    }

    function removeLensflare() {
        if (embed == true) {
            if (vm.config.lensflare[vm.targetScene]) {
                delete vm.config.lensflare[vm.targetScene];
                krpanoSphere.deleteHotspot('lensflare');
                vm.isUpdating = true;
                $scope.updateConfig(item, vm.config, function() {
                    vm.isUpdating = false;
                });
            }
        }

    }

}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginLensflare', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.marketplace/plugins/lensflare/tpl/lensflare.html',
            controller: ["$scope", "$timeout", "$rootScope", "$window", "LptHelper", function($scope, $timeout, $rootScope, $window, LptHelper) {
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
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginLittleplanetConfigCtrl', ["$scope", "LptHelper", "project", "item", function($scope, LptHelper, project, item) {
        var vm = this;
        vm.updateConfig = updateConfig;
        vm.project = project;
        var thisPlugin = item;
        vm.config = thisPlugin.config || {};
        vm.config.scenes = vm.config.scenes?vm.config.scenes:{};
        vm.select_all = true;

        angular.forEach(vm.project.scenes, function (scene) {
            if(!vm.config.scenes[scene._id]){
                vm.config.scenes[scene._id] = false;
            }
        });
        angular.forEach(vm.config.scenes, function(itm,key){
            if(!itm) {
                vm.select_all = false;
            }
        });

        ///////
        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.scenes, function(itm,key){ vm.config.scenes[key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.config.scenes, function(itm,key){ if(!itm)vm.select_all = false; });

        }

        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginLittleplanet', function() {
        return {
            restrict: 'E',
            // controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = $scope.pluginVm,
                    krpano = vm.lptsphereinstance.krpano(),
                    canRun = false, // determine if this scene have little planet effect
                    autorotate = false,
                    isOn = false; // is little planet turn on or off
                    var x = 0;
                    var y = 0;
                    var fov = 90;
                vm.config = vm.config || {};
                if (angular.isUndefined(vm.config.timeout) || isNaN(vm.config.timeout) || vm.config.timeout == null) vm.config.timeout = 2; //default timeout is 2 second
                if (angular.isUndefined(vm.config.scenes)) { vm.config.scenes = {} };
                angular.forEach(vm.config.scenes, function(val, choosedSceneId) {
                    if (choosedSceneId == vm.scene._id && val == true) {
                        canRun = true;
                        return;
                    }
                });

                // Only run little planet effect on choosed scene
                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    try{
                        x = krpano.get('view.vlookat'); y = krpano.get('view.hlookat'); fov = krpano.get('view.fov');
                        if (vm.config.scenes[$scope.scene._id] && vm.config.scenes[$scope.scene._id] == true && !krpano.get('webvr.isenabled')) {
                            // angular.element('scene-list').addClass('hide');
                            makeLittlePlanetEffect();
                            // Reset to normal view after 2 second
                            $timeout(reset, vm.config.timeout * 1000);
                        }
                    }catch(e){

                    }
                }

                // Listen for button click on control bar
                $rootScope.$on('evt.controlbar.' + vm.plugin.slug + 'littleplanet-toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        // Run little planet effect
                        if (isOn) {
                            reset();
                            isOn = false;
                        } else {
                            makeLittlePlanetEffect(true);

                            isOn = true;
                        }
                    }
                });

                function makeLittlePlanetEffect(isTween) {
                    // vm.lptsphereinstance.set('view.stereographic', true);
                    var vlookat = 90, hlookat = 90;
                    if (vm.scene.default_view) {
                        hlookat = vm.scene.default_view.hlookat;
                    }

                    if (isTween) {
                        vm.lptsphereinstance.tween('view.fov', 150);
                        vm.lptsphereinstance.tween('view.fisheye', 1.0);
                        vm.lptsphereinstance.tween('view.vlookat', vlookat);
                        vm.lptsphereinstance.tween('view.hlookat', hlookat);
                    } else {
                        vm.lptsphereinstance.set('view.fov', 150);
                        vm.lptsphereinstance.set('view.fisheye', 1.0);
                        vm.lptsphereinstance.set('view.vlookat', vlookat);
                        vm.lptsphereinstance.set('view.hlookat', hlookat);
                    }

                    if( krpano.get('krpano.arrows') ) {
                        krpano.call('removechevrons()');
                    }

                    canRun = false;
                }

                function reset() {

                    if (vm.scene.default_view) {
                        vm.lptsphereinstance.tween('view.vlookat', x, 2.5, 'easeInOutQuad');
                        vm.lptsphereinstance.tween('view.hlookat', y, 2.5, 'easeInOutQuad');
                    } else {
                        vm.lptsphereinstance.tween('view.vlookat', x, 2.5, 'easeInOutQuad');
                        vm.lptsphereinstance.tween('view.hlookat', y, 2.5, 'easeInOutQuad');
                    }

                    vm.lptsphereinstance.tween('view.fov', fov, 2.5, 'easeInOutQuad');
                    vm.lptsphereinstance.tween('view.fisheye', 0, 2.5, 'easeInOutQuad');


                    $timeout(function() {
                        angular.element('scene-list').removeClass('hide');
                        if( krpano.get('krpano.arrows') ){
                            krpano.call('addchevrons');
                        }
                        if ( krpano.get('krpano.autorotate') ) {
                            krpano.set('autorotate.enabled', true);
                        }
                    }, 3000);

                }
            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginLogoConfigCtrl', ["$scope", "$timeout", "$rootScope", "$ocLazyLoad", "LptHelper", "project", "item", function($scope, $timeout, $rootScope, $ocLazyLoad, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        vm.scenes = project.scenes;
        vm.config = angular.isDefined(item.config) ? item.config : {};
        vm.config.icon = angular.isDefined(vm.config.icon) ? vm.config.icon : '';
        vm.config.width = angular.isDefined(vm.config.width) ? vm.config.width : 100;
        vm.config.height = angular.isDefined(vm.config.height) ? vm.config.height : 100;
        vm.config.oldWidth = angular.isDefined(vm.config.oldWidth) ? vm.config.oldWidth : 100;
        vm.config.oldHeight = angular.isDefined(vm.config.oldHeight) ? vm.config.oldHeight : 100;
        vm.config.margin_top = angular.isDefined(vm.config.margin_top) ? vm.config.margin_top : 10;
        vm.config.margin_left = angular.isDefined(vm.config.margin_left) ? vm.config.margin_left : 10;
        vm.config.margin_bottom = angular.isDefined(vm.config.margin_bottom) ? vm.config.margin_bottom : 10;
        vm.config.margin_right = angular.isDefined(vm.config.margin_right) ? vm.config.margin_right : 10;
        vm.config.autoSize = angular.isDefined(vm.config.autoSize) ? vm.config.autoSize : true;

        vm.config.logos = angular.isDefined(vm.config.logos) ? vm.config.logos : {};
        if(vm.config.logos.length == 0 ){
            vm.config.logos = {};
        }
        vm.changeWidth = changeWidth;
        vm.updateConfig = updateConfig;
        vm.arrayTargetLogos = arrayTargetLogos;

        vm.sortableOptions = {
            update: function(e, ui) {
                sortLogos();
            }
        };

        vm.openMediaLib = function() {

            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: true
            });
        }

        vm.showOptionLogo = function(id){
            vm.targetLogo = id;
            vm.config.logos[vm.targetLogo]['scenes'] = vm.config.logos[vm.targetLogo]['scenes'] || {};
            angular.forEach(vm.scenes, function(scene, key) {
                //vm.config.logos[vm.targetLogo]['scenes'][scene._id] = vm.config.logos[vm.targetLogo]['scenes'][scene._id] || true;
                if (angular.isUndefined(vm.config.logos[vm.targetLogo]['scenes'][scene._id])){
                    vm.config.logos[vm.targetLogo]['scenes'][scene._id] = true;
                    vm.config.logos[vm.targetLogo].margin_top = 10;
                    vm.config.logos[vm.targetLogo].margin_bottom = 10;
                    vm.config.logos[vm.targetLogo].margin_left = 10;
                    vm.config.logos[vm.targetLogo].margin_right = 10;
                }
            });
            vm.selectScene();
        }

        vm.deleteLogo = function(id){
            delete vm.config.logos[id];
        }

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.logos[vm.targetLogo]['scenes'], function(itm,key){ vm.config.logos[vm.targetLogo]['scenes'][key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.config.logos[vm.targetLogo]['scenes'], function(itm,key){ if(!itm)vm.select_all = false; });

        }

        function arrayTargetLogos() {
            return $.map(vm.config.logos, function(value, index) {
                return [value];
            });
        }

        function sortLogos() {

            angular.element('.list-logos').children('.item-logo').each(function($index) {
                var logoId = $(this).attr('logo-id');
                vm.config.logos[logoId].sort =  $index;

            });
        }

        function __chooseAssetCallbackIcon(files) {

                var fileIds = [];
                if (vm.config.logos) {
                    angular.forEach(vm.config.logos, function(value, key) {
                        fileIds.push(value._id);
                    });
                }

                angular.forEach(files, function(value, key) {
                    var file = value;

                    file.oldWidth = file.width;
                    file.oldHeight = file.height;
                    if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {

                        vm.config.logos[file._id] = file;
                        //vm.config.logos[file._id].sort = key;
                    }
                });
                sortLogos();
            //}
        }

        function changeWidth() {
            vm.config.logos[vm.targetLogo].height = parseInt(vm.config.logos[vm.targetLogo].width / vm.config.logos[vm.targetLogo].oldWidth * vm.config.logos[vm.targetLogo].oldHeight);
        }


        function updateConfig() {
            vm.isUpdating = true;
            vm.config.version = 1;

            vm.config.width = vm.config.width > 0 ? vm.config.width : 0;
            vm.config.height = vm.config.height > 0 ? vm.config.height : 0;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginLogo', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/logo/tpl/logo.html',
            controllerAs: 'vm',
            controller: ["$scope", "$uibModal", "$rootScope", function($scope, $uibModal, $rootScope) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.project = $scope.project;
                vm.config = vm.pluginInterface.config;
                vm.sceneId = $scope.scene._id;
                vm.margin = '';

                if(vm.config.align){

                    if(vm.config.align == 'top-center'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;';
                    }
                    if(vm.config.align == 'top-left'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;left:'+vm.config.margin_left+'px;';
                    }
                    if(vm.config.align == 'top-right'){
                        vm.margin = 'top:'+vm.config.margin_top+'px;right:'+vm.config.margin_right+'px;';
                    }
                    if(vm.config.align == 'bottom-left'){
                        vm.margin = 'bottom:'+vm.config.margin_bottom+'px;left:'+vm.config.margin_left+'px;';
                    }
                    if(vm.config.align == 'bottom-right'){
                        vm.margin = 'bottom:'+vm.config.margin_bottom+'px;right:'+vm.config.margin_right+'px;';
                    }
                }

                angular.forEach(vm.config.logos, function(logo, key) {
                    if (angular.isDefined(logo.link)) {
                        var pattern = /^((http|https):\/\/)/;

                        if (!pattern.test(logo.link)) {
                            logo.link = "http://" + logo.link;
                        }
                    }else {
                        logo.link = "#";
                    }
                    logo.align = angular.isDefined(logo.align)?logo.align : "";
                    logo.margins = "";

                    if(logo.align == 'top-center'){
                        logo.margins = 'top:'+logo.margin_top+'px;';
                    }
                    if(logo.align == 'bottom-center'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;';
                    }
                    if(logo.align == 'top-left'){
                        logo.margins = 'top:'+logo.margin_top+'px;left:'+logo.margin_left+'px;';
                    }
                    if(logo.align == 'top-right'){
                        logo.margins = 'top:'+logo.margin_top+'px;right:'+logo.margin_right+'px;';
                    }
                    if(logo.align == 'bottom-left'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;left:'+logo.margin_left+'px;';
                    }
                    if(logo.align == 'bottom-right'){
                        logo.margins = 'bottom:'+logo.margin_bottom+'px;right:'+logo.margin_right+'px;';
                    }
                });

                vm.clickLogo = function(logo){
                    if (logo.link == '#') return false;
                    
                    if (!logo.modal){
                        window.open(logo.link,'_blank');
                    }else{
                        if (logo.modal == "iframe"){
                            $uibModal.open({
                                template: '<div class="plugin-modal logo-iframe-popup"><iframe src="' + logo.link + '" style="width:100%;height: 100% "></iframe>' +
                                '<span class="close close-black" ng-click="cancel()"><i class="ilpt-close"></i></span>' +
                                '</div>',
                                size: 'lg',
                                // windowClass : "hotspot-url-iframe-" + scope.project.theme_hotspot.slug,
                                scope: $scope,
                                controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                }]
                            });
                        }
                    }
                }

                $rootScope.$on('evt.livesphere.changescene', function(e, scene) {
                    if (scene) {
                        vm.sceneId = scene._id;
                    }
                });

                // $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.arrayTargetLogos = $.map(vm.config.logos, function (value, index) {
                        return [value];
                    });
                // });
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextscene', ["$compile", function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config || {},
                    scenes = [];
                config.theme = config.theme || 'royal';
                
                generateDirective(config.theme);

                // Get scenes array
                if (scope.project && scope.project.groups && scope.project.groups.length > 0) {
                    angular.forEach(scope.project.groups, function(group, key) {

                        if (group.scenes.length > 0) {
                            angular.forEach(group.scenes, function(g_scene, key) {
                                angular.forEach(scope.project.scenes, function(scene, key) {
                                    if (g_scene._id == scene._id) {
                                        scenes.push(scene);
                                    }
                                });
                            });
                        }
                    });

                    if (scenes.length == 0) {
                        scenes = scope.project.scenes;
                    }
                } else {
                    scenes = scope.project.scenes;
                }

                scope.pluginVm.config.scenes = scenes;

                /////////////

                // Generate installed plugin directive
                function generateDirective(type) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginNextsceneConfigCtrl', ["$scope", "$timeout", "$rootScope", "item", function($scope, $timeout, $rootScope, item) {
        var vm = this;
        vm.config = angular.isDefined(item.config) ? item.config : {};
        vm.config.theme = angular.isDefined(vm.config.theme) ? vm.config.theme : 'royal';

        vm.updateConfig = updateConfig;

        vm.themePreviews = {
            'royal': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/royal.gif',
            'ontheline': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/ontheline.gif',
            'circle': 'https://s3.amazonaws.com/lapentor-sphere/screenshots/plugins/nextscene/circle.gif',
            'doubleflip':'',
            'fillpath':'',
            'roundslide':'',
            'slide':'',
            'split':'',
        };

        function updateConfig() {
            vm.isUpdating = true;
           
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginPatchConfigCtrl', ["$scope", "$rootScope", "LptHelper", "project", "item", function($scope, $rootScope, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);
        vm.applyAll = false; // apply patch for all scene switch

        vm.config = angular.isDefined(thisPlugin.config) ? thisPlugin.config : {};
        vm.config.icon = angular.isDefined(vm.config.icon) ? vm.config.icon : '';
        vm.config.scale = angular.isDefined(vm.config.scale) ? vm.config.scale : 1;
        vm.config.scenes = vm.config.scenes?vm.config.scenes:[];
        vm.config.distorted = vm.config.distorted || 'yes';
        vm.selectValue = {};
        vm.select_all = true;
        // Init checkbox
        angular.forEach(vm.project.scenes, function (scene) {
            vm.selectValue[scene._id] = true;
            if(vm.config.scenes.indexOf(scene._id) == -1) {
                vm.selectValue[scene._id] = false;
                vm.select_all = false;
            }
        });

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.selectValue, function(itm,key){ vm.selectValue[key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.selectValue, function(itm,key){ if(!itm)vm.select_all = false; });

        }

        vm.updateConfig = updateConfig;

        vm.openMediaLib = function() {

            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: false
            });
        }

        function __chooseAssetCallbackIcon(file) {
            if (file.mime_type.indexOf('image') != -1) { // check file type
                vm.config.icon = file.path;
                updateConfig();
            }
        }

        function updateConfig() {
            vm.isUpdating = true;

            angular.forEach(vm.selectValue, function(itm,key){
                var idx = vm.config.scenes.indexOf(key);

                if (idx == -1) {
                    if(itm){
                        vm.config.scenes.push(key);
                    }

                } else {
                    if(!itm) {
                        vm.config.scenes.splice(idx, 1);
                    }
                }
            });
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginPatch', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$rootScope", "LptHelper", function($scope, $timeout, $rootScope, LptHelper) {

                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                var statusAddNadir = false;
                vm.config.distorted = vm.config.distorted || 'yes';

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    krpano.set('hotspot[logo].visible', false);
                    if (vm.config && vm.config.scenes) {
                        // Apply Nadir if this scene is selected on Config page
                        try {
                            if ((vm.config.scenes[$scope.scene._id] && vm.config.scenes[$scope.scene._id] == true)) {
                                if(statusAddNadir == false){
                                    statusAddNadir = true;
                                    addNadir();
                                }else{
                                    krpano.set('hotspot[logo].visible', true);
                                }

                            }
                        } catch (e) {
                            console.error(e);
                        }
                        try {
                            if (vm.config.scenes.indexOf($scope.scene._id) != -1) {
                                if(statusAddNadir == false){
                                    statusAddNadir = true;
                                    addNadir();
                                }else{
                                    krpano.set('hotspot[logo].visible', true);
                                }
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                });


                function addNadir() {
                    var image = vm.config.icon ? vm.config.icon : '';
                    image += '?' + new Date().getTime();
                    krpano.set('hotspot[logo].style', 'image');
                    krpano.set('hotspot[logo].url', image);
                    krpano.set('hotspot[logo].ath', 0);
                    krpano.set('hotspot[logo].atv', 90);
                    krpano.set('hotspot[logo].visible', true);
                    krpano.set('hotspot[logo].ishtml',false);
                    krpano.set('hotspot[logo].distorted', vm.config.distorted == 'yes'?true:false);
                    krpano.set('hotspot[logo].scale', vm.config.scale ? vm.config.scale : 0.85);
                    krpano.set('hotspot[logo].rotate', 0.0);
                    krpano.set('hotspot[logo].rotatewithview', false);
                    krpano.set('hotspot[logo].enabled', false);
                    krpano.set('hotspot[logo].link', false);
                    if(vm.config.link){
                        krpano.set('hotspot[logo].link', true);
                        if(!krpano.get('webvr.isenabled')) {
                            krpano.set('hotspot[logo].enabled', true);
                        }
                        krpano.set('hotspot[logo].onclick', 'js(window.open("'+vm.config.link+'"))');
                    }

                    krpano.set('hotspot[logo].rotate', 0.0);
                    krpano.call('addhotspot(logo)');
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .controller('pluginScenetitleConfigCtrl', ["$scope", "$rootScope", "$ocLazyLoad", "$http", "LptHelper", "project", "item", function($scope,$rootScope,$ocLazyLoad,$http, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);

        vm.googlefonts =[];
        
        vm.positionOptions = [{
            value: 'top-center',
            title: 'Top center'
        },{
            value: 'top-left',
            title: 'Top left'
        },{
            value: 'top-right',
            title: 'Top right'
        },{
            value: 'bottom-center',
            title: 'Bottom center'
        },{
            value: 'bottom-left',
            title: 'Bottom left'
        },{
            value: 'bottom-right',
            title: 'Bottom right'
        }];

        // init config
        vm.config = item.config || {};
        vm.config.position = vm.config.position || 'top-center';
        vm.config.offset_top = vm.config.offset_top || 20;
        vm.config.offset_left = vm.config.offset_left || 0;
        vm.config.offset_right = vm.config.offset_right || 0;
        vm.config.offset_bottom = vm.config.offset_bottom || 20;
        vm.config.color = vm.config.color || '#ffffff';
        
        // functions
        vm.updateConfig = updateConfig;
        vm.fontFamilyChange = fontFamilyChange;

        if(vm.config.fontfamily){
            $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
        }

        $http.get('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDY31rAJVkfb6GoONiVs03LB87ThdbHZj0')
            .then(function(res) {
                if(res.data) {
                    vm.googlefonts = res.data.items;
                }
            }, function(res) {
                console.log(res);
            });

        /////////
        
        function fontFamilyChange(){
            if(!angular.isDefined(vm.config.fontfamily) ||  vm.config.fontfamily !=""){
                $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
            }
        }

        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginScenetitle', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/scenetitle/tpl/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$ocLazyLoad", "$timeout", "$rootScope", "LptHelper", function($scope,$ocLazyLoad, $timeout, $rootScope, LptHelper) {

                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.config.position = vm.config.position || 'top-center';
                
                if(vm.config.fontfamily){
                    $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
                }
                vm.style = {
                    'font-family': vm.config.fontfamily || 'sans-serif',
                    'font-size': vm.config.fontsize || 14,
                    'color': vm.config.color || 'white'
                };

                switch(vm.config.position) {
                    case 'top-left':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.left = vm.config.offset_left || 20;
                        break;
                    case 'top-right':
                        vm.style.top = vm.config.offset_top || 20;
                        vm.style.right = vm.config.offset_right || 20;
                        break;
                    case 'bottom-left':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.left = vm.config.offset_left || 20;
                        break;
                    case 'bottom-right':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        vm.style.right = vm.config.offset_right || 20;
                        break;
                    case 'bottom-center':
                        vm.style.bottom = vm.config.offset_bottom || 20;
                        break;
                    default: // top-center
                        vm.style.top = vm.config.offset_top || 20;
                        break;
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.currentSceneTitle = $scope.scene.title;
                });
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginWebvr', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$rootScope", function($scope, $timeout, $rootScope) {
                var vm = $scope.pluginVm;
                var krpano = vm.lptsphereinstance.krpano();
                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {

                    krpano.set('plugin[WebVR].keep', true);
                    krpano.set('plugin[WebVR].devices', 'html5');
                    krpano.set('plugin[WebVR].url', (krpano.get('version')=="1.19-pr16")?"bower_components/krpano/plugins/webvr1.js":"bower_components/krpano/plugins/webvr.js");
                    krpano.set('plugin[WebVR].multireslock.desktop', true);
                    krpano.set('plugin[WebVR].multireslock.mobile.or.tablet', false);
                    krpano.set('plugin[WebVR].mobilevr_support', true);
                    krpano.set('plugin[WebVR].mobilevr_fake_support', true);
                    krpano.set('plugin[WebVR].onavailable', "removelayer(webvr_enterbutton);");
                    krpano.call('addplugin(WebVR)');
                }

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    if (krpano.get('webvr.isenabled')) {
                        krpano.call("for(set(i,0), i LT hotspot.count, inc(i),if( (hotspot[get(i)].lpttype != 'point') AND (hotspot[get(i)].name != 'vr_cursor') AND (hotspot[get(i)].name != 'logo') AND (hotspot[get(i)].name != 'lensflare') ,set(hotspot[get(i)].visible, false);); if( (hotspot[get(i)].lpttype == 'point') AND (hotspot[get(i)].sceneId != krpano.sceneId) ,set(hotspot[get(i)].visible, false););if( (hotspot[get(i)].lpttype == 'point') AND (hotspot[get(i)].sceneId == krpano.sceneId) ,set(hotspot[get(i)].visible, true););if( (hotspot[get(i)].name == 'logo') AND (hotspot[get(i)].link == true),set(hotspot[get(i)].enabled, false););););");
                    }
                });

                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'webvr-';
                $rootScope.$on(eventPrefix + 'start', function(event, eventType) {
                    if (eventType == 'click') {
                        krpano.call('webvr.enterVR();');
                        krpano.set('autorotate.enabled', false);
                    }
                });
            }]
        };
    });
}());

;(function() {
"use strict";

// $scope inherited from marketplace.item.config.js
pluginSocialsharewidgetConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item"];
angular.module('lapentor.marketplace.plugins')
    .controller('pluginSocialsharewidgetConfigCtrl', pluginSocialsharewidgetConfigCtrl);

/**
 * Controller for Social share plugin config modal
 * @param  {object} project   [project resolved]
 * @param  {object} item      [it can be theme or plugin]
 */
function pluginSocialsharewidgetConfigCtrl($scope, $rootScope, project, item) {
    var vm = this;
    vm.project = project;
    vm.updateConfig = updateConfig;

    vm.config = item.config ? item.config : {
        theme_id: 'gooey',
    };

    vm.config.theme = vm.config.theme?vm.config.theme:{};
    vm.socialProviders = [{
        title: 'Facebook',
        slug: 'facebook'
    },{
        title: 'Linkedin',
        slug: 'linkedin'
    },{
        title: 'Twitter',
        slug: 'twitter'
    }];

    vm.openCustomIconMediaLib = openCustomIconMediaLib;
    vm.deleteCustomIcon = deleteCustomIcon;

    //////

    function deleteCustomIcon(iconType) {
        delete vm.config['custom_'+iconType+'_icon'];
    }

    /**
     * Open Media Library
     */
    var currentChoosedIconType = '';
    function openCustomIconMediaLib(iconType) {
        currentChoosedIconType = iconType;
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: __chooseCustomIconCallback
        });
    }

    function __chooseCustomIconCallback(file) {
        if (file.mime_type.indexOf('png') != -1 || file.mime_type.indexOf('jpeg') != -1 || file.mime_type.indexOf('svg')) {
            if (file.mime_type.indexOf('image') != -1) { // check file type
                vm.config['custom_'+currentChoosedIconType+'_icon'] = file.path;
            }
        } else {
            Alertify.error('Only support png, jpeg, svg format');
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidget', ["$compile", function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                var config = scope.pluginVm.config;
                if(angular.isUndefined(config.theme_id)) {
                    config.theme_id = 'gooey';
                }
                generateDirective(config.theme_id);

                /////////////

                // Generate installed plugin directive
                function generateDirective(themeId) {
                    var directiveName = 'plugin-' + scope.plugin.slug + '-' + themeId;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

HotspotEditableArticleCtrl.$inject = ["$scope", "$timeout", "$sce", "$rootScope", "Alertify", "Hotspot"];
angular.module('lapentor.app')
    .controller('HotspotEditableArticleCtrl', HotspotEditableArticleCtrl);

function HotspotEditableArticleCtrl($scope, $timeout, $sce, $rootScope, Alertify, Hotspot) {
    var vm = $scope.vm;

    var MediaLibButton = function (context) {
        var ui = $.summernote.ui;

        // create button
        var button = ui.button({
            contents: '<i class="note-icon-picture"></i>',
            tooltip: 'Image',
            click: function () {
                context.invoke('editor.saveRange');

                $rootScope.$broadcast('evt.openMediaLib', {
                    tab: 'asset',
                    chooseAssetCallback: function(files){
                        context.invoke('editor.restoreRange');

                        angular.forEach(files, function(file, key) {
                            if (file.mime_type.indexOf('image') != -1) {
                                context.invoke('editor.insertImage',file.path );
                            }
                        });
                    },
                    canelMediaLibCallback: function(){
                        context.invoke('editor.restoreRange');
                    },
                    canChooseMultipleFile: true
                });
            }
        });

        return button.render();   // return button as jquery object
    }
    vm.summernoteOptions = {
        height: 200,
        focus: true,
        dialogsInBody: true,
        buttons: {
            mediaLib: MediaLibButton
        },
        toolbar: [
            ['style', ['bold', 'italic', 'underline', 'strikethrough','fontname','fontsize','color','ul', 'paragraph', 'lineheight','table','link','mediaLib', 'video', 'hr','style','fullscreen', 'codeview']],
        ]
    };
    $sce.trustAsResourceUrl(vm.hotspot.src);
    $scope.$on('evt.hotspoteditable.formShowed', function(ev, hotspotId) {
        $timeout(function() {
            if (hotspotId == $scope.hotspot._id) {
                jQuery('.summernote').summernote();
            }
        }, 3000);
    });

}
}());

;(function() {
"use strict";

HotspotEditableImageCtrl.$inject = ["$scope", "$rootScope", "$sce"];
angular.module('lapentor.app')
    .controller('HotspotEditableImageCtrl', HotspotEditableImageCtrl);

function HotspotEditableImageCtrl($scope, $rootScope, $sce) {
    var vm = $scope.vm;

    vm.scenes = $scope.scenes;

    vm.openMediaLib = openMediaLib;

    ////////////////

    /**
     * Open Media Library
     */
    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.hotspot.src = file.path;
        }
    }

    $sce.trustAsResourceUrl(vm.hotspot.src);
}
}());

;(function() {
"use strict";

HotspotEditableCtrl.$inject = ["$scope", "$sce", "$rootScope", "$element", "$timeout", "LptHelper", "Alertify", "Hotspot"];
angular.module('lapentor.app')
    .controller('HotspotEditableCtrl', HotspotEditableCtrl);

function HotspotEditableCtrl($scope, $sce, $rootScope, $element, $timeout, LptHelper, Alertify, Hotspot) {
    var vm = this;

    vm.project = $scope.project; // project data object
    vm.sceneEditSphere = $scope.scenesphereinstance; // instance of lptKrpano of current scene
    vm.hotspot = $scope.hotspot; // hotspot data object
    vm.hotspot.project_slug = vm.project.slug;
    vm.hpIcon = vm.hotspot.icon_custom;


    if (angular.isUndefined(vm.hotspot.width)) { vm.hotspot.width = 45; }
    // if (angular.isUndefined(vm.hotspot.height)) { vm.hotspot.height = 45; }

    vm.currentscene = $scope.currentscene;
    vm.scenes = $scope.scenes;

    vm.currentOpenForm = null;
    vm.formSaving = false; // to toggle form saving loading icon
    vm.isDeleting = false; // to toggle hotspot form delete loading icon

    vm.getTemplateUrl = getTemplateUrl; // get each child directive template url
    vm.openCustomIconMediaLib = openCustomIconMediaLib; // open media library to choose custom hotspot icon
    vm.closeForm = closeForm; // close hotspot form
    vm.saveForm = saveForm; // send form data to API
    vm.deleteHotspot = deleteHotspot; // delete hotspot
    vm.hotspot.name = 'lptHotspot' + vm.hotspot._id;

    // Add hotspots to viewer
    var iconPrefix = 'assets/images/hotspots';
    var currentHotspotThemeSlug = vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : '';
    
    if (currentHotspotThemeSlug) {
        iconPrefix = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', currentHotspotThemeSlug, 'images');
    }
    try{
        if(vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom']){
            vm._icon_custom = vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom'];
        }
    } catch(e){}


    vm.hotspot.theme_slug = currentHotspotThemeSlug;

    vm.hotspotCustomSize = {
        floor: 5,
        ceil: 500,
        showSelectionBar: true,
        step: 1
    };
    vm.sceneEditSphere.addHotspot({
        title: vm.hotspot.title,
        name: vm.hotspot.name,
        url: vm.hpIcon?vm.hpIcon+'?'+Date.now():vm._icon_custom?vm._icon_custom+'?'+Date.now():LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + vm.hotspot.position.x)+'?'+Date.now(),
        ath: vm.hotspot.position.x,
        atv: vm.hotspot.position.y,
        width: vm.hotspot.width,
        height: vm.hotspot.width,
        ondown: 'draghotspot()'
    });

    addOnHoverTextstyleEdit(vm.hotspot);
    // Showtext onhover
    function addOnHoverTextstyleEdit(hotspot) {
        vm.sceneEditSphere.set('textstyle', {
            "name": "default_tooltip_style",
            "font": "Arial",
            "fontsize": "13",
            "bold": "true",
            "roundedge": "4",
            "background": "false",
            "border": "false",
            "textcolor": "0xFFFFFF",
            "textalign": "center",
            "vcenter": "true",
            "edge": "bottom",
            "xoffset": "0",
            "yoffset": "0",
            "padding": "10",
            "textshadow": "1.0",
            "textshadowrange": "10.0",
            "textshadowangle": "0",
            "textshadowcolor": "0x000000",
            "textshadowalpha": "1.0",
        });
        vm.sceneEditSphere.addHotspotEventCallback(hotspot.name, 'onhover', 'showtext(' + hotspot.title + ', "default_tooltip_style")');
    }

    // Add event listener when hotspot drag end
    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onDragEnd', ondragend);

    // Add event listener when hotspot is dragging
    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onDrag', ondrag);

    // Delete hospot event listener
    $rootScope.$on('evt.hotspoteditable.deleteHotspot', function(event, id) {
        deleteHotspot(id);
    });

    ////////////////////

    /**
     * Open Media Library
     */
    function openCustomIconMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: __chooseCustomIconCallback
        });
    }

    function __chooseCustomIconCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.hotspot.icon_custom = file.path;
            vm.hpIcon = file.path;
        } else {
            Alertify.error('Only support png, jpeg, svg, gif format');
        }
    }

    function ondrag() {
        localStorage.setItem('checkmove', true);
        var newX = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'ath'),
            newY = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'atv');
        var Sphere = vm.sceneEditSphere.spheretoscreen(newX, newY);
    }
    /**
     * Event listener when dragend:
     * - update new position
     * - or show form (onclick)
     */
    function ondragend() {
        $timeout(function() {
            localStorage.setItem('checkmove', false);
        }, 100);
        var newX = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'ath'),
            newY = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'atv');

        var SphereOld = vm.sceneEditSphere.spheretoscreen(vm.hotspot.position.x, vm.hotspot.position.y);
        var SphereNew = vm.sceneEditSphere.spheretoscreen(newX, newY);

        vm.hotspot.position.x = newX;
        vm.hotspot.position.y = newY;

        if ((Math.abs(SphereOld.x - SphereNew.x) >= 2) && (Math.abs(SphereOld.y - SphereNew.y) >= 2)) {
            // it really a drag event
            saveForm();
        } else {
            // it just a click event
            showForm();
        }
    }

    /**
     * Update hotspot info to DB
     * @param  {boolean} validateForm [decide wheather to validate the form]
     */
    function saveForm(validateForm) {
        if (!validateForm || (vm.hotspotForm && vm.hotspotForm.$valid)) {
            if (vm.hotspot.content && vm.hotspot.content.indexOf('data:image') !== -1) {
                Alertify.error('Please upload all photos to Media Library instead of pasting it directly');
            } else {
                vm.formSaving = true;

                Hotspot.update(vm.hotspot).then(function(res) {
                    if (res.data.status == 1) {
                        Alertify.success('Hotspot Saved');
                        var now = new Date().getTime();
                        var customIcon = vm.hpIcon?(vm.hpIcon+'?'+ now):vm._icon_custom?vm._icon_custom+'?'+ now:LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + now);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'url', customIcon);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'width',vm.hotspot.width);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'height',vm.hotspot.width);
                        vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onhover', 'showtext(' + vm.hotspot.title + ', "default_tooltip_style")');
                    } else {
                        console.log(res);
                        Alertify.error('Can not update hotspot');
                    }
                }, function(res) {
                    Alertify.error('Can not update hotspot');
                }).finally(function() {
                    vm.formSaving = false;
                });
            }
        }
    }

    function getTemplateUrl() {
        return 'modules/lapentor.app/views/partials/hotspots/' + vm.hotspot.type + '.html';
    }

    /**
     * Show Hotspot form
     */
    function showForm() {
        angular.element('.hotspot-form-wrapper').hide();
        vm.currentOpenForm = vm.hotspot.name;
        angular.element('#' + vm.hotspot.name).show();
        $rootScope.$broadcast('evt.hotspoteditable.formShowed', vm.hotspot._id);
        $timeout(function () {
            $scope.$broadcast('rzSliderForceRender');
        },1000);
    }

    /**
     * Close Hotspot form
     */
    function closeForm() {
        vm.currentOpenForm = null;
        if (vm.hotspot.type == 'point' || vm.hotspot.type == 'article') {
            // prevent point hotspot form to reinit each time the form show, it impact too much on performance
            angular.element('#' + vm.hotspot.name).hide();
        }
    }

    function deleteHotspot(id) {
        if (vm.hotspot._id == id) {
            vm.isDeleting = true;

            Alertify.confirm('Are you sure?').then(function() {
                $rootScope.$emit('evt.editor.isloading', true);
                // Remove hotspot from DB
                Hotspot.remove(vm.hotspot._id, vm.hotspot.project_slug).then(function(res) {
                    Alertify.success('Hotspot deleted');
                    vm.sceneEditSphere.deleteHotspot(vm.hotspot.name); // delete hotspot from viewer
                    $rootScope.$emit('evt.hotspoteditable.hospotDeleted', vm.hotspot._id); // fire event to delete hotspot in js object
                }).finally(function() {
                    vm.isDeleting = false;
                    $rootScope.$emit('evt.editor.isloading', false);
                });
            }).finally(function() {
                vm.isDeleting = false;
            });
        }

    }
}
}());

;(function() {
"use strict";

HotspotEditablePointCtrl.$inject = ["$scope", "$rootScope", "$timeout", "lptSphere", "Alertify", "Hotspot", "LptHelper"];
angular.module('lapentor.app')
    .controller('HotspotEditablePointCtrl', HotspotEditablePointCtrl);

function HotspotEditablePointCtrl($scope, $rootScope, $timeout, lptSphere, Alertify, Hotspot, LptHelper) {
    var vm = $scope.vm;

    if (!vm.scenes.length) return;
    vm.selectedScene = null;
    vm.isSpherePreviewInited = false;
    var pointHotspotSphere = new lptSphere(vm.hotspot._id);
    vm.sceneEditSphere = $scope.scenesphereinstance;

    vm.setTargetView = setTargetView;
    vm.loadPointHotspotScene = loadPointHotspotScene;

    vm.project = $scope.project;
    var iconPrefix = 'assets/images/hotspots';
    var currentHotspotThemeSlug = vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : '';
    
    if (currentHotspotThemeSlug) {
        iconPrefix = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', currentHotspotThemeSlug, 'images');
    }

    try{
        if(vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom']){
            vm._icon_custom = vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom'];
        }
    } catch(e){}

    vm.optionFov = {
        floor: 70,
        ceil: 120,
        showSelectionBar: true,
        step: 1,
        onChange : function(value){
            if(pointHotspotSphere.krpano() != null){
                pointHotspotSphere.set('view.fov',vm.hotspot_fov);
            }
        }
    }
    $rootScope.$on('evt.hotspoteditable.formShowed', function(event, hotspotId) {
        if (hotspotId == vm.hotspot._id) {
            vm.selectedScene = null;
            if (vm.hotspot.target_scene_id) {
                vm.selectedScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.scenes);
                $timeout(function () {
                    initPointHotspotSpherePreview();
                },0);
            }
        }
    });

    // Grab group info, merge into scenes object
    if(vm.project.groups) {
        angular.forEach(vm.scenes, function(s) {
            var g = LptHelper.getObjectBy('_id', s.group_id, vm.project.groups);
            s.group_title = g.title;
        });    
    }

    ////////////////
    /**
     * Init sphere preview if this is point hotspot
     */
    function initPointHotspotSpherePreview() {
        if (!vm.isSpherePreviewInited) {
            // Init Sphere viewer
            var defaultView = {};
            var embedingTarget = 'PointHotspot' + vm.hotspot._id;

            if (angular.isDefined(vm.hotspot.target_view) && angular.isDefined(vm.hotspot.target_view.fov)) {
                defaultView = {
                    'view.hlookat': vm.hotspot.target_view.hlookat,
                    'view.vlookat': vm.hotspot.target_view.vlookat,
                    'view.fov': vm.hotspot.target_view.fov,
                    'control.fovspeed':0,

                }
                vm.hotspot_fov = vm.hotspot.target_view.fov;
            } else {
                vm.hotspot_fov = 90;
                defaultView = {
                    'view.fov': 90,
                    'control.fovspeed':0
                };
            }


            if (vm.selectedScene != null 
                && embedingTarget && angular.element('#'+embedingTarget).html()=="") {
                pointHotspotSphere.init(embedingTarget, vm.selectedScene.xml, defaultView);
            }
            vm.isSpherePreviewInited = true;
        }
    }

    function loadPointHotspotScene(target_scene_id) {

        var statusText = false;
        if( !vm.hotspot.title || vm.hotspot.title == "point"){
            statusText = true;
        }

        angular.forEach(vm.scenes, function(s) {

            if(vm.hotspot.title == s.title){
                statusText = true;
            }

            if (s._id == target_scene_id) {
                vm.selectedScene = s;
                return false;
            }
        });
        // check if sphere viewer is inited
        if (vm.isSpherePreviewInited == false) {
            initPointHotspotSpherePreview();
        } else {
            pointHotspotSphere.loadScene(vm.selectedScene.xml,[],vm.selectedScene.pano_type);
        }

        if(statusText){
            vm.hotspot.title = vm.selectedScene.title;
        }
    }

    function setTargetView() {
        if (angular.isUndefined(vm.hotspot.target_view)) {
            vm.hotspot.target_view = {
                hlookat: null,
                vlookat: null,
                fov: null
            }
        }
        vm.hotspot.target_view.hlookat = pointHotspotSphere.getCurrentView('hlookat');
        vm.hotspot.target_view.vlookat = pointHotspotSphere.getCurrentView('vlookat');
        vm.hotspot.target_view.fov = vm.hotspot_fov;
    }

    /**
     * Update hotspot info to DB
     */
    vm.saveForm = function() {
        if (vm.hotspotForm.$valid) {
            vm.formSaving = true;
            if(vm.isSpherePreviewInited) vm.setTargetView();

            Hotspot.update(vm.hotspot).then(function(res) {
                if (res.data.status == 1) {
                    Alertify.success('Hotspot Saved');
                    var now = new Date().getTime();
                    var customIcon = vm.hpIcon?(vm.hpIcon+'?'+ now):vm._icon_custom?vm._icon_custom+'?'+ now:LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + now);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'url',customIcon);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'width',vm.hotspot.width);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'height',vm.hotspot.width);
                    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onhover', 'showtext(' + vm.hotspot.title + ', "default_tooltip_style")');
                } else {
                    console.log(res);
                    Alertify.error('Can not update hotspot');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not update hotspot');
            }).finally(function() {
                vm.formSaving = false;
            });
        }
    }
}
}());

;(function() {
"use strict";

HotspotEditableSoundCtrl.$inject = ["$scope", "$rootScope", "$sce"];
angular.module('lapentor.app')
    .controller('HotspotEditableSoundCtrl', HotspotEditableSoundCtrl);

function HotspotEditableSoundCtrl($scope, $rootScope, $sce) {
    var vm = $scope.vm;

    vm.reachRangeSliderOptions = {
        floor: 10,
        ceil: 180,
        showSelectionBar: true,
        step: 10,
        translate: function(value) {
            return value + '&deg;';
        }
    };

    vm.openMediaLib = openMediaLib;

    ////////////////

    // Init default value for hotspot config
    //------- Sound hotspot only ---------------
    if (vm.hotspot.type == 'sound') {
        if (angular.isUndefined(vm.hotspot.reach)) {
            vm.hotspot.reach = 40;
        }
        if (angular.isUndefined(vm.hotspot.volume)) {
            vm.hotspot.volume = 80;
        }
    }

    /**
     * Open Media Library
     */
    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('audio') != -1) { // check file type
            vm.hotspot.src = file.path;
            vm.hotspot.title = file.name;
        }
    }

    $sce.trustAsResourceUrl(vm.hotspot.src);
}
}());

;(function() {
"use strict";

HotspotEditableTextfCtrl.$inject = ["$scope", "$rootScope"];
angular.module('lapentor.app')
    .controller('HotspotEditableTextfCtrl', HotspotEditableTextfCtrl);

function HotspotEditableTextfCtrl($scope, $rootScope) {
    var vm = $scope.vm;

    var MediaLibButton = function (context) {
        var ui = $.summernote.ui;

        // create button
        var button = ui.button({
            contents: '<i class="note-icon-picture"></i>',
            tooltip: 'Image',
            click: function () {
                context.invoke('editor.saveRange');

                $rootScope.$broadcast('evt.openMediaLib', {
                    tab: 'asset',
                    chooseAssetCallback: function(files){
                        context.invoke('editor.restoreRange');

                        angular.forEach(files, function(file, key) {
                            if (file.mime_type.indexOf('image') != -1) {
                                context.invoke('editor.insertImage',file.path );
                            }
                        });
                    },
                    canelMediaLibCallback: function(){
                        context.invoke('editor.restoreRange');
                    },
                    canChooseMultipleFile: true
                });
            }
        });

        return button.render();   // return button as jquery object
    }

    vm.textfSummernoteOptions = {
        height: 200,
        focus: true,
        dialogsInBody: true,
        buttons: {
            mediaLib: MediaLibButton
        },
        toolbar: [
            ['style', ['bold', 'italic', 'underline', 'strikethrough','fontname','fontsize','color','ul', 'paragraph', 'lineheight','table','link', 'mediaLib', 'video', 'hr','style','fullscreen', 'codeview']],
        ]
    };
}
}());

;(function() {
"use strict";

HotspotEditableUrlCtrl.$inject = ["$scope", "Alertify"];
angular.module('lapentor.app')
    .controller('HotspotEditableUrlCtrl', HotspotEditableUrlCtrl);

function HotspotEditableUrlCtrl($scope, Alertify) {
    var vm = $scope.vm;

    // TODO: validate url
}
}());

;(function() {
"use strict";

HotspotEditableVideoCtrl.$inject = ["$scope", "$sce"];
angular.module('lapentor.app')
    .controller('HotspotEditableVideoCtrl', HotspotEditableVideoCtrl);

function HotspotEditableVideoCtrl($scope, $sce) {
    var vm = $scope.vm;
    // TODO: embed video iframe preview
    
    $sce.trustAsResourceUrl(vm.hotspot.src);
}
}());

;(function() {
"use strict";

EditorControlBarCtrl.$inject = ["$scope", "$rootScope", "$timeout", "Alertify", "LptHelper", "Marketplace", "Project"];
angular.module('lapentor.app')
    .controller('EditorControlBarCtrl', EditorControlBarCtrl);

/**
 * Controller for <editor-controlbar>
 * @param {[type]} $scope     [inherited from parent scope]
 */
function EditorControlBarCtrl($scope, $rootScope, $timeout, Alertify, LptHelper, Marketplace, Project) {
    var ebVm = this,
        projectEditorVm = $scope.vm;
    ebVm.isChangingOrder = false;
    ebVm.availableButtons = Marketplace.getPluginButtons(projectEditorVm.project.plugins, true);
    ebVm.btnSortableOptions = {
        appendTo: '#scene-editor-controlbar .tools',
        update: function() {
            // Show "Save order" button
            ebVm.isChangingOrder = true;
        }
    };
  
    //////////// functions register

    ebVm.addDivider = addDivider; // add new divider
    ebVm.deleteDivider = deleteDivider; // delete divider
    ebVm.openMarketplace = openMarketplace; // open control bar theme section on Marketplace
    ebVm.toggleButtonVisibility = toggleButtonVisibility; // toggle button visibility
    ebVm.openMediaLib = openMediaLib; // open Media Library to change button icon
    ebVm.resetDefaultIcon = resetDefaultIcon;
    ebVm.saveOrder = saveOrder;

    $rootScope.$on('evt.marketplace.item.installuninstall', function() {
        ebVm.availableButtons = Marketplace.getPluginButtons(projectEditorVm.project.plugins, true);
    });

    ////////////

    /**
     * Reset button custom icon to default icon
     */
    function resetDefaultIcon(btn) {
        btn.icon_url_custom = null;
        delete btn.icon_url_custom;
        updateProject(btn.name + ' button icon resetted');
    }

    var dividerCount = 0;

    /**
     * Open Media Library
     */
    function openMediaLib(btn) {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: function (file) {
                if(file.mime_type.split("/")[0] == 'image'){
                    btn.icon_url_custom = file.path;
                    updateProject(btn.name + ' button icon udpated');
                }else{
                    Alertify.error('not have to image');
                }

            },
            canChooseMultipleFile: false
        });
    }

    /**
     * Hide button on frontend control bar
     */
    function toggleButtonVisibility(id) {
        var btn = LptHelper.getObjectBy('id', id, ebVm.availableButtons);
        if (btn.hide) {
            btn.hide = false;
        } else {
            btn.hide = true;
        }
        updateProject('Control bar info saved');
    }

    function addDivider() {
        ebVm.availableButtons.push({
            'id': 'divider' + dividerCount++,
            'name': 'Divider',
            'isdivider': true,
            'icon_url': 'assets/images/icons/divider.png'
        });
    }

    function deleteDivider(id) {
        LptHelper.deleteObjectFromArrayBy('id', id, ebVm.availableButtons);
        updateButtonsOrder();
        updateProject('Control bar info saved');
    }

    function updateButtonsOrder() {

        angular.forEach(projectEditorVm.project.plugins, function(plugin) {
            angular.forEach(plugin.buttons, function(btn) {
                angular.forEach(ebVm.availableButtons, function(aBtn, index) {
                    if (aBtn.id == btn.id) {
                        btn.index = index;
                        return;
                    }
                });
            });
        });

    }

    function openMarketplace() {
        $rootScope.$emit('evt.marketplace.toggle', {
            status: 'show',
            filterCategoryName: 'control bar'
        });
    }

    function updateProject(message, callback) {
        if (!message) {
            message = 'Order saved';
        }
        ebVm.isUpdating = true;
        Project.update(projectEditorVm.project).then(function(status) {
            if (status) {
                Alertify.success(message);

                if (callback) callback();
            }
        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            ebVm.isUpdating = false;
            ebVm.isChangingOrder = false; // hide Save order button
        });
    }

    function saveOrder() {
        updateButtonsOrder();
        updateProject();        
    }
}
}());

;(function() {
"use strict";

EditorMarketCtrl.$inject = ["$scope", "$rootScope", "$uibModal", "$timeout", "$state", "Alertify", "LptHelper", "Project", "Marketplace"];
angular.module('lapentor.app')
    .controller('EditorMarketCtrl', EditorMarketCtrl);

function EditorMarketCtrl($scope, $rootScope, $uibModal, $timeout, $state, Alertify, LptHelper, Project, Marketplace) {
    var vm = $scope.vm;

    vm.items = [];
    vm.categories = [];
    vm.isUpdating = '';
    vm.showInstalled = true;
    vm.installedItemsCount = 0;

    vm.install = install; // install item
    vm.uninstall = uninstall; // uninstall item
    vm.openDetailPage = openDetailPage; // open item detail page
    vm.openConfigPage = openConfigPage; // open item config page
    vm.updateProject = updateProject; // update project info via API
    vm.toggleMarketplace = toggleMarketplace; // show/hide marketplace
    vm.showTab = showTab; // show tab: all,theme,plugins...

    /**
     * Declare a shortcut variable for installed plugins
     * @type {object}
     */
    vm.installedPlugins = angular.isDefined(vm.project.plugins) ? vm.project.plugins : [];

    /**
     * Get marketplace items
     */
    Marketplace.getItems().then(function(items) {
        vm.items = items;
        markInstalledPlugins();
    });

    /**
     * Get marketplace categories
     */
    Marketplace.getCategories().then(function(categories) {
        vm.categories = categories;
    });

    /**
     * Listen to "evt.marketplace.toggle" event and open up the Market
     */
    $rootScope.$on('evt.marketplace.toggle', function(e, payload) {
        toggleMarketplace(payload.status);
        if (payload.filterCategoryName) vm.filterCategoryName = payload.filterCategoryName;
    });

    //////////////

    vm.marketIsOpened = false;
    // toggleMarketplace();
    function toggleMarketplace(status) {
        switch (status) {
            case 'show':
                vm.marketIsOpened = true;
                // Init horizontal scroll on Installed items
                break;
            case 'hide':
                vm.marketIsOpened = false;
                break;
            default:
                vm.marketIsOpened = !vm.marketIsOpened;
                if(vm.marketIsOpened) {
                    // Init horizontal scroll on Installed items
                }
                break;
        }
    }

    /**
     * Install marketplace item: theme or plugin
     * @param  {object} item [item object]
     */
    function install(item) {
        switch (item.type) {
            case 'theme': // theme
                vm.project['theme_' + item.theme_type] = {
                    slug: item.slug
                };
                break;
            case 'plugin': // plugin
                if (!LptHelper.getObjectBy('slug', item.slug, vm.project.plugins).slug) { // check if plugin is existed
                    var plugin = {
                        slug: item.slug,
                        name: item.name
                    };
                    if (item.buttons) {
                        plugin.buttons = item.buttons;
                    }
                    vm.project.plugins.push(plugin);
                }
                break;
        }
        vm.isUpdating = item._id;
        vm.updateProject(item.name + ' installed', function() {
            $rootScope.$emit('evt.marketplace.item.installuninstall');
            if (item.theme_type == 'hotspot') $state.reload();
        });
    }

    /**
     * Uninstall marketplace item: theme or plugin
     * @param  {string} slug [item slug]
     */
    function uninstall(item) {
        try {
            switch (item.type) {
                case 'plugin':
                    angular.forEach(vm.project.plugins, function(plugin, index) {
                        if (plugin.slug == item.slug) {
                            vm.project.plugins.splice(index, 1);
                        }
                    });
                    break;
                case 'theme':
                    vm.project['theme_' + item.theme_type] = null;
                    break;
            }

            vm.isUpdating = item._id;
            vm.updateProject(item.name + ' uninstalled', function() {
                $rootScope.$emit('evt.marketplace.item.installuninstall');
                if (item.theme_type == 'hotspot') $state.reload();
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Open marketplace item detail page
     * @param  {string} slug [item slug]
     */
    function openDetailPage(slug) {
        var templateUrl = '';

        var item = LptHelper.getObjectBy('slug', slug, vm.items);
        if (item) {
            switch (item.type) {
                case 'plugin':
                    templateUrl = LptHelper.makeUrl(Config.PLUGIN_PATH, slug, 'tpl/detail.html');
                    break;
                case 'theme':
                    templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, slug, 'tpl/detail.html');
                    break;
            }
            try {
                var detailPage = $uibModal.open({
                    templateUrl: templateUrl,
                    size: 'lg',
                    windowClass: 'marketplace-item-detail'
                });

            } catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * Open marketplace item config page
     * @param  {string} slug [item slug]
     */
    function openConfigPage(item) {
        $rootScope.$emit('evt.marketplace.openConfigPage', item);
    }

    function updateProject(message, callback) {
        Project.update(vm.project).then(function(status) {
            if (status && message) {
                Alertify.success(message);
                markInstalledPlugins();

                if (callback) callback();
            }
        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            vm.isUpdating = '';
        });
    }

    function markInstalledPlugins() {
        var installedItemsCount = 0;
        angular.forEach(vm.items, function(item) {
            if (item.type == 'plugin') {
                if (LptHelper.getObjectBy('slug', item.slug, vm.installedPlugins).slug) {
                    item.installed = true;
                } else {
                    item.installed = false;
                }
            } else {
                if (vm.project['theme_' + item.theme_type] && vm.project['theme_' + item.theme_type].slug == item.slug) {
                    item.installed = true;
                } else {
                    item.installed = false;
                }
            }
            if(item.installed) installedItemsCount++;
            vm.installedItemsCount = installedItemsCount;
        });
    }

    function showTab(tab, themeType) {
        vm.filterCategoryName = '';
        switch (tab) {
            case 'all':
                vm.filterCategoryType = '';
                vm.filterInstalled = undefined;
                vm.filterThemeType = undefined;
                break;
            case 'plugin':
                vm.filterCategoryType = 'plugin';
                vm.filterThemeType = undefined;
                break;
            case 'theme':
                vm.filterCategoryType = 'theme';
                if(themeType) {
                    vm.filterThemeType = themeType;
                }
                break;
            case 'installed':
                vm.filterCategoryType = '';
                if(angular.isUndefined(vm.filterInstalled)) {
                    vm.filterInstalled = true;
                }else{
                    vm.filterInstalled = undefined;
                }
                break;
        }
    }
}
}());

;(function() {
"use strict";

EditorScenesManagementCtrl.$inject = ["$scope", "$uibModal", "$timeout", "$state", "$rootScope", "Alertify", "LptHelper", "Scene", "SceneGroup"];
RenderingModalCtrl.$inject = ["$scope", "$timeout", "$uibModalInstance", "user", "Alertify", "Scene"];
angular.module('lapentor.app')
    .controller('EditorScenesManagementCtrl', EditorScenesManagementCtrl)
    .controller('RenderingModalCtrl', RenderingModalCtrl);
function EditorScenesManagementCtrl($scope, $uibModal, $timeout, $state, $rootScope, Alertify, LptHelper, Scene, SceneGroup) {
    var vm = $scope.vm;

    vm.collapsedGroup = []; // store collapsed group id
    vm.thumbCacheVersion = 0;

    // functions declaration
    vm.openMediaLib = openMediaLib; // open media library
    vm.openReplacePanoMediaLib = openReplacePanoMediaLib;
    vm.deleteScene = deleteScene; // delete scene func
    vm.makePanoDropBox = makePanoDropBox;
    vm.newGroup = newGroup; // new group
    vm.updateGroup = updateGroup; // update group info
    vm.deleteGroup = deleteGroup; // delete group
    vm.updateSceneInGroup = updateSceneInGroup;
    $scope.filesDropbox = [];
    $scope.pano_type = "";
    $scope.makePanoCallback = makePanoCallback;

    $timeout(function(){
        if(localStorage.getItem('scroll-scenes')){
            angular.element('[ui-sortable="vm.groupSortableOptions"]').scrollTop(localStorage.getItem('scroll-scenes'));
        }
    })
    angular.element('[ui-sortable="vm.groupSortableOptions"]').scroll(function(){
        localStorage.setItem('scroll-scenes', angular.element(this).scrollTop());
    });

    var uncategorizedGroup = {
        _id: 'uncategorized',
        title: 'Uncategorized',
        scenes: [],
        readonly: true
    };
    uncategorizedGroup.scenes = vm.project.scenes.filter(function(scene) {
        return LptHelper.isEmpty(scene.group_id);
    });
    uncategorizedGroup.scenes.sort(function(a, b) {
        if(a.order_in_group != b.order_in_group) {
            return a.order_in_group - b.order_in_group;
        }else{
            return a._id > a._id;
        }
    });

    vm.sceneSortableOptions = {
        handle: '.scene-drag-trigger',
        connectWith: '.scenes',
        appendTo: '#scene-management',
        stop: function(e, ui) {
            // Update scene / group order of js object
            angular.forEach(vm.groups, function(group) {
                for (var i = 0; i < group.scenes.length; i++) {
                    if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                        group.scenes[i].group_id = group._id;
                    } else {
                        group.scenes[i].group_id = null;
                    }
                    group.scenes[i].order_in_group = i;
                }
            });

            updateGroups(); // update database
        }
    }
    vm.groupSortableOptions = {
        appendTo: '#scene-management',
        handle: '.group-drag-trigger',
        stop: function() {
            angular.forEach(vm.groups, function(group, index) {
                group.order = index;
            });

            updateGroups();
        },
        items: '.scene-group:not(.not-sortable)'
    };

    if (vm.groups.length == 0 || !vm.groups[0].readonly) {
        vm.groups.unshift(uncategorizedGroup);
    }
    if (vm.groups.length && vm.groups[0].readonly) {
        vm.groups.splice(0, 1);
        vm.groups.unshift(uncategorizedGroup);
    }

    ////////////////

    function makePanoDropBox(pano_type){

        var options = {

            // Required. Called when a user selects an item in the Chooser.
            success: function(files) {
                //alert("Here's the file link: " + files[0].link)
                if (files.length) { // there are selected files to make pano
                    if (files.length <= 100) {
                        // if ($scope.isReplacePano == true) {
                        //     Scene.replace($scope.sceneId, files[0],'dropbox',vm.project._id,pano_type).then(function(status) {
                        //         if (status == 0) {
                        //             Alertify.error('Can not replace scene');
                        //         } else {
                        //             // replace scene success
                        //             makePanoCallback($scope.sceneId);
                        //         }
                        //     }, function(res) {
                        //         Alertify.error("Can not replace scene");
                        //     }).finally(function() {
                        //         vm.isLoading = false;
                        //         angular.element('#block-ui').hide();
                        //     });
                        // } else {
                            //vm.sceneManagementLoading = true;

                        $scope.filesDropbox = files;
                        $scope.pano_type = pano_type;
                        $scope.project_id = vm.project._id;
                        $scope.project_slug = vm.project.slug;

                        var mediaLibraryModal = $uibModal.open({
                            size: 'lg',
                            animation: false,
                            templateUrl: "modules/lapentor.app/views/partials/rendering_dropbox.html",
                            controller: "RenderingModalCtrl",
                            controllerAs: "vm",
                            scope: $scope,
                            resolve: {
                                user: ["$stateParams", "User", function($stateParams, User) {
                                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                                        return User.get();
                                    } else {
                                        return $stateParams.user;
                                    }
                                }]
                            },
                            backdrop: 'static'
                        });

                    } else {
                        Alertify.error("You can only make 100 sphere at a time. Sorry!");
                    }
                } else {
                    // there are no selected files
                    Alertify.error("Can't do that :( You have to select at least 1 pano image");
                }
            },

            // Optional. Called when the user closes the dialog without selecting a file
            // and does not include any parameters.
            cancel: function() {
               // mediaLibraryModal.dismiss();
            },

            // Optional. "preview" (default) is a preview link to the document for sharing,
            // "direct" is an expiring link to download the contents of the file. For more
            // information about link types, see Link types below.
            linkType: "direct", // or "direct"

            // Optional. A value of false (default) limits selection to a single file, while
            // true enables multiple file selection.
            multiselect: true, // or true

            // Optional. This is a list of file extensions. If specified, the user will
            // only be able to select files with these extensions. You may also specify
            // file types, such as "video" or "images" in the list. For more information,
            // see File types below. By default, all extensions are allowed.
            extensions: ['.jpg','.png']
        };

        Dropbox.choose(options);
    }
    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            Alertify.success('Sphere created successfully');
            vm.project.scenes = createdScenes.concat(vm.project.scenes);
            vm.groups[0].scenes = createdScenes.concat(vm.groups[0].scenes);
            angular.forEach(vm.groups, function(group) {
                for (var i = 0; i < group.scenes.length; i++) {
                    if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                        group.scenes[i].group_id = group._id;
                    } else {
                        group.scenes[i].group_id = null;
                    }
                    group.scenes[i].order_in_group = i;
                }
            });
            updateGroups();
        }
    }

    // Handle event when make pano success
    function replacePanoCallback(sceneId) {
        // TODO: reload scene
        if(sceneId == vm.scene._id) {// is current scene
            // reload scene pano
            window.location.reload();
        }else{
            vm.thumbCacheVersion++;
        }
    }

    // Open media library
    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback,
            tab: 'pano'
        });
    }

    function openReplacePanoMediaLib(sceneId) {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: replacePanoCallback,
            canChooseMultipleFile: false,
            isReplacePano: true,
            sceneId: sceneId
        });
    }

    // New group
    function newGroup() {
        Alertify.prompt('Enter group title')
            .then(function(title) {
                SceneGroup.create(title, vm.project).then(function(res) {
                    if (res.status == 1) {
                        res.sceneGroup.scenes = [];
                        res.sceneGroup.order = vm.groups.length;
                        // vm.groups.splice(0, 1); // remove uncategorized group
                        vm.groups.push(res.sceneGroup); // re-append uncategorized group so it alway is the first group
                        updateGroups();
                    }
                });
            });
    }

    var groupTitleChangeTimeoutPromise;

    function updateGroup(group) {
        if (groupTitleChangeTimeoutPromise) $timeout.cancel(groupTitleChangeTimeoutPromise);
        groupTitleChangeTimeoutPromise = $timeout(function() {
            vm.groupLoading = group._id;
            group.project_slug = vm.project.slug;

            SceneGroup.update(group).then(function(status) {
                if (status == 1) {
                    Alertify.success('Group title saved');
                } else {
                    Alertify.error('Can not update group title');
                }
            }).finally(function() {
                vm.groupLoading = null;
            });
        }, 1200);
    }

    function updateGroups() {
        SceneGroup.updateAll(vm.groups, vm.project.slug).then(function(status) {
            if (status == 1) {
                Alertify.success('Order saved');
            } else {
                Alertify.error('Can not save');
            }
        });
    }

    var sceneTitleChangeTimeoutPromise;

    $scope.$watch('vm.scene.title', function(newTitle, oldTitle) {
        if (newTitle != oldTitle) {
            updateSceneInGroup(vm.scene);
        }
    });

    function updateSceneInGroup(scene) {
        if (sceneTitleChangeTimeoutPromise) $timeout.cancel(sceneTitleChangeTimeoutPromise);
        sceneTitleChangeTimeoutPromise = $timeout(function() {
            if (scene.group_id) {
                vm.groupLoading = scene.group_id;
            } else {
                vm.groupLoading = 'uncategorized';
            }
            vm.headerSceneTitleIsLoading = true;
            scene.project_slug = vm.project.slug;

            Scene.update(scene).then(function(status) {
                if (status == 1) {
                    Alertify.success('Scene title saved');
                } else {
                    Alertify.error('Can not update Scene title');
                }
            }).finally(function() {
                vm.groupLoading = null;
                vm.headerSceneTitleIsLoading = false;
            });
        }, 1000);
    }

    // Delete group
    function deleteGroup(deletedGroup) {
        Alertify.confirm('Are you sure? All data will be lost forever').then(function() {
            vm.groupLoading = deletedGroup._id;
            SceneGroup.remove(deletedGroup._id, vm.project.slug).then(function(status) {
                // delete ok, delete group from vm.groups
                vm.groups = LptHelper.deleteObjectFromArray(deletedGroup, vm.groups);

                // Move all scene of deleted group to uncategorized
                angular.forEach(deletedGroup.scenes, function(scene) {
                    scene.group_id = null;
                    uncategorizedGroup.scenes.push(scene);
                    angular.forEach(uncategorizedGroup.scenes, function (scene, index) {
                        scene.order_in_group = index;
                    });
                    updateGroups();
                });
                angular.forEach(vm.groups, function(group, index) {
                    group.order = index;
                });
            }).finally(function() {
                vm.groupLoading = null;

            });
        });
    }
    // Delete scene from DB
    function deleteScene(id) {
        Alertify.confirm('Are you sure? All data will be lost forever').then(function() {
            var shouldDeleteScene = LptHelper.getObjectBy('_id', id, vm.project.scenes);
            if(shouldDeleteScene) {
                vm.groupLoading = shouldDeleteScene.group_id?shouldDeleteScene.group_id:'uncategorized';
            }
            Scene.remove(id, vm.project.slug).then(function(res) {
                if (res.data.status == 1) {
                    // delete ok
                    // - if deleted scene is the last scene on earth -> go back to project page
                    deleteSceneObject(id); // delete scene from js object
                    if (vm.project.scenes.length == 0) {
                        $state.go('project.info', { id: vm.project._id });
                    } else { // - else we still have some scene left, load it
                        if (id == vm.scene._id) { // if deleted scene is current scene -> load remaining scene
                            angular.forEach(vm.project.scenes, function(scene) {
                                if (scene._id != id) {
                                    $state.go('project.editor', { id: vm.project._id, scene_id: scene._id, scene: scene });
                                }
                            });
                        }
                    }
                } else {
                    Alertify.error(res.data.errors.message);
                }
            }, function(res) {
                Alertify.error("Can not delete scene");
                console.log(res);
            }).finally(function () {
                vm.groupLoading = null;
            });
        });
    }

    // Delete scene object in vm.scenes & vm.groups, prevent cached data
    function deleteSceneObject(id) {
        vm.project.scenes = LptHelper.deleteObjectFromArrayBy('_id', id, vm.project.scenes);

        angular.forEach(vm.groups, function(group) {
            if (!LptHelper.isEmpty(group.scenes)) {
                group.scenes = LptHelper.deleteObjectFromArrayBy('_id', id, group.scenes);
            }
        });
        angular.forEach(vm.groups, function(group) {
            for (var i = 0; i < group.scenes.length; i++) {
                if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                    group.scenes[i].group_id = group._id;
                } else {
                    group.scenes[i].group_id = null;
                }
                group.scenes[i].order_in_group = i;
            }
        });
        updateGroups();
    }
}
function RenderingModalCtrl($scope, $timeout, $uibModalInstance, user, Alertify, Scene){
    var vm = this;
    vm.user = user;
    vm.filesDropbox = $scope.filesDropbox;
    vm.makePanoProgress = 0;
    vm.filesCreateScene = {};
    vm.rendering = 0;
    vm.renderingComplate = 0;
    vm.renderingTotal = 0;

    angular.forEach(vm.filesDropbox, function(file) {
        file.id = file.id.replace(':','');
        vm.filesCreateScene[file.id] = file;
    });

    vm.renderingTotal = vm.filesDropbox.length;
    _makePanos(vm.filesDropbox,'dropbox',$scope.project_id, $scope.project_slug, $scope.pano_type,0,vm.renderingTotal);
    if(vm.filesDropbox.length >=2 && (!angular.isUndefined(vm.user.subscribed) && vm.user.subscribed)){
        _makePanos(vm.filesDropbox,'dropbox',$scope.project_id, $scope.project_slug, $scope.pano_type,1,vm.renderingTotal);
    }

    function _makePanos(selectedMedias, type, project_id, project_slug, pano_type, sortMedia, totalMedia){
        if(!angular.isUndefined(vm.filesCreateScene[selectedMedias[sortMedia].id].class)){
            var newSortMedia = sortMedia+1;
            if(totalMedia > newSortMedia){
                //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
            }
            return false;
        }
        vm.filesCreateScene[selectedMedias[sortMedia].id].class = "working";
        vm.rendering = vm.rendering + 1;

        var media = [];
        media.push(selectedMedias[sortMedia]);

        Scene.create(media, type, project_id, project_slug, pano_type).then(function(res) {
            try {
                res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                if (res.status == 0) {
                    // make pano failed
                    vm.filesCreateScene[selectedMedias[sortMedia].id].class = "fail";
                    Alertify.error(res.errors.message);
                } else {
                    // make pano ok
                    //_cancel();
                    vm.filesCreateScene[selectedMedias[sortMedia].id].class = "success";

                    var createdScenes = res.scenes;
                    $scope.makePanoCallback(createdScenes);
                }
            } catch (e) {
                console.error(e);
            }

        }, function(res) {
            Alertify.error("Can not create scene");
            vm.filesCreateScene[selectedMedias[sortMedia].id].class = "fail";
            console.log(res);
        }).finally(function() {
            vm.renderingComplate = vm.renderingComplate +1;
            vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
            if(totalMedia - vm.renderingComplate == 0){
                //vm.makePanoProgress = 100;
                $timeout(function(){
                    $uibModalInstance.dismiss();
                },2000)

                //_cancel();

            }else{
                var newSortMedia = sortMedia+1;
                if(totalMedia > newSortMedia){
                    //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                    _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
                }

            }
        });
    }

}
}());

;(function() {
"use strict";

EditorToolbarCtrl.$inject = ["$scope", "$rootScope", "Alertify", "Hotspot", "Project", "Scene"];
angular.module('lapentor.app')
    .controller('EditorToolbarCtrl', EditorToolbarCtrl);

function EditorToolbarCtrl($scope, $rootScope, Alertify, Hotspot, Project, Scene) {
    var vm = $scope.vm;
    vm.isOpenHotspotList = false;
    var currentHotspotThemeSlug = vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : '';
    vm.hotspotTypes = Hotspot.getTypes(currentHotspotThemeSlug);
    try {
        angular.forEach(vm.hotspotTypes, function(hpType) {
            var customIcon = vm.project.theme_hotspot.config[hpType.name + '_icon_custom'];
            if (customIcon) {
                hpType.icon = customIcon;
            }
        });
    } catch (e) {}
    // functions
    vm.updateScene = updateScene;
    vm.saveDefaultView = saveDefaultView;
    vm.confirmMaxMinZoom = confirmMaxMinZoom;
    vm.saveMinZoom = saveMinZoom;
    vm.saveMaxZoom = saveMaxZoom;
    vm.resetZoom = resetZoom;
    vm.saveNewHotspot = saveNewHotspot;
    vm.saveLimitView = saveLimitView;
    vm.applyLimitForAllScenes = applyLimitForAllScenes;
    vm.resetLimitView = resetLimitView;
    vm.toggleHotspotList = toggleHotspotList;
    vm.deleteHotspot = deleteHotspot;

    vm.littleplanet = littleplanet;

    vm.v = 90;
    vm.h = 90;
    vm.scene.project_slug = vm.project.slug;
    vm.scene.all_scenes = false;
    vm.scene.scenes_columns = [];
    ////////

    function deleteHotspot(id, $event) {
        if ($event) $event.stopPropagation();
        $rootScope.$emit('evt.hotspoteditable.deleteHotspot', id);
    }

    /**
     * Save new hotspot to DB
     * then append it to Sphere viewer
     * @param  {jquery ui object} event
     * @param  {jquery ui object} ui
     * @param  {string} hotspotType [e.g: point, article,...]
     */
    function saveNewHotspot(event, ui, hotspotType) {

        var top = ui.offset.top + 45 / 2 - 48;
        var left = ui.offset.left + 45 / 2 - 240;

        var hotspotView = vm.sceneEditSphere.screentosphere(left, top); // calculate sphere postion of hotspot
        vm.sphereIsLoading = true;
        Hotspot.create(hotspotView.x, hotspotView.y, hotspotType.name, vm.scene._id, vm.project.slug).then(function(res) {
            if (res.data.status == 1) {
                var newHotspot = res.data.hotspot;
                if (!vm.hotspots) {
                    vm.hotspots = [];
                }
                newHotspot.icon = getHotspotDefaultIcon(newHotspot.type);
                vm.hotspots.unshift(newHotspot);
                Alertify.success('Hotspot added');
            }
        }, function(res) {
            Alertify.error('Can not add hotspot');
            console.log(res);
        }).finally(function() {
            vm.sphereIsLoading = false;
        });
    }

    function getHotspotDefaultIcon(type) {
        var icon = '';
        angular.forEach(vm.hotspotTypes, function (hpType) {
            if(hpType.name == type) {
                icon = hpType.icon;
                return;
            }
        });

        return icon;
    }

    // Show/hide hotspot list
    function toggleHotspotList(status) {
        if (status == 'close') {
            angular.element('#hotspot-list').removeClass('active');
        }
        switch (status) {
            case 'close':
                angular.element('#hotspot-list').removeClass('active');
                break;
            case 'open':
                angular.element('#hotspot-list').addClass('active');
                break;
            default:
                angular.element('#hotspot-list').toggleClass('active');
                break;
        }
    }

    function saveLimitView(position) {
        var panoViewerHeight = angular.element('#' + vm.sceneEditSphereViewerDomId).height(),
            panoViewerWidth = angular.element('#' + vm.sceneEditSphereViewerDomId).width();

        if (position == 'top') { vm.scene.limit_view.top = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, 0).y; }
        if (position == 'bottom') { vm.scene.limit_view.bottom = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, panoViewerHeight).y; }
        if (position == 'left') { vm.scene.limit_view.left = vm.sceneEditSphere.screentosphere(0, panoViewerHeight / 2).x; }
        if (position == 'right') { vm.scene.limit_view.right = vm.sceneEditSphere.screentosphere(panoViewerWidth, panoViewerHeight / 2).x; }
        // Save to database
        vm.updateScene('Scene limit ' + position + ' saved');
    }

    function applyLimitForAllScenes() {
        var ERROR_MSG = 'Can not apply limit. Please try again or contact our support',
            SUCCESS_MSG = 'Limit applied successfully';

        // Save to database
        Scene.updateLimitViewForAllScene(vm.scene.limit_view, vm.project._id, vm.project.slug).then(function (status) {
            if(status == 1) {
                Alertify.success(SUCCESS_MSG);

                // Apply for local var
                angular.forEach(vm.project.scenes, function (scene) {
                    scene.limit_view.top = vm.scene.limit_view.top;
                    scene.limit_view.bottom = vm.scene.limit_view.bottom;
                    scene.limit_view.left = vm.scene.limit_view.left;
                    scene.limit_view.right = vm.scene.limit_view.right;
                });
            }else{
                Alertify.error(ERROR_MSG);
            }
        }, function (err) {
            Alertify.error(ERROR_MSG);
        });
    }

    function updateProject(message, callback) {
        Project.update(vm.project).then(function(status) {
            if (status && message) {
                Alertify.success(message);
            }
            if (callback) callback();

        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            vm.isUpdating = '';
        });
    }

    function confirmMaxMinZoom(type){
        if(type == 'min') saveMinZoom();
        if(type == 'max') saveMaxZoom();
        if(type == 'resetZoom') resetZoom();
        
        // Alertify.confirm("Save all Scenes ?").then(
        //     function(){
        //         if(type == 'min') saveMinZoom('all');
        //         if(type == 'max') saveMaxZoom('all');
        //         if(type == 'resetZoom') resetZoom('all');
        //     },
        //     function(){
        //         if(type == 'min') saveMinZoom();
        //         if(type == 'max') saveMaxZoom();
        //         if(type == 'resetZoom') resetZoom();
        //     });
    }

    function saveMinZoom(type) {
        vm.scene.min_zoom = vm.sceneEditSphere.getCurrentView('fov');
        if (vm.scene.min_zoom && vm.scene.max_zoom && vm.scene.min_zoom > vm.scene.max_zoom) {
            Alertify.error('Max zoom must be smaller than Min zoom');
            return;
        } else {
            if(type == "all"){
                vm.scene.all_scenes = true;
                vm.scene.scenes_columns = ['min_zoom'];
            }
            // Save to database
            vm.updateScene('Max zoom saved');
        }
    }

    function saveMaxZoom(type) {
        vm.scene.max_zoom = vm.sceneEditSphere.getCurrentView('fov');
        if (vm.scene.min_zoom && vm.scene.max_zoom && vm.scene.max_zoom < vm.scene.min_zoom) {
            Alertify.error('Min zoom must be greater than Max zoom');
            return;
        } else {
            if(type == "all"){
                vm.scene.all_scenes = true;
                vm.scene.scenes_columns = ['max_zoom'];
            }
            // Save to database
            vm.updateScene('Min zoom saved');
        }
    }

    function resetZoom(type) {
        vm.scene.max_zoom = null;
        vm.scene.min_zoom = null;
        if(type == "all"){
            vm.scene.all_scenes = true;
            vm.scene.scenes_columns = ['max_zoom','min_zoom'];
        }
        vm.updateScene('Zoom limit resetted');
    }

    /**
     * Reset limit view for all or one scene
     * @param  {string} type ['all'/'one']
     */
    function resetLimitView(type) {
        switch(type) {
            case 'all':

                break;
            default:
                vm.scene.limit_view.top = null;
                vm.scene.limit_view.bottom = null;
                vm.scene.limit_view.left = null;
                vm.scene.limit_view.right = null;
                break;
        }
        vm.updateScene('Reset limit view successfully.');
    }

    function saveDefaultView() {
        // TODO: prevent multiple click on short time
        _flashScreen();
        if (angular.isUndefined(vm.scene.default_view)) vm.scene.default_view = {}; // init default_view

        var panoViewerHeight = angular.element('#' + vm.sceneEditSphereViewerDomId).height(),
            panoViewerWidth = angular.element('#' + vm.sceneEditSphereViewerDomId).width(),
            hlookat = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, panoViewerHeight / 2).x;



        vm.scene.default_view.fov = vm.sceneEditSphere.getCurrentView('fov');
        vm.scene.default_view.hlookat = hlookat;
        vm.scene.default_view.vlookat = vm.sceneEditSphere.getCurrentView('vlookat');

        // Save to database
        vm.updateScene('Default view saved');
    }

    function updateScene(successMessage) {
        Scene.update(vm.scene).then(function(status) {
            if (status == 1) {
                Alertify.success(successMessage);
            } else {
                Alertify.error('Can not update Scene');
            }
            vm.scene.all_scenes = false;
            vm.scene.scenes_column = '';
        }).catch(function(e) {
            console.error(e);
            Alertify.error('Can not update Scene: ' + e);
            vm.scene.all_scenes = false;
            vm.scene.scenes_column = [];
        });

    }

    function littleplanet(){

        if(vm.sceneEditSphere.krpano().get('view.fisheye') == 0){
            vm.v = vm.sceneEditSphere.krpano().get('view.vlookat');
            vm.h = vm.sceneEditSphere.krpano().get('view.hlookat');
            vm.sceneEditSphere.tween('view.fov', 150);
            vm.sceneEditSphere.tween('view.fisheye', 1.0);
            vm.sceneEditSphere.tween('view.vlookat', 90);
            vm.sceneEditSphere.tween('view.hlookat', vm.h);
        }else{
            vm.sceneEditSphere.tween('view.vlookat', vm.v, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.hlookat', vm.h, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.fov', 90, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.fisheye', 0, 2.5, 'easeInOutQuad');
        }
    }

    /**
     * Camera flash effect
     */
    function _flashScreen() {
        var whiteSplash = angular.element('#whiteSplash');
        whiteSplash.hide().removeClass('flash');
        whiteSplash.show().addClass('flash');
        setTimeout(function() {
            whiteSplash.hide();
        }, 200);
    }
}
}());

;(function() {
"use strict";

MarketplaceItemConfigCtrl.$inject = ["$scope", "$rootScope", "$timeout", "Alertify", "Project", "LptHelper", "$uibModal", "Hotspot"];
angular.module('lapentor.app')
    .controller('MarketplaceItemConfigCtrl', MarketplaceItemConfigCtrl);

function MarketplaceItemConfigCtrl($scope, $rootScope, $timeout, Alertify, Project, LptHelper, $uibModal, Hotspot) {
    var vm = this;
    $scope.updateConfig = updateConfig;
    $scope.isUpdating = false;

    ////////////////

    $rootScope.$on('evt.marketplace.openConfigPage', function(event, item) {
        var templateUrl = '';
        var controllerName = ''; // dynamic controller name for config modal

        if (item) {
            var originalItem = item;
            switch (item.type) {
                case 'plugin':
                    templateUrl = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, 'tpl/config.html');
                    controllerName = item.type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                    item = LptHelper.getObjectBy('slug', item.slug, $scope.project.plugins);
                    break;
                case 'theme':
                    switch(item.theme_type) {
                        case 'hotspot':
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, 'hotspot.config.html');
                            break;
                        case 'scenelist':
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, 'scenelist.config.html');
                            break;
                        default:
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, 'tpl/config.html');
                    }
                    
                    controllerName = item.theme_type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                    item = $scope.project['theme_' + item.theme_type];
                    item.theme_type = originalItem.theme_type;
                    // init config
                    if (angular.isUndefined($scope.project['theme_' + item.theme_type].config)) {
                        $scope.project['theme_' + item.theme_type].config = {};
                    }
                    break;
            }
            item.type = originalItem.type;
            item.name = originalItem.name;
            $scope.templateUrl = templateUrl;
            $scope.item = item;
            vm.item = item;
            $scope.openCustomIconMediaLib = openCustomIconMediaLib; // delare global function to show custom icon media library
            $scope.resetCustomHotspotIcon = resetCustomHotspotIcon;
            $scope.hotspotTypes = Hotspot.getTypes(item.slug);
            $scope.project.theme_hotspot.config = $scope.project.theme_hotspot.config || {};
            
            try {
                // Apply custom icons
                angular.forEach($scope.hotspotTypes, function(hpType) {
                    var customIcon = $scope.project.theme_hotspot.config[hpType.name + '_icon_custom'];
                    hpType.icon_default = hpType.icon;
                    if (customIcon) {
                        hpType.icon = customIcon;
                    }
                });
            } catch (e) {
                console.error(e);
            }

            if (LptHelper.isControllerExist(controllerName)) { // check if config controller is defined or not
                var configPage = $uibModal.open({
                    templateUrl: 'modules/lapentor.app/views/partials/marketplace.item.config.html',
                    size: 'lg',
                    scope: $scope,
                    controller: controllerName, // this controller is defined in each theme/plugin
                    controllerAs: 'vm',
                    windowClass: 'marketplace-item-detail',
                    resolve: {
                        project: function() {
                            return $scope.project;
                        },
                        item: function() {
                            return item;
                        }
                    }
                });

                $scope.dismissConfigModal = configPage.dismiss;

                configPage.closed.then(function() {
                    angular.element('.modal-backdrop').remove();
                    angular.element('body').removeClass('modal-open');
                });
            }
        }
    });

    function openCustomIconMediaLib(name) {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: function(file) {
                if (file.mime_type.indexOf('image') != -1) { // check file type
                    angular.forEach($scope.hotspotTypes, function(hpType) {
                        if (hpType.name == name) {
                            hpType.icon = file.path;
                            if ($scope.project.theme_hotspot.config) {
                                $scope.project.theme_hotspot.config[name + '_icon_custom'] = file.path;
                            }
                            return;
                        }
                    });
                } else {
                    Alertify.error('Only support png format');
                }
            }
        });
    }

    function resetCustomHotspotIcon(name) {
        angular.forEach($scope.hotspotTypes, function(hpType) {
            if (hpType.name == name) {
                hpType.icon = hpType.icon_default;
                if ($scope.project.theme_hotspot.config) {
                    delete $scope.project.theme_hotspot.config[name + '_icon_custom'];
                }
                return;
            }
        });
    }

    function updateConfig(item, _config, callback) {
        $scope.isUpdating = true;
        switch (item.type) {
            case 'plugin':
                
                Project.updatePluginConfig({ slug: item.slug, config: _config }, $scope.project._id).then(function(status) {
                    if (status) {
                        // Add config to "project" object
                        $scope.project.plugins[item.slug] = _config;
                        if (!item.config) item.config = _config;

                        Alertify.success(item.name + ' config updated');
                    } else {
                        Alertify.error('Can not update config');
                    }
                }).finally(function() {
                    callback();
                    $scope.isUpdating = false;
                });
                break;
            default:
                Project.updateThemeConfig(item.theme_type, $scope.project._id, _config).then(function(status) {
                    if (status) {
                        Alertify.success(item.name + ' config updated');
                    } else {
                        Alertify.error('Can not update config');
                    }
                }).finally(function() {
                    callback();
                    $scope.isUpdating = false;
                });
                break;
        }
    }
}
}());

;(function() {
"use strict";

ProjectEditorCtrl.$inject = ["$scope", "ngMeta", "$uibModal", "$compile", "$state", "$rootScope", "$timeout", "$stateParams", "envService", "Alertify", "project", "Scene", "lptSphere", "Hotspot", "LptHelper", "user"];
ProjectConfigModalCtrl.$inject = ["$scope", "$rootScope", "$timeout", "$state", "$filter", "$uibModalInstance", "ngMeta", "Alertify", "CONST", "Project"];
angular.module('lapentor.app')
    .controller('ProjectEditorCtrl', ProjectEditorCtrl)
    .controller('ProjectConfigModalCtrl', ProjectConfigModalCtrl);

function ProjectEditorCtrl($scope, ngMeta, $uibModal, $compile, $state, $rootScope, $timeout, $stateParams, envService, Alertify, project, Scene, lptSphere, Hotspot, LptHelper, user) {
    var vm = this,
        titleChangeTimeoutPromise,
        sceneEditSphereViewerDomId = 'SphereEditable';

    vm.project = $scope.project = project;
    vm.user = user;
    vm.sphereIsLoading = false;
    vm.sceneEditSphereViewerDomId = sceneEditSphereViewerDomId;
    vm.project.shareUrl = envService.read('siteUrl') + '/sphere/' + vm.project.slug;
    vm.groups = vm.project.groups; // all groups
    vm.scene = LptHelper.getObjectBy('_id', $stateParams.scene_id, vm.project.scenes, vm.project.scenes && vm.project.scenes.length ? vm.project.scenes[0] : {}); // current scene
    vm.sceneEditSphere = new lptSphere(vm.scene._id);
    vm.hotspotTypes = Hotspot.getTypes();
    vm.minimizeMarket = true;
    vm.headerSceneTitleIsLoading = false;
    vm.hideAllEditor = true; // use to show/hide all editor element
    vm.fov = 90;

    vm.openLiveView = openLiveView;
    vm.openMediaLib = openMediaLib;

    ngMeta.setTitle([project.title, vm.scene.title].join(' - '));

    ///////////////////

    // Open media library if there are no scenes
    if (vm.project.scenes.length == 0) {
        $timeout(function() {
            vm.openMediaLib();
        }, 1000);
    }

    // Show/Hide crisp live chat
    angular.element('body').addClass('onEditor');
    $scope.$on("$destroy", function() {
        angular.element('body').removeClass('onEditor');
    });

    // Init Sphere viewer
    $timeout(function() {
        if (angular.isDefined(vm.scene.xml)) {
            var defaultSettings = {};

            if (vm.scene.default_view) {
                defaultSettings = {
                    'view.maxpixelzoom': 0,
                    'view.hlookat': vm.scene.default_view.hlookat,
                    'view.vlookat': vm.scene.default_view.vlookat,
                    'view.fov': (vm.scene.default_view.fov != 120) ? vm.scene.default_view.fov : 90
                };

                vm.fov = (vm.scene.default_view.fov != 120) ? vm.scene.default_view.fov : 90;
            }

            vm.sceneEditSphere.init(sceneEditSphereViewerDomId, vm.scene.xml, defaultSettings);
        } else {
            vm.sceneEditSphere.init(sceneEditSphereViewerDomId, envService.read('apiUrl') + '/xml-cube');
        }

        vm.sceneEditSphere.on('onxmlcomplete', function() {
            if (angular.isDefined(vm.scene.hotspots)) {
                vm.hotspots = vm.scene.hotspots ? vm.scene.hotspots : [];
                angular.forEach(vm.hotspots, function(hp) {
                    hp.icon = getHotspotIcon(hp.type);
                });
                $scope.$digest();
            }
        });

        // Show fov (zoom level) real time
        $scope.$on('evt.krpano.onmousewheel', function() {
            vm.fov = vm.sceneEditSphere.getCurrentView('fov');
            $scope.$apply();
        });
    });

    // Listen for hotspot deleting event
    $rootScope.$on('evt.hotspoteditable.hospotDeleted', function(evt, id) {
        try {
            vm.hotspots = vm.hotspots.filter(function(hotspot) {
                return (hotspot._id != id);
            });
        } catch (e) {
            console.error(e);
        }
    });

    // Listen for sphere loading event
    $rootScope.$on('evt.editor.isloading', function(evt, isloading) {
        vm.sphereIsLoading = isloading;
    });

    // Listen for open live view event
    $rootScope.$on('evt.editor.openLiveView', function() {
        openLiveView();
    });

    vm.modalProjectConfigure = function() {
        $uibModal.open({
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/project_configure.html',
            scope: $scope,
            controllerAs: 'pcmVm',
            controller: ProjectConfigModalCtrl,
        });
    }

    /////// function declaration

    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback
        });
    }

    function getHotspotIcon(type) {
        var hotspotType = LptHelper.getObjectBy('name', type, Hotspot.getTypes(vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : ''));
        return hotspotType.icon;
    }

    function openLiveView() {
        window.open(vm.project.shareUrl + '?scene=' + vm.scene._id + '&token=' + localStorage.getItem('satellizer_token'), 'lptLiveView');
    }

}

/**
 * Controller for Project config modal
 * templateUrl: 'modules/lapentor.app/views/partials/project.editor/project_configure.html'
 */
function ProjectConfigModalCtrl($scope, $rootScope, $timeout, $state, $filter, $uibModalInstance, ngMeta, Alertify, CONST, Project) {
    var pcmVm = this; // A.K.A: Project config modal vm

    pcmVm.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    var vm = this,
        time,
        titleChangeTimeoutPromise;
    ngMeta.setTitle($scope.project.title);

    pcmVm.deleteProject = deleteProject;
    pcmVm.titleIsLoading = false;
    pcmVm.settingIsLoading = false;
    pcmVm.project = $scope.project;
    pcmVm.project.public = angular.isDefined(pcmVm.project.public) ? pcmVm.project.public : 1;
    pcmVm.project.in_portfolio = angular.isDefined(pcmVm.project.in_portfolio) ? pcmVm.project.in_portfolio : 1;
    pcmVm.project.shareUrl = $filter('shareUrl')(pcmVm.project.slug);

    pcmVm.updateProject = updateProject;
    pcmVm.updateGoogleProject = updateGoogleProject; // Update project's Google Analytic ID
    pcmVm.updatePublicAccess = updatePublicAccess; // Update project's publicity
    pcmVm.updateCanListInPortfolio = updateCanListInPortfolio;
    pcmVm.updatePasswordProject = updatePasswordProject; // Update project's password
    pcmVm.openMediaAssetLib = openMediaAssetLib;
    pcmVm.deleteSnapshot = deleteSnapshot; // Delete snapshot

    // Init project meta
    if (angular.isUndefined(pcmVm.project.meta) || pcmVm.project.meta.length == 0) {
        pcmVm.project.meta = {};
        var rawProject = angular.fromJson(angular.toJson(pcmVm.project));
        pcmVm.project.meta.title = rawProject.title;
        if (rawProject.scenes.length && !pcmVm.project.meta.image) {
            pcmVm.project.meta.image = rawProject.scenes[0].pano_thumb;
        }
    }

    // Get exported versions
    getExportedVersions();

    ///////////////

    pcmVm.isDeletingSnapshot = false;

    function deleteSnapshot(id) {
        pcmVm.isDeletingSnapshot = true;
        Project.deleteSnapshot(id).then(function(res) {
            if (res) {
                // delete success
                jQuery('#snapshot' + id).remove();
            }
        }, function(err) {
            console.log(err);
        }).finally(function() {
            pcmVm.isDeletingSnapshot = false;
        });
    }

    function getExportedVersions() {
        Project.getExportedVersions($scope.project._id).then(function(res) {
            pcmVm.exportedVersions = res;
        }, function(err) {
            console.log(err);
        });
    }

    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            pcmVm.project.scenes = createdScenes.concat(pcmVm.project.scenes);
            $state.go('project.editor', { id: createdScenes[0].project_id, scene_id: createdScenes[0]._id });
        }
    }

    // Watch for changes & Update project title 
    $scope.$watch('pcmVm.project.title', function(newVal, oldVal) {
        if (newVal != oldVal) {
            if (titleChangeTimeoutPromise) $timeout.cancel(titleChangeTimeoutPromise);
            titleChangeTimeoutPromise = $timeout(function() {
                pcmVm.titleIsLoading = true;
                updateTitle();
            }, 1000);
        }
    });

    /**
     * Open media library in Asset tab
     */
    function openMediaAssetLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            pcmVm.project.meta.image = file.path;
        }
    }

    // Update project info
    function updateProject() {
        pcmVm.isSaving = true;
        Project.update(pcmVm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            pcmVm.titleIsLoading = false;
            pcmVm.isSaving = false;
        });
    }

    function updateGoogleProject() {
        pcmVm.isSavingGoogle = true;
        Project.update(pcmVm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            pcmVm.isSavingGoogle = false;
        });
    }

    // Update project title
    function updateTitle() {
        Project.updateTitle(pcmVm.project.title, pcmVm.project._id).then(function(newSlug) {
                pcmVm.project.slug = newSlug;
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.titleIsLoading = false;
            });
    }

    // Update project public access
    function updatePublicAccess() {
        pcmVm.projectPublicityIsLoading = true;
        Project.updatePublicAccess(pcmVm.project.public, pcmVm.project._id).then(function(status) {
                Alertify.success('Project publicity updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.projectPublicityIsLoading = false;
            });
    }

    // Update project can list in portfolio
    function updateCanListInPortfolio() {
        pcmVm.projectCanListInPortfolioLoading = true;
        Project.updateCanListInPortfolio(pcmVm.project.in_portfolio, pcmVm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.projectCanListInPortfolioLoading = false;
            });
    }

    // Update project enable password
    function updatePasswordProject(type) {
        if (type == 'input') {
            $timeout.cancel(time)
            time = $timeout(function() {
                if (pcmVm.project.password.string.length > 5) {
                    updatePassword();
                } else {
                    Alertify.error('You have entered less than 6 characters for password');
                }
            }, 1500)
        } else {
            updatePassword();
        }
    }

    function updatePassword() {
        pcmVm.isUpdatingPassword = true;
        Project.updatePasswordProject(pcmVm.project.password, pcmVm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.isUpdatingPassword = false;
            });
    }

    // Delete project by id
    function deleteProject() {
        var id = pcmVm.project._id;
        Alertify.confirm('Are you sure? All data will be lost').then(function() {
            // Remove on server
            Project.remove(id).then(function(res) {
                if (res.data.status == 1) {
                    $state.go('index');
                } else {
                    Alertify.error('Can not delete project');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not delete project');
            })
        });
    }

    function downloadProject(id) {
        Alertify.confirm('You will be charged $' + CONST.export_price + ' for each download. <br> Do you want to continue?').then(
            function onOk() {
                pcmVm.isGettingProject = true;
                Project.download(id).then(function(res) {
                    switch (res.status) {
                        case 1:
                            window.open(res.download_link, '_blank');
                            break;
                        case 0: // on trial
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                        case -1: // payment failed
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                    }
                }, function(err) {
                    console.log(err)
                    Alertify.error('Can not download project. Please try again');
                }).finally(function() {
                    pcmVm.isGettingProject = false;
                });
            },
            function onCancel() {}
        );
    }
}
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('fluidLoading', function() {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'modules/fluidloading.html',
            link: function (scope, element, attrs) {
                scope.type = attrs.type;
                scope.text = attrs.text;
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('resolveLoader', ["$rootScope", "$timeout", "$interval", function($rootScope, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'modules/loading.html',
            link: function(scope, element) {

                $rootScope.$on('$stateChangeStart', function(event, currentRoute, previousRoute) {
                    // if (previousRoute) return;

                    $timeout(function() {
                        element.removeClass('ng-hide');
                    });
                });

                $rootScope.$on('$stateChangeSuccess', function() {
                    $timeout(function() {
                        element.addClass('ng-hide');
                    });
                });
            },
            controller: function() {
                var vm = this,
                    idx = 0,
                    loadingMsg1 = [
                        "Loading your experiences...",
                        "Getting things ready...",
                        "This take quite long huh...but don't leave us :(",
                        "Wow, this is really slow, would you like a joke",
                        "Knock knock...",
                        "Who's there?",
                        "Hi, this is Lapentor",
                        "That's all :P"
                    ],
                    availableLoadingIcon = [
                        'audio',
                        'ball-triangle',
                        'bars',
                        'circles',
                        'grid',
                        'hearts',
                        'oval',
                        'puff-dark',
                        'puff',
                        'rings',
                        'spinning-circles',
                        'tail-spin',
                        'three-dots',
                    ],
                    intervalPromise;

                vm.isDead = false;
                vm.selectedText = loadingMsg1[0];
                vm.isLoading = true;
                vm.loadingIcon = availableLoadingIcon[6];

                $rootScope.$on('$stateChangeSuccess', function() {
                    // $interval.cancel(intervalPromise);
                });

                $rootScope.$on('$stateChangeError', function() {
                    // $interval.cancel(intervalPromise);
                    vm.isDead = true;
                    vm.selectedText = 'Hmm...Please refresh your browser to try again...';
                    vm.isLoading = false;
                });
            },
            controllerAs: 'vm'
        };
    }]);
}());

;(function() {
"use strict";

/**
 * List icon
 * http://samherbert.net/svg-loaders/
 */
angular.module('lapentor.app')
    .directive('simpleLoading', function() {

        return {
            restrict: 'E',
            replace: true,
            template: '<div class="loading theme-bg-opacity"><img src="bower_components/SVG-Loaders/svg-loaders/{{ icon }}.svg" height="30"></div>',
            link: function (scope, element, attrs) {
                if(attrs.icon) {
                    scope.icon = attrs.icon;
                }else{
                    scope.icon = 'oval';
                }
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableArticle', ["$compile", function($compile) {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableArticleCtrl'
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableImage', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableImageCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditable', ["$compile", function($compile) {

        return {
            restrict: 'E',
            controllerAs: 'vm',
            scope: {
                project: '=',
                hotspots: '=',
                hotspot: '=',
                scenes: '=',
                scenesphereinstance: '=',
                currentscene: '='
            },
            controller: 'HotspotEditableCtrl',
            link: function(scope, element, attrs) {
                scope.$watch('hotspots.length', function (newVal, oldVal) {
                    generateChildHotspotDirective();
                });
                
                generateChildHotspotDirective();

                // Generate child Theme
                function generateChildHotspotDirective() {
                    // Generate Theme element
                    var directiveName = 'hotspot-editable-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + "></" + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }
            },
        };
    }]);
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditablePoint', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditablePointCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableSound', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableSoundCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableTextf', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableTextfCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableUrl', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableUrlCtrl'
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.app')
    .directive('hotspotEditableVideo', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/hotspoteditable.html',
            controller: 'HotspotEditableVideoCtrl'
        };
    });
}());

;(function() {
"use strict";

// Theme: Transparent
// Parent scope: marketplace.item.config.js
controlbarCrystalConfigCtrl.$inject = ["$scope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('controlbarCrystalConfigCtrl', controlbarCrystalConfigCtrl);

function controlbarCrystalConfigCtrl($scope, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_controlbar.config;
    vm.config.position = 'top';

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_controlbar.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: crystal
angular.module('lapentor.marketplace.themes')
    .directive('controlbarCrystal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/crystal/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "Marketplace", "$rootScope", "$window", function($scope, $timeout, Marketplace, $rootScope, $window) {
                var vm = this;
                vm.project = $scope.project;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                vm.config = vm.project.theme_controlbar.config;

                // init config
                vm.config.position = vm.config.position || 'top';

                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                } catch (e) {
                    vm.themeStyle = {};
                }
                $rootScope.$on('evt.onsphereclick', function() {
                    if ($('#controlbar-crystal').hasClass('off')) {
                        $rootScope.isScenelistOff = false;

                        $('#controlbar-crystal').removeClass('off');
                    } else {
                        $('#controlbar-crystal').addClass('off');
                        $rootScope.isScenelistOff = true;
                    }
                });

                // Apply scroll for mobile or small screen devices
                if (isMobile.any || $window.innerWidth <= 640) {
                    $timeout(function () {
                        jQuery('#controlbar-crystal>ul').mCustomScrollbar({
                            axis: (vm.config.position == 'top' || vm.config.position == 'bottom') ? 'x':'y',
                            advanced:{ autoExpandHorizontalScroll: 'x' }
                        });    
                    },500);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: slash
// Parent scope: marketplace.item.config.js
controlbarSlashConfigCtrl.$inject = ["$scope", "LptHelper", "project", "item", "$uibModalInstance", "Marketplace"];
angular.module('lapentor.marketplace.themes')
    .controller('controlbarSlashConfigCtrl', controlbarSlashConfigCtrl);

function controlbarSlashConfigCtrl($scope, LptHelper, project, item, $uibModalInstance, Marketplace) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_controlbar.config;
    vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : {};
    vm.isUpdating = false;
    vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins, false);

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_controlbar.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('controlbarSlash', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/slash/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$window", "Marketplace", function($scope, $timeout, $window, Marketplace) {
                var vm = this;
                vm.project = $scope.project;
                vm.config = vm.project.theme_controlbar.config;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                    vm.minimize = vm.config.minimize?vm.config.minimize:false;
                }catch(e) {
                    vm.themeStyle = {};
                }

                // initScrollbar();

                /////////

                // function initScrollbar() {
                //     if (isMobile.any || $window.innerWidth <= 640) {
                //         $timeout(function () {
                //             jQuery('#controlbar-slash ul').mCustomScrollbar({
                //                 axis: 'x',
                //                 advanced:{ autoExpandHorizontalScroll: 'x' }
                //             });    
                //         },500);
                //     }
                // }

            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: default
// Parent scope: marketplace.item.config.js
controlbarDefaultConfigCtrl.$inject = ["$scope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('controlbarDefaultConfigCtrl', controlbarDefaultConfigCtrl);

function controlbarDefaultConfigCtrl($scope, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_controlbar.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('controlbarDefault', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/default/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$window", "Marketplace", function($scope, $timeout, $window, Marketplace) {
                var vm = this;
                vm.project = $scope.project;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                vm.config = vm.project.theme_controlbar.config;

                initScrollbar();

                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                }catch(e) {
                    vm.themeStyle = {};
                }
                function initScrollbar() {
                    if (isMobile.any || $window.innerWidth <= 640) {
                        $timeout(function () {
                            jQuery('#controlbar-default>ul').mCustomScrollbar({
                                axis: 'x',
                                advanced:{ autoExpandHorizontalScroll: 'x' }
                            });    
                        },500);
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: default
// Parent scope: marketplace.item.config.js
controlbarGooeyConfigCtrl.$inject = ["$scope", "$timeout", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('controlbarGooeyConfigCtrl', controlbarGooeyConfigCtrl);

function controlbarGooeyConfigCtrl($scope, $timeout, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_controlbar.config;
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    $uibModalInstance.opened.then(function() {
        $timeout(function() {
            $scope.$broadcast('rzSliderForceRender');
        });
    });

    // init config
    try {
        vm.config.angle = vm.config.angle ? vm.config.angle : 180;
        vm.config.distance = vm.config.distance ? vm.config.distance : 160;
        vm.config.position = vm.config.position ? vm.config.position : 'bottom';
    } catch (e) {
        console.error(e);
    }

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: gooey
angular.module('lapentor.marketplace.themes')
    .directive('controlbarGooey', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/gooey/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "Marketplace", "$ocLazyLoad", function($scope, $timeout, Marketplace, $ocLazyLoad) {
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

            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: default
// Parent scope: marketplace.item.config.js
hotspotBubbleConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotBubbleConfigCtrl', hotspotBubbleConfigCtrl);

function hotspotBubbleConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config?vm.project.theme_hotspot.config:{};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    
    // init config
    try {
        vm.config.show_title = vm.config.show_title ? vm.config.show_title : 'no';
        vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : '#ffcd00';
        vm.config.text_color = vm.config.text_color ? vm.config.text_color : '#000';
    } catch (e) {
        console.error(e);
    }

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubble', ["$compile", "LptHelper", function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/bubble.html',
            link: function(scope, element, attrs) {
                scope.config = scope.project.theme_hotspot.config || {};
                // Point hotspot: Grab target scene thumb
                if (scope.hotspot.type == 'point') {
                    scope.targetScene = LptHelper.getObjectBy('_id', scope.hotspot.target_scene_id, scope.project.scenes);
                }
                // Apply common config
                try {
                    scope.config.arrow_color = {
                        'border-top': '13px solid ' + scope.config.bg_color
                    };

                    scope.hotspot.height = scope.hotspot.height?scope.hotspot.height:scope.hotspot.width;

                    scope.hotspot.margin_top = -((scope.hotspot.height/2) - 25);
                    scope.hotspot.margin_left = -((scope.hotspot.width/2) - 25);
                } catch (e) {
                    console.error(e);
                }

                // Generate child directive
                generateChildDirective(scope.project.theme_hotspot.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;
                vm.project = $scope.project;
                vm.hotspot = $scope.hotspot;
            }]
        };
    }]);
}());

;(function() {
"use strict";

// Theme: default
// Parent scope: marketplace.item.config.js
hotspotCrystalConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotCrystalConfigCtrl', hotspotCrystalConfigCtrl);

function hotspotCrystalConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config?vm.project.theme_hotspot.config:{};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    // init config
    try {
        vm.config.show_title = vm.config.show_title ? vm.config.show_title : 'yes';
        vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : 'rgba(255,255,255,0)';
        vm.config.text_color = vm.config.text_color ? vm.config.text_color : '#FFF';
        vm.config.width = 50;
    } catch (e) {
        console.error(e);
    }

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystal', ["$compile", "LptHelper", function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/crystal.html',
            link: function(scope, element, attrs) {
                scope.config = scope.project.theme_hotspot.config || {};
                // Point hotspot: Grab target scene thumb
                if (scope.hotspot.type == 'point') {
                    scope.targetScene = LptHelper.getObjectBy('_id', scope.hotspot.target_scene_id, scope.project.scenes);
                }
                // Apply common config
                try {
                    scope.config.arrow_color = {
                        'border-top': '13px solid ' + scope.config.bg_color
                    };
                    scope.hotspot.height = scope.hotspot.height?scope.hotspot.height:scope.hotspot.width;

                    scope.hotspot.margin_top = -((scope.hotspot.height/2) - 25);
                    scope.hotspot.margin_left = -((scope.hotspot.width/2) - 25);
                } catch (e) {
                    console.error(e);
                }

                // Generate child directive
                generateChildDirective(scope.project.theme_hotspot.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;
                vm.project = $scope.project;
                vm.hotspot = $scope.hotspot;
            }]
        };
    }]);
}());

;(function() {
"use strict";

// Parent scope: marketplace.item.config.js
hotspotDefaultConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotDefaultConfigCtrl', hotspotDefaultConfigCtrl);

function hotspotDefaultConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefault', ["$compile", function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                generateChildDirective(scope.project.theme_hotspot.slug);
                addOnHoverTextstyle(scope.hotspot);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                // Showtext onhover
                function addOnHoverTextstyle(hotspot) {
                    scope.lptsphereinstance.set('textstyle', {
                        "name": "default_tooltip_style",
                        "font": "Arial",
                        "fontsize": "13",
                        "bold": "true",
                        "roundedge": "4",
                        "background": "false",
                        "border": "false",
                        "textcolor": "0xFFFFFF",
                        "textalign": "center",
                        "vcenter": "true",
                        "edge": "bottom",
                        "xoffset": "0",
                        "yoffset": "0",
                        "padding": "10",
                        "textshadow": "1.0",
                        "textshadowrange": "10.0",
                        "textshadowangle": "0",
                        "textshadowcolor": "0x000000",
                        "textshadowalpha": "1.0",
                    });
                    scope.lptsphereinstance.addHotspotEventCallback(hotspot.name, 'onhover', 'showtext(' + hotspot.title + ', "default_tooltip_style")');
                }
            },
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;
                // Declare config
                vm.config = $scope.project.theme_hotspot.config;
                $scope.config = vm.config;
            }]
        };
    }]);
}());

;(function() {
"use strict";

// Parent scope: marketplace.item.config.js
hotspotGifyConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotGifyConfigCtrl', hotspotGifyConfigCtrl);

function hotspotGifyConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGify', ["$compile", "LptHelper", function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/gify.html',
            link: function(scope, element, attrs) {
                // Point hotspot: Grab target scene thumb
                if (scope.hotspot.type == 'point') {
                    scope.targetScene = LptHelper.getObjectBy('_id', scope.hotspot.target_scene_id, scope.project.scenes);
                }
                
                generateChildDirective(scope.project.theme_hotspot.slug);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;
                // Declare config
                vm.config = $scope.project.theme_hotspot.config;
                $scope.config = vm.config;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
            }]
        };
    }]);
}());

;(function() {
"use strict";

// Parent scope: marketplace.item.config.js
hotspotGradyConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotGradyConfigCtrl', hotspotGradyConfigCtrl);

function hotspotGradyConfigCtrl($scope,$state, $rootScope, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    //////////

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGrady', ["$compile", function($compile) {
        return {
            restrict: 'E',
            link: function(scope, element, attrs) {
                generateChildDirective(scope.project.theme_hotspot.slug);
                addOnHoverTextstyle(scope.hotspot);

                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.empty();
                    element.append($compile(generatedTemplate)(scope));
                }

                // Showtext onhover
                function addOnHoverTextstyle(hotspot) {
                    scope.lptsphereinstance.set('textstyle', {
                        "name": "default_tooltip_style",
                        "font": "Arial",
                        "fontsize": "13",
                        "bold": "true",
                        "roundedge": "4",
                        "background": "false",
                        "border": "false",
                        "textcolor": "0xFFFFFF",
                        "textalign": "center",
                        "vcenter": "true",
                        "edge": "bottom",
                        "xoffset": "0",
                        "yoffset": "0",
                        "padding": "10",
                        "textshadow": "1.0",
                        "textshadowrange": "10.0",
                        "textshadowangle": "0",
                        "textshadowcolor": "0x000000",
                        "textshadowalpha": "1.0",
                    });
                    scope.lptsphereinstance.addHotspotEventCallback(hotspot.name, 'onhover', 'showtext(' + hotspot.title + ', "default_tooltip_style")');
                }
            }
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
 angular.module('lapentor.marketplace.themes').directive('hotspotPentagon', ["$compile", "LptHelper", function($compile, LptHelper) {
    return {
        restrict: 'E',
        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/pentagon/tpl/pentagon.html',
        link: function(scope, element, attrs, item) {
            //scope.addHotspotToViewer(scope.hotspot, false, true);

            // Generate child directive
            generateChildDirective(scope.project.theme_hotspot.slug);

            scope.hotspot.margin_top = -((scope.hotspot.width/2) - 25);
            scope.hotspot.margin_left = -((scope.hotspot.width/2) - 25);
            /////////////////

            // Generate child Theme
            function generateChildDirective(themeId) {
                // Generate Theme element
                var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                element.append($compile(generatedTemplate)(scope));
            }
        },
        controllerAs: 'vm',
        controller: ["$scope", function($scope) {
            var vm = this;
            // Declare config
            vm.config = $scope.project.theme_hotspot.config;
            $scope.config = vm.config;
            vm.hotspot = $scope.hotspot;
            vm.hotspot.imgUrl = 'modules/lapentor.marketplace/themes/hotspot/pentagon/images/'+vm.hotspot.type+'.png'

            // Apply config
            try {
                if (vm.hotspot.icon_custom) {
                    vm.config.hotspot_style = {
                        width: vm.hotspot.width,
                        height: vm.hotspot.width,
                        'background-image': 'url('+vm.hotspot.icon_custom+')'
                    };
                }

                vm.config.main_color = {
                    'background-color': vm.config.bg_color
                };
                vm.config.text_style = {
                    'color': vm.config.text_color
                };
                vm.config.arrow_color = {
                    'border-top-color': vm.config.bg_color
                };

            } catch (e) {
                console.error(e);
            }
        }]
    };
}]);
}());

;(function() {
"use strict";

// Parent scope: marketplace.item.config.js
hotspotRoyalConfigCtrl.$inject = ["$scope", "$state", "$rootScope", "Alertify", "$timeout", "Hotspot", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('hotspotRoyalConfigCtrl', hotspotRoyalConfigCtrl);

function hotspotRoyalConfigCtrl($scope,$state, $rootScope, Alertify, $timeout, Hotspot, project, item, $uibModalInstance) {
    var vm = this;

    vm.item = item;
    vm.project = project;
    vm.config = vm.project.theme_hotspot.config ? vm.project.theme_hotspot.config : {};
    vm.isUpdating = false;

    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;

    // init config
    try {
        vm.config.bg_color = vm.config.bg_color ? vm.config.bg_color : '#023a78';
        vm.config.text_color = vm.config.text_color ? vm.config.text_color : '#ffffff';
    } catch (e) {
        console.error(e);
    }

    //////////


    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            $state.reload();
        });
    };
}
}());

;(function() {
"use strict";

/**
 * Handle common action & style for this hotspot theme
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyal', ["$compile", "LptHelper", function($compile, LptHelper) {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/royal.html',
            link: function(scope, element, attrs, item) {
                //scope.addHotspotToViewer(scope.hotspot, false, true);

                // Generate child directive
                generateChildDirective(scope.project.theme_hotspot.slug);

                scope.hotspot.height = scope.hotspot.height?scope.hotspot.height:scope.hotspot.width;

                scope.hotspot.margin_top = -((42/2) - 25);
                scope.hotspot.margin_left = -((42/2) - 25);
                /////////////////

                // Generate child Theme
                function generateChildDirective(themeId) {
                    // Generate Theme element
                    var directiveName = 'hotspot-' + themeId + '-' + scope.hotspot.type;
                    var generatedTemplate = '<' + directiveName + '></' + directiveName + '>';
                    element.append($compile(generatedTemplate)(scope));
                }
            },
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;
                // Declare config
                vm.config = $scope.project.theme_hotspot.config;
                $scope.config = vm.config;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;

                // Point hotspot: Grab target scene thumb
                if (vm.hotspot.type == 'point') {
                    vm.targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                }

                // Apply config
                try {
                    if (vm.hotspot.icon_custom) {
                        vm.config.hotspot_style = {
                            width: vm.hotspot.width,
                            height: vm.hotspot.width,
                            'background-image': 'url('+vm.hotspot.icon_custom+')'
                        };
                    }

                    vm.config.main_color = {
                        'background-color': vm.config.bg_color
                    };
                    vm.config.text_style = {
                        'color': vm.config.text_color
                    };
                    vm.config.arrow_color = {
                        'border-top-color': vm.config.bg_color
                    };

                } catch (e) {
                    console.error(e);
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

// Theme: Crystal
// Parent scope: marketplace.item.config.js
scenelistCrystalConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance", "LptHelper"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistCrystalConfigCtrl', scenelistCrystalConfigCtrl);

function scenelistCrystalConfigCtrl($scope, $rootScope, project, item, $uibModalInstance, LptHelper) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;
    vm.config.position = vm.config.position || 'bottom';

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistCrystal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/crystal/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$window", "$timeout", function($scope, $rootScope, $window, $timeout) {
                var vm = this,
                    parentVm = $scope.$parent;

                vm.initScrollbar = initScrollbar;
                vm.project = $scope.project;
                vm.config = vm.project.theme_scenelist.config;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;
                vm.config.position = vm.config.position || 'bottom';
                vm.isOpenGroupList = false;
                vm.showAll = false;
                vm.allScenes = {};
                angular.forEach(vm.groups, function(g) {
                    angular.extend(vm.allScenes, vm.allScenes, g.scenes);
                })
                initScrollbar();

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                try {
                    vm.currentGroup = vm.groups[0];
                } catch (e) {
                    console.error(e);
                }

                vm.changeScene = changeScene;
                vm.scrollLeft = scrollLeft;
                vm.scrollRight = scrollRight;

                vm.posX = 0;

                /////////
                
                function scrollLeft() {
                    vm.posX -= 100;
                    jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar('scrollTo', vm.posX + 'px')
                }

                function scrollRight() {
                    vm.posX += 100;
                    jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar('scrollTo', vm.posX + 'px')
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function initScrollbar() {
                    $timeout(function() {
                        jQuery('#scenelist-crystal-scroll-wrapper .tab-nav').mCustomScrollbar({
                            axis: 'x',
                            advanced: { autoExpandHorizontalScroll: 'x' }
                        });
                    }, 500);
                }

                $rootScope.$on('evt.onsphereclick', function() {
                    if ($('#scenelist-crystal').hasClass('off')) {
                        vm.isOpenGroupList = false;
                        $('#scenelist-crystal').removeClass('off');
                    } else {
                        vm.isOpenGroupList = false;
                        $('#scenelist-crystal').addClass('off');
                    }
                });
                vm.toggleGroupList = function() {
                    vm.isOpenGroupList = !vm.isOpenGroupList;
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: Royal
// Parent scope: marketplace.item.config.js
scenelistBreaklineConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance", "LptHelper"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistBreaklineConfigCtrl', scenelistBreaklineConfigCtrl);

function scenelistBreaklineConfigCtrl($scope, $rootScope, project, item, $uibModalInstance, LptHelper) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;
    vm.config.position = vm.config.position || 'center';
    vm.config.bg_color = vm.config.bg_color || 'rgba(255,255,255,1)';
    //////////

    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistBreakline', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/breakline/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "$rootScope", function($scope, $timeout, $rootScope) {
                var vm = this;
                var parentVm = $scope.$parent;

                vm.project = $scope.project;
                var config = vm.project.theme_scenelist.config;
                vm.position = config.position || 'center';

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                vm.themeStyle = {
                    'background-color': config.bg_color
                };

                vm.onMouseover = function(ev) {
                    vm.groupHoverClass = 'group-hover';
                    $timeout(function() {
                        angular.element(ev.currentTarget).css('background-color', config.bg_color);
                    });
                };

                vm.onMouseleave = function() {
                    angular.element('.group-hover').css('background-color', 'initial');
                    vm.groupHoverClass = '';
                };

                vm.toggleScenelistClass = function() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                vm.changeScene = changeScene;

                /////////

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: default
// Parent scope: marketplace.item.config.js
scenelistDefaultConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistDefaultConfigCtrl', scenelistDefaultConfigCtrl);

function scenelistDefaultConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.config = vm.project.theme_scenelist.config || {};
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.choosePositionType = choosePositionType;
    try {
        if(vm.config.offset_top) {
            vm.config.position_type = 'custom'; // this make sure old code is running ok
        }else{
            vm.config.position_type = vm.config.position_type || 'fixed'; // Fixed position by default
        }
        vm.config.position = vm.config.position || 'top-right';
        vm.config.is_minimize = vm.config.is_minimize || 0;
        vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;
        vm.config.bg_color = vm.config.bg_color || '#ffffff';
        vm.config.theme_type = vm.config.theme_type || 'fixed';
        vm.config.theme = vm.config.theme || 'light';
    } catch (e) {
        console.error(e);
    }

    // Predefined themes
    vm.screenshotS3Path = 'https://s3.amazonaws.com/lapentor-sphere/screenshots/themes/scenelist/default/';

    vm.isToggle = vm.config.is_minimize = 0 ? false : true;

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function choosePositionType(type) {
        vm.config.position_type = type;
        switch (type) {
            case 'fixed':
                delete vm.config.offset_top;
                delete vm.config.offset_left;
                delete vm.config.offset;
                break;
            case 'custom':
                delete vm.config.position;
                break;
        }
    }

    function updateConfig() {
        // Before update, clean up variables
        if(vm.config.theme_type == 'fixed') {
            delete vm.config.bg_color;
            delete vm.config.text_color;
        }else{
            delete vm.config.theme;
        }

        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistDefault', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/default/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$window", "$rootScope", "$timeout", function($scope, $window, $rootScope, $timeout) {
                var vm = this,
                    parentScope = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper;
                vm.isToggle = false;
                vm.project = $scope.project;
                vm.config = scenelistHelper.getConfig();
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                vm.featuredColor = vm.config.active_scene_bg_color; // Featured color

                // functions
                vm.changeScene = changeScene;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.toggleMenu = toggleMenu;

                // apply config
                try {
                    if (vm.config.is_minimize == "1" && !vm.config.sticky_bottom) vm.isToggle = true;
                    vm.themeStyle = {
                        background: vm.config.bg_color,
                        color: vm.config.text_color,
                        left: vm.config.offset_left + 'px',
                        top: vm.config.offset_top + 'px'
                    };

                    if (angular.isDefined(vm.config.offset_left)) {
                        vm.themeStyle.right = 'auto';
                    }

                    $timeout(function() {
                        angular.element('#scenelist-ghost .group-list li.active').css('background', vm.config.active_scene_bg_color);
                    });
                } catch (e) {
                    console.error(e);
                }

                jQuery(window).resize(function() {
                    enableCustomScrollbar();
                });

                /////////

                function toggleMenu() { 
                    vm.isToggle = !vm.isToggle;
                    enableCustomScrollbar();
                }

                function minimizeWhenClickOutside() {
                    if (vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = true;
                    }
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function enableCustomScrollbar() {
                    // Apply scroll for mobile or small screen devices
                    var axis = 'y';
                    if ((isMobile.any || $window.innerWidth <= 640) && vm.config.sticky_bottom) {
                      axis = 'x';
                    }
                    $timeout(function() {
                        jQuery('#scenelist-ghost .group-list').mCustomScrollbar('destroy');

                        $timeout(function() {
                            jQuery('#scenelist-ghost .group-list').mCustomScrollbar({
                                axis: axis,
                                advanced: { autoExpandHorizontalScroll: 'x' }
                            });
                        }, 500);
                    }, 500);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: Royal
// Parent scope: marketplace.item.config.js
scenelistElegantzConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance", "LptHelper"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistElegantzConfigCtrl', scenelistElegantzConfigCtrl);

function scenelistElegantzConfigCtrl($scope, $rootScope, project, item, $uibModalInstance, LptHelper) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;
    vm.config.is_minimize = vm.config.is_minimize || 0;
    vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;
    vm.config.position = vm.config.position || 'top';

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistElegantz', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/elegantz/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$window", "$timeout", "$ocLazyLoad", function($scope, $rootScope, $window, $timeout, $ocLazyLoad) {
                var vm = this,
                    parentVm = $scope.$parent;

                vm.isSmall = false;
                vm.initScrollbar = initScrollbar;
                vm.project = $scope.project;
                vm.config = vm.project.theme_scenelist.config;
                vm.config.position = vm.config.position || 'top';
                vm.config.is_minimize = vm.config.is_minimize || 0;
                vm.config.minimize_clickoutside = vm.config.minimize_clickoutside || 1;

                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                initScrollbar();
                if (vm.config.is_minimize == 1) {
                    vm.isSmall = true;
                } else {
                    vm.isSmall = false;
                }

                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                try {
                    vm.currentGroup = vm.groups[0];
                } catch (e) {
                    console.error(e);
                }

                vm.changeScene = changeScene;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;

                /////////

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function initScrollbar() {
                    $timeout(function() {
                        jQuery('#scenelist-elegantz-scroll-wrapper .tab-nav').mCustomScrollbar({
                            axis: 'x',
                            advanced: { autoExpandHorizontalScroll: 'x' }
                        });
                    }, 500);
                    if (isMobile.any || $window.innerWidth <= 640) {
                        $timeout(function() {
                            jQuery('#scenelist-elegantz .group-titles').mCustomScrollbar({
                                axis: 'x',
                                advanced: { autoExpandHorizontalScroll: 'x' }
                            });
                        }, 500);
                    }
                }

                function minimizeWhenClickOutside() {
                    if (vm.config.minimize_clickoutside == 1) {
                        vm.isSmall = true;
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: Royal
// Parent scope: marketplace.item.config.js
scenelistRoyalConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistRoyalConfigCtrl', scenelistRoyalConfigCtrl);

function scenelistRoyalConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.config = vm.project.theme_scenelist.config;
    vm.isUpdating = false;
    vm.closeModal = $uibModalInstance.dismiss;

    vm.config.color = vm.config.color || '#A1905D';
    vm.config.is_minimize = vm.config.is_minimize || 0;

    // Register functions
    vm.updateConfig = updateConfig;

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: royal
angular.module('lapentor.marketplace.themes')
    .directive('scenelistRoyal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/royal/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", "LptHelper", function($scope, $rootScope, $timeout, LptHelper) {
                var vm = this,
                    parentScope = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper;
                
                vm.project = $scope.project;
                vm.config = scenelistHelper.getConfig();

                vm.minimizedGroups = [];
                vm.isToggle = false;
                vm.allGroupIsEmpty = scenelistHelper.allGroupIsEmpty;
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                // functions
                vm.changeScene = changeScene; // change scene
                vm.nextScene = nextScene; // go to next scene
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.prevScene = prevScene; // go to prev scene
                vm.toggleGroup = toggleGroup; // Minimized/open a group

                // apply config
                try {
                    if (vm.config.is_minimize == 1) {
                    vm.isToggle = false;
                } else {
                    vm.isToggle = true;
                }
                    vm.config.color = vm.config.color ? vm.config.color : '#A1905D';
                } catch (e) {
                    console.error(e);
                }

                if(vm.config.is_minimize_group == 1) {
                    for (var i = vm.groups.length - 1; i >= 0; i--) {
                        vm.minimizedGroups.push({
                            id: vm.groups[i]._id,
                            toggle: true
                        });
                    }
                } 


                /////////

                function toggleGroup(id) {
                    $timeout(function () {
                        jQuery('#lpt-group-'+id).height(35+32*jQuery('#lpt-group-'+id).find('li').length).toggleClass('minimized');
                    });
                }

                function prevScene() {
                    var prevScene = LptHelper.getPrevScene(vm.currentscene, vm.project);
                    if (prevScene) {
                        changeScene(prevScene);
                    }
                }

                function nextScene() {
                    var nextScene = LptHelper.getNextScene(vm.currentscene, vm.project);
                    if (nextScene) {
                        changeScene(nextScene);
                    }
                }

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function minimizeWhenClickOutside() {
                    if(angular.isUndefined(vm.config.minimize_clickoutside) || vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = true;
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: thewall
// Parent scope: marketplace.item.config.js
scenelistThewallConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistThewallConfigCtrl', scenelistThewallConfigCtrl);

function scenelistThewallConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;

    // Set up default config
    vm.config.theme_type = vm.config.theme_type || 'fixed';
    vm.config.theme = vm.config.theme || 'light';
    vm.config.is_minimize = vm.config.is_minimize || 0;
    vm.config.position = vm.config.position || 'right';

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        // Before update, clean up variables
        if(vm.config.theme_type == 'fixed') {
            delete vm.config.bg_color;
        }else{
            delete vm.config.theme;
        }

        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_scenelist.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistThewall', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/thewall/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this,
                    parentVm = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper,
                    config = scenelistHelper.getConfig();

                vm.project = $scope.project;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;
                vm.config = config;
                
                vm.allGroupIsEmpty = true;
                angular.forEach(vm.groups, function (g) {
                    if(g.scenes.length) {
                        vm.allGroupIsEmpty = false;
                        return;
                    }
                });

                // declare functions
                vm.toggleScenelistClass = toggleScenelistClass;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.changeScene = changeScene;

                // Main
                // Watch for change scene, change currentscene object to current scene
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                // Apply theme config
                if (vm.config.is_minimize == 1) {
                    vm.isToggle = false;
                } else {
                    vm.isToggle = true;
                }

                // Scene list Background color
                vm.listStyle = {
                    'background-color': config.bg_color
                };

                /////////

                function toggleScenelistClass() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                }

                function minimizeWhenClickOutside() {
                    if(vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = false;
                    }
                }

            }]
        };
    });
}());

;(function() {
"use strict";

// Theme: thewall
// Parent scope: marketplace.item.config.js
scenelistTrembleConfigCtrl.$inject = ["$scope", "$rootScope", "project", "item", "$uibModalInstance"];
angular.module('lapentor.marketplace.themes')
    .controller('scenelistTrembleConfigCtrl', scenelistTrembleConfigCtrl);

function scenelistTrembleConfigCtrl($scope, $rootScope, project, item, $uibModalInstance) {
    var vm = this;

    vm.project = project;
    vm.isUpdating = false;
    vm.updateConfig = updateConfig;
    vm.closeModal = $uibModalInstance.dismiss;
    vm.config = vm.project.theme_scenelist.config;

    // Set up default config
    vm.config.is_minimize = vm.config.is_minimize || 0;
    vm.config.menu_position = vm.config.menu_position || 'top';
    vm.config.featured_color = vm.config.featured_color || '#6cccff';

    //////////
    vm.openMediaLib = function() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallbackIcon,
            canChooseMultipleFile: false
        });
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.logo = file.path;
            updateConfig();
        }
    }

    function updateConfig() {
        // Before update, clean up variables
        if(vm.config.theme_type == 'fixed') {
            delete vm.config.bg_color;
        }else{
            delete vm.config.theme;
        }

        vm.isUpdating = true;
        $scope.$parent.updateConfig(item, vm.project.theme_scenelist.config, function() {
            vm.isUpdating = false;
        });
    };
}
}());

;(function() {
"use strict";

// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('scenelistTremble', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/scenelist/tremble/tpl/template.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", "$ocLazyLoad", "$window", function($scope, $rootScope, $timeout, $ocLazyLoad, $window) {
                var vm = this,
                    parentVm = $scope.$parent,
                    scenelistHelper = $scope.ScenelistHelper,
                    config = scenelistHelper.getConfig();

                vm.config = config;
                vm.project = $scope.project;
                vm.scenes = $scope.project.scenes;
                vm.groups = $scope.project.groups;

                // init config
                vm.config.featured_color = vm.config.featured_color || '#6cccff';
                vm.isScenelistOpen = (vm.config.is_minimize == 0) || false;

                vm.allGroupIsEmpty = true;
                angular.forEach(vm.groups, function (g) {
                    if(g.scenes.length) {
                        vm.allGroupIsEmpty = false;
                        return;
                    }
                });

                // declare functions
                vm.toggleScenelistClass = toggleScenelistClass;
                vm.minimizeWhenClickOutside = minimizeWhenClickOutside;
                vm.changeScene = changeScene;
                vm.toggleScenelist = toggleScenelist;

                // Main
                // Watch for change scene, change currentscene object to current scene
                $scope.$watch('scene', function(newscene, oldscene) {
                    vm.currentscene = newscene;
                });

                // Apply theme config
                if (vm.config.is_minimize == 1) {
                    vm.isToggle = false;
                } else {
                    vm.isToggle = true;
                }

                // Scene list Background color
                vm.listStyle = {
                    'background-color': config.bg_color
                };

                // Load tremble effect
                $ocLazyLoad.load(['bower_components/scenelist-tremble-lib/charming.min.js',
                    'bower_components/scenelist-tremble-lib/anime.min.js',
                    'bower_components/scenelist-tremble-lib/ama.js']);

                // Active scroll
                $timeout(function () {
                    jQuery('#scenelist-tremble .scroller').mCustomScrollbar({
                        axis: 'y',
                    });
                });
                
                /////////

                function toggleScenelistClass() {
                    vm.isToggle = vm.isToggle ? false : true;
                };

                function changeScene(scene) {
                    $rootScope.$emit('evt.livesphere.changescene', scene);
                    vm.toggleScenelist('close');
                }

                function minimizeWhenClickOutside() {
                    if(vm.config.minimize_clickoutside == 1) {
                        vm.isToggle = false;
                    }
                }
                function toggleScenelist(state) {
                    if(state) {
                        if(state == 'close') {
                            vm.isScenelistOpen = false;
                        }else{
                            vm.isScenelistOpen = true;
                        }    
                    }else{
                        vm.isScenelistOpen = !vm.isScenelistOpen;
                    }
                }

            }]
        };
    });
}());

;(function() {
"use strict";

/*!
 * VERSION: 1.15.1
 * DATE: 2015-01-20
 * UPDATES AND DOCS AT: http://greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, EasePack, CSSPlugin, RoundPropsPlugin, BezierPlugin, AttrPlugin, DirectionalRotationPlugin
 *
 * @license Copyright (c) 2008-2015, GreenSock. All rights reserved.
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/
var _gsScope="undefined"!=typeof module&&module.exports&&"undefined"!=typeof global?global:this||window;(_gsScope._gsQueue||(_gsScope._gsQueue=[])).push(function(){"use strict";_gsScope._gsDefine("TweenMax",["core.Animation","core.SimpleTimeline","TweenLite"],function(t,e,i){var s=function(t){var e,i=[],s=t.length;for(e=0;e!==s;i.push(t[e++]));return i},r=function(t,e,s){i.call(this,t,e,s),this._cycle=0,this._yoyo=this.vars.yoyo===!0,this._repeat=this.vars.repeat||0,this._repeatDelay=this.vars.repeatDelay||0,this._dirty=!0,this.render=r.prototype.render},n=1e-10,a=i._internals,o=a.isSelector,h=a.isArray,l=r.prototype=i.to({},.1,{}),_=[];r.version="1.15.1",l.constructor=r,l.kill()._gc=!1,r.killTweensOf=r.killDelayedCallsTo=i.killTweensOf,r.getTweensOf=i.getTweensOf,r.lagSmoothing=i.lagSmoothing,r.ticker=i.ticker,r.render=i.render,l.invalidate=function(){return this._yoyo=this.vars.yoyo===!0,this._repeat=this.vars.repeat||0,this._repeatDelay=this.vars.repeatDelay||0,this._uncache(!0),i.prototype.invalidate.call(this)},l.updateTo=function(t,e){var s,r=this.ratio,n=this.vars.immediateRender||t.immediateRender;e&&this._startTime<this._timeline._time&&(this._startTime=this._timeline._time,this._uncache(!1),this._gc?this._enabled(!0,!1):this._timeline.insert(this,this._startTime-this._delay));for(s in t)this.vars[s]=t[s];if(this._initted||n)if(e)this._initted=!1,n&&this.render(0,!0,!0);else if(this._gc&&this._enabled(!0,!1),this._notifyPluginsOfEnabled&&this._firstPT&&i._onPluginEvent("_onDisable",this),this._time/this._duration>.998){var a=this._time;this.render(0,!0,!1),this._initted=!1,this.render(a,!0,!1)}else if(this._time>0||n){this._initted=!1,this._init();for(var o,h=1/(1-r),l=this._firstPT;l;)o=l.s+l.c,l.c*=h,l.s=o-l.c,l=l._next}return this},l.render=function(t,e,i){this._initted||0===this._duration&&this.vars.repeat&&this.invalidate();var s,r,o,h,l,u,p,c,f=this._dirty?this.totalDuration():this._totalDuration,m=this._time,d=this._totalTime,g=this._cycle,v=this._duration,y=this._rawPrevTime;if(t>=f?(this._totalTime=f,this._cycle=this._repeat,this._yoyo&&0!==(1&this._cycle)?(this._time=0,this.ratio=this._ease._calcEnd?this._ease.getRatio(0):0):(this._time=v,this.ratio=this._ease._calcEnd?this._ease.getRatio(1):1),this._reversed||(s=!0,r="onComplete"),0===v&&(this._initted||!this.vars.lazy||i)&&(this._startTime===this._timeline._duration&&(t=0),(0===t||0>y||y===n)&&y!==t&&(i=!0,y>n&&(r="onReverseComplete")),this._rawPrevTime=c=!e||t||y===t?t:n)):1e-7>t?(this._totalTime=this._time=this._cycle=0,this.ratio=this._ease._calcEnd?this._ease.getRatio(0):0,(0!==d||0===v&&y>0&&y!==n)&&(r="onReverseComplete",s=this._reversed),0>t&&(this._active=!1,0===v&&(this._initted||!this.vars.lazy||i)&&(y>=0&&(i=!0),this._rawPrevTime=c=!e||t||y===t?t:n)),this._initted||(i=!0)):(this._totalTime=this._time=t,0!==this._repeat&&(h=v+this._repeatDelay,this._cycle=this._totalTime/h>>0,0!==this._cycle&&this._cycle===this._totalTime/h&&this._cycle--,this._time=this._totalTime-this._cycle*h,this._yoyo&&0!==(1&this._cycle)&&(this._time=v-this._time),this._time>v?this._time=v:0>this._time&&(this._time=0)),this._easeType?(l=this._time/v,u=this._easeType,p=this._easePower,(1===u||3===u&&l>=.5)&&(l=1-l),3===u&&(l*=2),1===p?l*=l:2===p?l*=l*l:3===p?l*=l*l*l:4===p&&(l*=l*l*l*l),this.ratio=1===u?1-l:2===u?l:.5>this._time/v?l/2:1-l/2):this.ratio=this._ease.getRatio(this._time/v)),m===this._time&&!i&&g===this._cycle)return d!==this._totalTime&&this._onUpdate&&(e||this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||_)),void 0;if(!this._initted){if(this._init(),!this._initted||this._gc)return;if(!i&&this._firstPT&&(this.vars.lazy!==!1&&this._duration||this.vars.lazy&&!this._duration))return this._time=m,this._totalTime=d,this._rawPrevTime=y,this._cycle=g,a.lazyTweens.push(this),this._lazy=[t,e],void 0;this._time&&!s?this.ratio=this._ease.getRatio(this._time/v):s&&this._ease._calcEnd&&(this.ratio=this._ease.getRatio(0===this._time?0:1))}for(this._lazy!==!1&&(this._lazy=!1),this._active||!this._paused&&this._time!==m&&t>=0&&(this._active=!0),0===d&&(2===this._initted&&t>0&&this._init(),this._startAt&&(t>=0?this._startAt.render(t,e,i):r||(r="_dummyGS")),this.vars.onStart&&(0!==this._totalTime||0===v)&&(e||this.vars.onStart.apply(this.vars.onStartScope||this,this.vars.onStartParams||_))),o=this._firstPT;o;)o.f?o.t[o.p](o.c*this.ratio+o.s):o.t[o.p]=o.c*this.ratio+o.s,o=o._next;this._onUpdate&&(0>t&&this._startAt&&this._startTime&&this._startAt.render(t,e,i),e||(this._totalTime!==d||s)&&this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||_)),this._cycle!==g&&(e||this._gc||this.vars.onRepeat&&this.vars.onRepeat.apply(this.vars.onRepeatScope||this,this.vars.onRepeatParams||_)),r&&(!this._gc||i)&&(0>t&&this._startAt&&!this._onUpdate&&this._startTime&&this._startAt.render(t,e,i),s&&(this._timeline.autoRemoveChildren&&this._enabled(!1,!1),this._active=!1),!e&&this.vars[r]&&this.vars[r].apply(this.vars[r+"Scope"]||this,this.vars[r+"Params"]||_),0===v&&this._rawPrevTime===n&&c!==n&&(this._rawPrevTime=0))},r.to=function(t,e,i){return new r(t,e,i)},r.from=function(t,e,i){return i.runBackwards=!0,i.immediateRender=0!=i.immediateRender,new r(t,e,i)},r.fromTo=function(t,e,i,s){return s.startAt=i,s.immediateRender=0!=s.immediateRender&&0!=i.immediateRender,new r(t,e,s)},r.staggerTo=r.allTo=function(t,e,n,a,l,u,p){a=a||0;var c,f,m,d,g=n.delay||0,v=[],y=function(){n.onComplete&&n.onComplete.apply(n.onCompleteScope||this,arguments),l.apply(p||this,u||_)};for(h(t)||("string"==typeof t&&(t=i.selector(t)||t),o(t)&&(t=s(t))),t=t||[],0>a&&(t=s(t),t.reverse(),a*=-1),c=t.length-1,m=0;c>=m;m++){f={};for(d in n)f[d]=n[d];f.delay=g,m===c&&l&&(f.onComplete=y),v[m]=new r(t[m],e,f),g+=a}return v},r.staggerFrom=r.allFrom=function(t,e,i,s,n,a,o){return i.runBackwards=!0,i.immediateRender=0!=i.immediateRender,r.staggerTo(t,e,i,s,n,a,o)},r.staggerFromTo=r.allFromTo=function(t,e,i,s,n,a,o,h){return s.startAt=i,s.immediateRender=0!=s.immediateRender&&0!=i.immediateRender,r.staggerTo(t,e,s,n,a,o,h)},r.delayedCall=function(t,e,i,s,n){return new r(e,0,{delay:t,onComplete:e,onCompleteParams:i,onCompleteScope:s,onReverseComplete:e,onReverseCompleteParams:i,onReverseCompleteScope:s,immediateRender:!1,useFrames:n,overwrite:0})},r.set=function(t,e){return new r(t,0,e)},r.isTweening=function(t){return i.getTweensOf(t,!0).length>0};var u=function(t,e){for(var s=[],r=0,n=t._first;n;)n instanceof i?s[r++]=n:(e&&(s[r++]=n),s=s.concat(u(n,e)),r=s.length),n=n._next;return s},p=r.getAllTweens=function(e){return u(t._rootTimeline,e).concat(u(t._rootFramesTimeline,e))};r.killAll=function(t,i,s,r){null==i&&(i=!0),null==s&&(s=!0);var n,a,o,h=p(0!=r),l=h.length,_=i&&s&&r;for(o=0;l>o;o++)a=h[o],(_||a instanceof e||(n=a.target===a.vars.onComplete)&&s||i&&!n)&&(t?a.totalTime(a._reversed?0:a.totalDuration()):a._enabled(!1,!1))},r.killChildTweensOf=function(t,e){if(null!=t){var n,l,_,u,p,c=a.tweenLookup;if("string"==typeof t&&(t=i.selector(t)||t),o(t)&&(t=s(t)),h(t))for(u=t.length;--u>-1;)r.killChildTweensOf(t[u],e);else{n=[];for(_ in c)for(l=c[_].target.parentNode;l;)l===t&&(n=n.concat(c[_].tweens)),l=l.parentNode;for(p=n.length,u=0;p>u;u++)e&&n[u].totalTime(n[u].totalDuration()),n[u]._enabled(!1,!1)}}};var c=function(t,i,s,r){i=i!==!1,s=s!==!1,r=r!==!1;for(var n,a,o=p(r),h=i&&s&&r,l=o.length;--l>-1;)a=o[l],(h||a instanceof e||(n=a.target===a.vars.onComplete)&&s||i&&!n)&&a.paused(t)};return r.pauseAll=function(t,e,i){c(!0,t,e,i)},r.resumeAll=function(t,e,i){c(!1,t,e,i)},r.globalTimeScale=function(e){var s=t._rootTimeline,r=i.ticker.time;return arguments.length?(e=e||n,s._startTime=r-(r-s._startTime)*s._timeScale/e,s=t._rootFramesTimeline,r=i.ticker.frame,s._startTime=r-(r-s._startTime)*s._timeScale/e,s._timeScale=t._rootTimeline._timeScale=e,e):s._timeScale},l.progress=function(t){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&0!==(1&this._cycle)?1-t:t)+this._cycle*(this._duration+this._repeatDelay),!1):this._time/this.duration()},l.totalProgress=function(t){return arguments.length?this.totalTime(this.totalDuration()*t,!1):this._totalTime/this.totalDuration()},l.time=function(t,e){return arguments.length?(this._dirty&&this.totalDuration(),t>this._duration&&(t=this._duration),this._yoyo&&0!==(1&this._cycle)?t=this._duration-t+this._cycle*(this._duration+this._repeatDelay):0!==this._repeat&&(t+=this._cycle*(this._duration+this._repeatDelay)),this.totalTime(t,e)):this._time},l.duration=function(e){return arguments.length?t.prototype.duration.call(this,e):this._duration},l.totalDuration=function(t){return arguments.length?-1===this._repeat?this:this.duration((t-this._repeat*this._repeatDelay)/(this._repeat+1)):(this._dirty&&(this._totalDuration=-1===this._repeat?999999999999:this._duration*(this._repeat+1)+this._repeatDelay*this._repeat,this._dirty=!1),this._totalDuration)},l.repeat=function(t){return arguments.length?(this._repeat=t,this._uncache(!0)):this._repeat},l.repeatDelay=function(t){return arguments.length?(this._repeatDelay=t,this._uncache(!0)):this._repeatDelay},l.yoyo=function(t){return arguments.length?(this._yoyo=t,this):this._yoyo},r},!0),_gsScope._gsDefine("TimelineLite",["core.Animation","core.SimpleTimeline","TweenLite"],function(t,e,i){var s=function(t){e.call(this,t),this._labels={},this.autoRemoveChildren=this.vars.autoRemoveChildren===!0,this.smoothChildTiming=this.vars.smoothChildTiming===!0,this._sortChildren=!0,this._onUpdate=this.vars.onUpdate;var i,s,r=this.vars;for(s in r)i=r[s],h(i)&&-1!==i.join("").indexOf("{self}")&&(r[s]=this._swapSelfInParams(i));h(r.tweens)&&this.add(r.tweens,0,r.align,r.stagger)},r=1e-10,n=i._internals,a=s._internals={},o=n.isSelector,h=n.isArray,l=n.lazyTweens,_=n.lazyRender,u=[],p=_gsScope._gsDefine.globals,c=function(t){var e,i={};for(e in t)i[e]=t[e];return i},f=a.pauseCallback=function(t,e,i,s){var r=t._timeline,n=r._totalTime;!e&&this._forcingPlayhead||r._rawPrevTime===t._startTime||(r.pause(t._startTime),e&&e.apply(s||r,i||u),this._forcingPlayhead&&r.seek(n))},m=function(t){var e,i=[],s=t.length;for(e=0;e!==s;i.push(t[e++]));return i},d=s.prototype=new e;return s.version="1.15.1",d.constructor=s,d.kill()._gc=d._forcingPlayhead=!1,d.to=function(t,e,s,r){var n=s.repeat&&p.TweenMax||i;return e?this.add(new n(t,e,s),r):this.set(t,s,r)},d.from=function(t,e,s,r){return this.add((s.repeat&&p.TweenMax||i).from(t,e,s),r)},d.fromTo=function(t,e,s,r,n){var a=r.repeat&&p.TweenMax||i;return e?this.add(a.fromTo(t,e,s,r),n):this.set(t,r,n)},d.staggerTo=function(t,e,r,n,a,h,l,_){var u,p=new s({onComplete:h,onCompleteParams:l,onCompleteScope:_,smoothChildTiming:this.smoothChildTiming});for("string"==typeof t&&(t=i.selector(t)||t),t=t||[],o(t)&&(t=m(t)),n=n||0,0>n&&(t=m(t),t.reverse(),n*=-1),u=0;t.length>u;u++)r.startAt&&(r.startAt=c(r.startAt)),p.to(t[u],e,c(r),u*n);return this.add(p,a)},d.staggerFrom=function(t,e,i,s,r,n,a,o){return i.immediateRender=0!=i.immediateRender,i.runBackwards=!0,this.staggerTo(t,e,i,s,r,n,a,o)},d.staggerFromTo=function(t,e,i,s,r,n,a,o,h){return s.startAt=i,s.immediateRender=0!=s.immediateRender&&0!=i.immediateRender,this.staggerTo(t,e,s,r,n,a,o,h)},d.call=function(t,e,s,r){return this.add(i.delayedCall(0,t,e,s),r)},d.set=function(t,e,s){return s=this._parseTimeOrLabel(s,0,!0),null==e.immediateRender&&(e.immediateRender=s===this._time&&!this._paused),this.add(new i(t,0,e),s)},s.exportRoot=function(t,e){t=t||{},null==t.smoothChildTiming&&(t.smoothChildTiming=!0);var r,n,a=new s(t),o=a._timeline;for(null==e&&(e=!0),o._remove(a,!0),a._startTime=0,a._rawPrevTime=a._time=a._totalTime=o._time,r=o._first;r;)n=r._next,e&&r instanceof i&&r.target===r.vars.onComplete||a.add(r,r._startTime-r._delay),r=n;return o.add(a,0),a},d.add=function(r,n,a,o){var l,_,u,p,c,f;if("number"!=typeof n&&(n=this._parseTimeOrLabel(n,0,!0,r)),!(r instanceof t)){if(r instanceof Array||r&&r.push&&h(r)){for(a=a||"normal",o=o||0,l=n,_=r.length,u=0;_>u;u++)h(p=r[u])&&(p=new s({tweens:p})),this.add(p,l),"string"!=typeof p&&"function"!=typeof p&&("sequence"===a?l=p._startTime+p.totalDuration()/p._timeScale:"start"===a&&(p._startTime-=p.delay())),l+=o;return this._uncache(!0)}if("string"==typeof r)return this.addLabel(r,n);if("function"!=typeof r)throw"Cannot add "+r+" into the timeline; it is not a tween, timeline, function, or string.";r=i.delayedCall(0,r)}if(e.prototype.add.call(this,r,n),(this._gc||this._time===this._duration)&&!this._paused&&this._duration<this.duration())for(c=this,f=c.rawTime()>r._startTime;c._timeline;)f&&c._timeline.smoothChildTiming?c.totalTime(c._totalTime,!0):c._gc&&c._enabled(!0,!1),c=c._timeline;return this},d.remove=function(e){if(e instanceof t)return this._remove(e,!1);if(e instanceof Array||e&&e.push&&h(e)){for(var i=e.length;--i>-1;)this.remove(e[i]);return this}return"string"==typeof e?this.removeLabel(e):this.kill(null,e)},d._remove=function(t,i){e.prototype._remove.call(this,t,i);var s=this._last;return s?this._time>s._startTime+s._totalDuration/s._timeScale&&(this._time=this.duration(),this._totalTime=this._totalDuration):this._time=this._totalTime=this._duration=this._totalDuration=0,this},d.append=function(t,e){return this.add(t,this._parseTimeOrLabel(null,e,!0,t))},d.insert=d.insertMultiple=function(t,e,i,s){return this.add(t,e||0,i,s)},d.appendMultiple=function(t,e,i,s){return this.add(t,this._parseTimeOrLabel(null,e,!0,t),i,s)},d.addLabel=function(t,e){return this._labels[t]=this._parseTimeOrLabel(e),this},d.addPause=function(t,e,s,r){var n=i.delayedCall(0,f,["{self}",e,s,r],this);return n.data="isPause",this.add(n,t)},d.removeLabel=function(t){return delete this._labels[t],this},d.getLabelTime=function(t){return null!=this._labels[t]?this._labels[t]:-1},d._parseTimeOrLabel=function(e,i,s,r){var n;if(r instanceof t&&r.timeline===this)this.remove(r);else if(r&&(r instanceof Array||r.push&&h(r)))for(n=r.length;--n>-1;)r[n]instanceof t&&r[n].timeline===this&&this.remove(r[n]);if("string"==typeof i)return this._parseTimeOrLabel(i,s&&"number"==typeof e&&null==this._labels[i]?e-this.duration():0,s);if(i=i||0,"string"!=typeof e||!isNaN(e)&&null==this._labels[e])null==e&&(e=this.duration());else{if(n=e.indexOf("="),-1===n)return null==this._labels[e]?s?this._labels[e]=this.duration()+i:i:this._labels[e]+i;i=parseInt(e.charAt(n-1)+"1",10)*Number(e.substr(n+1)),e=n>1?this._parseTimeOrLabel(e.substr(0,n-1),0,s):this.duration()}return Number(e)+i},d.seek=function(t,e){return this.totalTime("number"==typeof t?t:this._parseTimeOrLabel(t),e!==!1)},d.stop=function(){return this.paused(!0)},d.gotoAndPlay=function(t,e){return this.play(t,e)},d.gotoAndStop=function(t,e){return this.pause(t,e)},d.render=function(t,e,i){this._gc&&this._enabled(!0,!1);var s,n,a,o,h,p=this._dirty?this.totalDuration():this._totalDuration,c=this._time,f=this._startTime,m=this._timeScale,d=this._paused;if(t>=p?(this._totalTime=this._time=p,this._reversed||this._hasPausedChild()||(n=!0,o="onComplete",0===this._duration&&(0===t||0>this._rawPrevTime||this._rawPrevTime===r)&&this._rawPrevTime!==t&&this._first&&(h=!0,this._rawPrevTime>r&&(o="onReverseComplete"))),this._rawPrevTime=this._duration||!e||t||this._rawPrevTime===t?t:r,t=p+1e-4):1e-7>t?(this._totalTime=this._time=0,(0!==c||0===this._duration&&this._rawPrevTime!==r&&(this._rawPrevTime>0||0>t&&this._rawPrevTime>=0))&&(o="onReverseComplete",n=this._reversed),0>t?(this._active=!1,this._rawPrevTime>=0&&this._first&&(h=!0),this._rawPrevTime=t):(this._rawPrevTime=this._duration||!e||t||this._rawPrevTime===t?t:r,t=0,this._initted||(h=!0))):this._totalTime=this._time=this._rawPrevTime=t,this._time!==c&&this._first||i||h){if(this._initted||(this._initted=!0),this._active||!this._paused&&this._time!==c&&t>0&&(this._active=!0),0===c&&this.vars.onStart&&0!==this._time&&(e||this.vars.onStart.apply(this.vars.onStartScope||this,this.vars.onStartParams||u)),this._time>=c)for(s=this._first;s&&(a=s._next,!this._paused||d);)(s._active||s._startTime<=this._time&&!s._paused&&!s._gc)&&(s._reversed?s.render((s._dirty?s.totalDuration():s._totalDuration)-(t-s._startTime)*s._timeScale,e,i):s.render((t-s._startTime)*s._timeScale,e,i)),s=a;else for(s=this._last;s&&(a=s._prev,!this._paused||d);)(s._active||c>=s._startTime&&!s._paused&&!s._gc)&&(s._reversed?s.render((s._dirty?s.totalDuration():s._totalDuration)-(t-s._startTime)*s._timeScale,e,i):s.render((t-s._startTime)*s._timeScale,e,i)),s=a;this._onUpdate&&(e||(l.length&&_(),this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||u))),o&&(this._gc||(f===this._startTime||m!==this._timeScale)&&(0===this._time||p>=this.totalDuration())&&(n&&(l.length&&_(),this._timeline.autoRemoveChildren&&this._enabled(!1,!1),this._active=!1),!e&&this.vars[o]&&this.vars[o].apply(this.vars[o+"Scope"]||this,this.vars[o+"Params"]||u)))}},d._hasPausedChild=function(){for(var t=this._first;t;){if(t._paused||t instanceof s&&t._hasPausedChild())return!0;t=t._next}return!1},d.getChildren=function(t,e,s,r){r=r||-9999999999;for(var n=[],a=this._first,o=0;a;)r>a._startTime||(a instanceof i?e!==!1&&(n[o++]=a):(s!==!1&&(n[o++]=a),t!==!1&&(n=n.concat(a.getChildren(!0,e,s)),o=n.length))),a=a._next;return n},d.getTweensOf=function(t,e){var s,r,n=this._gc,a=[],o=0;for(n&&this._enabled(!0,!0),s=i.getTweensOf(t),r=s.length;--r>-1;)(s[r].timeline===this||e&&this._contains(s[r]))&&(a[o++]=s[r]);return n&&this._enabled(!1,!0),a},d.recent=function(){return this._recent},d._contains=function(t){for(var e=t.timeline;e;){if(e===this)return!0;e=e.timeline}return!1},d.shiftChildren=function(t,e,i){i=i||0;for(var s,r=this._first,n=this._labels;r;)r._startTime>=i&&(r._startTime+=t),r=r._next;if(e)for(s in n)n[s]>=i&&(n[s]+=t);return this._uncache(!0)},d._kill=function(t,e){if(!t&&!e)return this._enabled(!1,!1);for(var i=e?this.getTweensOf(e):this.getChildren(!0,!0,!1),s=i.length,r=!1;--s>-1;)i[s]._kill(t,e)&&(r=!0);return r},d.clear=function(t){var e=this.getChildren(!1,!0,!0),i=e.length;for(this._time=this._totalTime=0;--i>-1;)e[i]._enabled(!1,!1);return t!==!1&&(this._labels={}),this._uncache(!0)},d.invalidate=function(){for(var e=this._first;e;)e.invalidate(),e=e._next;return t.prototype.invalidate.call(this)},d._enabled=function(t,i){if(t===this._gc)for(var s=this._first;s;)s._enabled(t,!0),s=s._next;return e.prototype._enabled.call(this,t,i)},d.totalTime=function(){this._forcingPlayhead=!0;var e=t.prototype.totalTime.apply(this,arguments);return this._forcingPlayhead=!1,e},d.duration=function(t){return arguments.length?(0!==this.duration()&&0!==t&&this.timeScale(this._duration/t),this):(this._dirty&&this.totalDuration(),this._duration)},d.totalDuration=function(t){if(!arguments.length){if(this._dirty){for(var e,i,s=0,r=this._last,n=999999999999;r;)e=r._prev,r._dirty&&r.totalDuration(),r._startTime>n&&this._sortChildren&&!r._paused?this.add(r,r._startTime-r._delay):n=r._startTime,0>r._startTime&&!r._paused&&(s-=r._startTime,this._timeline.smoothChildTiming&&(this._startTime+=r._startTime/this._timeScale),this.shiftChildren(-r._startTime,!1,-9999999999),n=0),i=r._startTime+r._totalDuration/r._timeScale,i>s&&(s=i),r=e;this._duration=this._totalDuration=s,this._dirty=!1}return this._totalDuration}return 0!==this.totalDuration()&&0!==t&&this.timeScale(this._totalDuration/t),this},d.usesFrames=function(){for(var e=this._timeline;e._timeline;)e=e._timeline;return e===t._rootFramesTimeline},d.rawTime=function(){return this._paused?this._totalTime:(this._timeline.rawTime()-this._startTime)*this._timeScale},s},!0),_gsScope._gsDefine("TimelineMax",["TimelineLite","TweenLite","easing.Ease"],function(t,e,i){var s=function(e){t.call(this,e),this._repeat=this.vars.repeat||0,this._repeatDelay=this.vars.repeatDelay||0,this._cycle=0,this._yoyo=this.vars.yoyo===!0,this._dirty=!0},r=1e-10,n=[],a=e._internals,o=a.lazyTweens,h=a.lazyRender,l=new i(null,null,1,0),_=s.prototype=new t;return _.constructor=s,_.kill()._gc=!1,s.version="1.15.1",_.invalidate=function(){return this._yoyo=this.vars.yoyo===!0,this._repeat=this.vars.repeat||0,this._repeatDelay=this.vars.repeatDelay||0,this._uncache(!0),t.prototype.invalidate.call(this)},_.addCallback=function(t,i,s,r){return this.add(e.delayedCall(0,t,s,r),i)},_.removeCallback=function(t,e){if(t)if(null==e)this._kill(null,t);else for(var i=this.getTweensOf(t,!1),s=i.length,r=this._parseTimeOrLabel(e);--s>-1;)i[s]._startTime===r&&i[s]._enabled(!1,!1);return this},_.removePause=function(e){return this.removeCallback(t._internals.pauseCallback,e)},_.tweenTo=function(t,i){i=i||{};var s,r,a,o={ease:l,useFrames:this.usesFrames(),immediateRender:!1};for(r in i)o[r]=i[r];return o.time=this._parseTimeOrLabel(t),s=Math.abs(Number(o.time)-this._time)/this._timeScale||.001,a=new e(this,s,o),o.onStart=function(){a.target.paused(!0),a.vars.time!==a.target.time()&&s===a.duration()&&a.duration(Math.abs(a.vars.time-a.target.time())/a.target._timeScale),i.onStart&&i.onStart.apply(i.onStartScope||a,i.onStartParams||n)},a},_.tweenFromTo=function(t,e,i){i=i||{},t=this._parseTimeOrLabel(t),i.startAt={onComplete:this.seek,onCompleteParams:[t],onCompleteScope:this},i.immediateRender=i.immediateRender!==!1;var s=this.tweenTo(e,i);return s.duration(Math.abs(s.vars.time-t)/this._timeScale||.001)},_.render=function(t,e,i){this._gc&&this._enabled(!0,!1);var s,a,l,_,u,p,c=this._dirty?this.totalDuration():this._totalDuration,f=this._duration,m=this._time,d=this._totalTime,g=this._startTime,v=this._timeScale,y=this._rawPrevTime,T=this._paused,w=this._cycle;if(t>=c?(this._locked||(this._totalTime=c,this._cycle=this._repeat),this._reversed||this._hasPausedChild()||(a=!0,_="onComplete",0===this._duration&&(0===t||0>y||y===r)&&y!==t&&this._first&&(u=!0,y>r&&(_="onReverseComplete"))),this._rawPrevTime=this._duration||!e||t||this._rawPrevTime===t?t:r,this._yoyo&&0!==(1&this._cycle)?this._time=t=0:(this._time=f,t=f+1e-4)):1e-7>t?(this._locked||(this._totalTime=this._cycle=0),this._time=0,(0!==m||0===f&&y!==r&&(y>0||0>t&&y>=0)&&!this._locked)&&(_="onReverseComplete",a=this._reversed),0>t?(this._active=!1,y>=0&&this._first&&(u=!0),this._rawPrevTime=t):(this._rawPrevTime=f||!e||t||this._rawPrevTime===t?t:r,t=0,this._initted||(u=!0))):(0===f&&0>y&&(u=!0),this._time=this._rawPrevTime=t,this._locked||(this._totalTime=t,0!==this._repeat&&(p=f+this._repeatDelay,this._cycle=this._totalTime/p>>0,0!==this._cycle&&this._cycle===this._totalTime/p&&this._cycle--,this._time=this._totalTime-this._cycle*p,this._yoyo&&0!==(1&this._cycle)&&(this._time=f-this._time),this._time>f?(this._time=f,t=f+1e-4):0>this._time?this._time=t=0:t=this._time))),this._cycle!==w&&!this._locked){var x=this._yoyo&&0!==(1&w),b=x===(this._yoyo&&0!==(1&this._cycle)),P=this._totalTime,S=this._cycle,k=this._rawPrevTime,R=this._time;if(this._totalTime=w*f,w>this._cycle?x=!x:this._totalTime+=f,this._time=m,this._rawPrevTime=0===f?y-1e-4:y,this._cycle=w,this._locked=!0,m=x?0:f,this.render(m,e,0===f),e||this._gc||this.vars.onRepeat&&this.vars.onRepeat.apply(this.vars.onRepeatScope||this,this.vars.onRepeatParams||n),b&&(m=x?f+1e-4:-1e-4,this.render(m,!0,!1)),this._locked=!1,this._paused&&!T)return;this._time=R,this._totalTime=P,this._cycle=S,this._rawPrevTime=k}if(!(this._time!==m&&this._first||i||u))return d!==this._totalTime&&this._onUpdate&&(e||this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||n)),void 0;if(this._initted||(this._initted=!0),this._active||!this._paused&&this._totalTime!==d&&t>0&&(this._active=!0),0===d&&this.vars.onStart&&0!==this._totalTime&&(e||this.vars.onStart.apply(this.vars.onStartScope||this,this.vars.onStartParams||n)),this._time>=m)for(s=this._first;s&&(l=s._next,!this._paused||T);)(s._active||s._startTime<=this._time&&!s._paused&&!s._gc)&&(s._reversed?s.render((s._dirty?s.totalDuration():s._totalDuration)-(t-s._startTime)*s._timeScale,e,i):s.render((t-s._startTime)*s._timeScale,e,i)),s=l;else for(s=this._last;s&&(l=s._prev,!this._paused||T);)(s._active||m>=s._startTime&&!s._paused&&!s._gc)&&(s._reversed?s.render((s._dirty?s.totalDuration():s._totalDuration)-(t-s._startTime)*s._timeScale,e,i):s.render((t-s._startTime)*s._timeScale,e,i)),s=l;this._onUpdate&&(e||(o.length&&h(),this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||n))),_&&(this._locked||this._gc||(g===this._startTime||v!==this._timeScale)&&(0===this._time||c>=this.totalDuration())&&(a&&(o.length&&h(),this._timeline.autoRemoveChildren&&this._enabled(!1,!1),this._active=!1),!e&&this.vars[_]&&this.vars[_].apply(this.vars[_+"Scope"]||this,this.vars[_+"Params"]||n)))},_.getActive=function(t,e,i){null==t&&(t=!0),null==e&&(e=!0),null==i&&(i=!1);var s,r,n=[],a=this.getChildren(t,e,i),o=0,h=a.length;for(s=0;h>s;s++)r=a[s],r.isActive()&&(n[o++]=r);return n},_.getLabelAfter=function(t){t||0!==t&&(t=this._time);var e,i=this.getLabelsArray(),s=i.length;for(e=0;s>e;e++)if(i[e].time>t)return i[e].name;return null},_.getLabelBefore=function(t){null==t&&(t=this._time);for(var e=this.getLabelsArray(),i=e.length;--i>-1;)if(t>e[i].time)return e[i].name;return null},_.getLabelsArray=function(){var t,e=[],i=0;for(t in this._labels)e[i++]={time:this._labels[t],name:t};return e.sort(function(t,e){return t.time-e.time}),e},_.progress=function(t,e){return arguments.length?this.totalTime(this.duration()*(this._yoyo&&0!==(1&this._cycle)?1-t:t)+this._cycle*(this._duration+this._repeatDelay),e):this._time/this.duration()},_.totalProgress=function(t,e){return arguments.length?this.totalTime(this.totalDuration()*t,e):this._totalTime/this.totalDuration()},_.totalDuration=function(e){return arguments.length?-1===this._repeat?this:this.duration((e-this._repeat*this._repeatDelay)/(this._repeat+1)):(this._dirty&&(t.prototype.totalDuration.call(this),this._totalDuration=-1===this._repeat?999999999999:this._duration*(this._repeat+1)+this._repeatDelay*this._repeat),this._totalDuration)},_.time=function(t,e){return arguments.length?(this._dirty&&this.totalDuration(),t>this._duration&&(t=this._duration),this._yoyo&&0!==(1&this._cycle)?t=this._duration-t+this._cycle*(this._duration+this._repeatDelay):0!==this._repeat&&(t+=this._cycle*(this._duration+this._repeatDelay)),this.totalTime(t,e)):this._time},_.repeat=function(t){return arguments.length?(this._repeat=t,this._uncache(!0)):this._repeat},_.repeatDelay=function(t){return arguments.length?(this._repeatDelay=t,this._uncache(!0)):this._repeatDelay},_.yoyo=function(t){return arguments.length?(this._yoyo=t,this):this._yoyo},_.currentLabel=function(t){return arguments.length?this.seek(t,!0):this.getLabelBefore(this._time+1e-8)},s},!0),function(){var t=180/Math.PI,e=[],i=[],s=[],r={},n=_gsScope._gsDefine.globals,a=function(t,e,i,s){this.a=t,this.b=e,this.c=i,this.d=s,this.da=s-t,this.ca=i-t,this.ba=e-t},o=",x,y,z,left,top,right,bottom,marginTop,marginLeft,marginRight,marginBottom,paddingLeft,paddingTop,paddingRight,paddingBottom,backgroundPosition,backgroundPosition_y,",h=function(t,e,i,s){var r={a:t},n={},a={},o={c:s},h=(t+e)/2,l=(e+i)/2,_=(i+s)/2,u=(h+l)/2,p=(l+_)/2,c=(p-u)/8;return r.b=h+(t-h)/4,n.b=u+c,r.c=n.a=(r.b+n.b)/2,n.c=a.a=(u+p)/2,a.b=p-c,o.b=_+(s-_)/4,a.c=o.a=(a.b+o.b)/2,[r,n,a,o]},l=function(t,r,n,a,o){var l,_,u,p,c,f,m,d,g,v,y,T,w,x=t.length-1,b=0,P=t[0].a;for(l=0;x>l;l++)c=t[b],_=c.a,u=c.d,p=t[b+1].d,o?(y=e[l],T=i[l],w=.25*(T+y)*r/(a?.5:s[l]||.5),f=u-(u-_)*(a?.5*r:0!==y?w/y:0),m=u+(p-u)*(a?.5*r:0!==T?w/T:0),d=u-(f+((m-f)*(3*y/(y+T)+.5)/4||0))):(f=u-.5*(u-_)*r,m=u+.5*(p-u)*r,d=u-(f+m)/2),f+=d,m+=d,c.c=g=f,c.b=0!==l?P:P=c.a+.6*(c.c-c.a),c.da=u-_,c.ca=g-_,c.ba=P-_,n?(v=h(_,P,g,u),t.splice(b,1,v[0],v[1],v[2],v[3]),b+=4):b++,P=m;c=t[b],c.b=P,c.c=P+.4*(c.d-P),c.da=c.d-c.a,c.ca=c.c-c.a,c.ba=P-c.a,n&&(v=h(c.a,P,c.c,c.d),t.splice(b,1,v[0],v[1],v[2],v[3]))},_=function(t,s,r,n){var o,h,l,_,u,p,c=[];if(n)for(t=[n].concat(t),h=t.length;--h>-1;)"string"==typeof(p=t[h][s])&&"="===p.charAt(1)&&(t[h][s]=n[s]+Number(p.charAt(0)+p.substr(2)));if(o=t.length-2,0>o)return c[0]=new a(t[0][s],0,0,t[-1>o?0:1][s]),c;for(h=0;o>h;h++)l=t[h][s],_=t[h+1][s],c[h]=new a(l,0,0,_),r&&(u=t[h+2][s],e[h]=(e[h]||0)+(_-l)*(_-l),i[h]=(i[h]||0)+(u-_)*(u-_));return c[h]=new a(t[h][s],0,0,t[h+1][s]),c},u=function(t,n,a,h,u,p){var c,f,m,d,g,v,y,T,w={},x=[],b=p||t[0];u="string"==typeof u?","+u+",":o,null==n&&(n=1);for(f in t[0])x.push(f);if(t.length>1){for(T=t[t.length-1],y=!0,c=x.length;--c>-1;)if(f=x[c],Math.abs(b[f]-T[f])>.05){y=!1;break}y&&(t=t.concat(),p&&t.unshift(p),t.push(t[1]),p=t[t.length-3])}for(e.length=i.length=s.length=0,c=x.length;--c>-1;)f=x[c],r[f]=-1!==u.indexOf(","+f+","),w[f]=_(t,f,r[f],p);for(c=e.length;--c>-1;)e[c]=Math.sqrt(e[c]),i[c]=Math.sqrt(i[c]);if(!h){for(c=x.length;--c>-1;)if(r[f])for(m=w[x[c]],v=m.length-1,d=0;v>d;d++)g=m[d+1].da/i[d]+m[d].da/e[d],s[d]=(s[d]||0)+g*g;for(c=s.length;--c>-1;)s[c]=Math.sqrt(s[c])}for(c=x.length,d=a?4:1;--c>-1;)f=x[c],m=w[f],l(m,n,a,h,r[f]),y&&(m.splice(0,d),m.splice(m.length-d,d));return w},p=function(t,e,i){e=e||"soft";var s,r,n,o,h,l,_,u,p,c,f,m={},d="cubic"===e?3:2,g="soft"===e,v=[];if(g&&i&&(t=[i].concat(t)),null==t||d+1>t.length)throw"invalid Bezier data";for(p in t[0])v.push(p);for(l=v.length;--l>-1;){for(p=v[l],m[p]=h=[],c=0,u=t.length,_=0;u>_;_++)s=null==i?t[_][p]:"string"==typeof(f=t[_][p])&&"="===f.charAt(1)?i[p]+Number(f.charAt(0)+f.substr(2)):Number(f),g&&_>1&&u-1>_&&(h[c++]=(s+h[c-2])/2),h[c++]=s;for(u=c-d+1,c=0,_=0;u>_;_+=d)s=h[_],r=h[_+1],n=h[_+2],o=2===d?0:h[_+3],h[c++]=f=3===d?new a(s,r,n,o):new a(s,(2*r+s)/3,(2*r+n)/3,n);h.length=c}return m},c=function(t,e,i){for(var s,r,n,a,o,h,l,_,u,p,c,f=1/i,m=t.length;--m>-1;)for(p=t[m],n=p.a,a=p.d-n,o=p.c-n,h=p.b-n,s=r=0,_=1;i>=_;_++)l=f*_,u=1-l,s=r-(r=(l*l*a+3*u*(l*o+u*h))*l),c=m*i+_-1,e[c]=(e[c]||0)+s*s},f=function(t,e){e=e>>0||6;var i,s,r,n,a=[],o=[],h=0,l=0,_=e-1,u=[],p=[];for(i in t)c(t[i],a,e);for(r=a.length,s=0;r>s;s++)h+=Math.sqrt(a[s]),n=s%e,p[n]=h,n===_&&(l+=h,n=s/e>>0,u[n]=p,o[n]=l,h=0,p=[]);return{length:l,lengths:o,segments:u}},m=_gsScope._gsDefine.plugin({propName:"bezier",priority:-1,version:"1.3.4",API:2,global:!0,init:function(t,e,i){this._target=t,e instanceof Array&&(e={values:e}),this._func={},this._round={},this._props=[],this._timeRes=null==e.timeResolution?6:parseInt(e.timeResolution,10);var s,r,n,a,o,h=e.values||[],l={},_=h[0],c=e.autoRotate||i.vars.orientToBezier;this._autoRotate=c?c instanceof Array?c:[["x","y","rotation",c===!0?0:Number(c)||0]]:null;for(s in _)this._props.push(s);for(n=this._props.length;--n>-1;)s=this._props[n],this._overwriteProps.push(s),r=this._func[s]="function"==typeof t[s],l[s]=r?t[s.indexOf("set")||"function"!=typeof t["get"+s.substr(3)]?s:"get"+s.substr(3)]():parseFloat(t[s]),o||l[s]!==h[0][s]&&(o=l);if(this._beziers="cubic"!==e.type&&"quadratic"!==e.type&&"soft"!==e.type?u(h,isNaN(e.curviness)?1:e.curviness,!1,"thruBasic"===e.type,e.correlate,o):p(h,e.type,l),this._segCount=this._beziers[s].length,this._timeRes){var m=f(this._beziers,this._timeRes);this._length=m.length,this._lengths=m.lengths,this._segments=m.segments,this._l1=this._li=this._s1=this._si=0,this._l2=this._lengths[0],this._curSeg=this._segments[0],this._s2=this._curSeg[0],this._prec=1/this._curSeg.length}if(c=this._autoRotate)for(this._initialRotations=[],c[0]instanceof Array||(this._autoRotate=c=[c]),n=c.length;--n>-1;){for(a=0;3>a;a++)s=c[n][a],this._func[s]="function"==typeof t[s]?t[s.indexOf("set")||"function"!=typeof t["get"+s.substr(3)]?s:"get"+s.substr(3)]:!1;s=c[n][2],this._initialRotations[n]=this._func[s]?this._func[s].call(this._target):this._target[s]}return this._startRatio=i.vars.runBackwards?1:0,!0},set:function(e){var i,s,r,n,a,o,h,l,_,u,p=this._segCount,c=this._func,f=this._target,m=e!==this._startRatio;if(this._timeRes){if(_=this._lengths,u=this._curSeg,e*=this._length,r=this._li,e>this._l2&&p-1>r){for(l=p-1;l>r&&e>=(this._l2=_[++r]););this._l1=_[r-1],this._li=r,this._curSeg=u=this._segments[r],this._s2=u[this._s1=this._si=0]}else if(this._l1>e&&r>0){for(;r>0&&(this._l1=_[--r])>=e;);0===r&&this._l1>e?this._l1=0:r++,this._l2=_[r],this._li=r,this._curSeg=u=this._segments[r],this._s1=u[(this._si=u.length-1)-1]||0,this._s2=u[this._si]
}if(i=r,e-=this._l1,r=this._si,e>this._s2&&u.length-1>r){for(l=u.length-1;l>r&&e>=(this._s2=u[++r]););this._s1=u[r-1],this._si=r}else if(this._s1>e&&r>0){for(;r>0&&(this._s1=u[--r])>=e;);0===r&&this._s1>e?this._s1=0:r++,this._s2=u[r],this._si=r}o=(r+(e-this._s1)/(this._s2-this._s1))*this._prec}else i=0>e?0:e>=1?p-1:p*e>>0,o=(e-i*(1/p))*p;for(s=1-o,r=this._props.length;--r>-1;)n=this._props[r],a=this._beziers[n][i],h=(o*o*a.da+3*s*(o*a.ca+s*a.ba))*o+a.a,this._round[n]&&(h=Math.round(h)),c[n]?f[n](h):f[n]=h;if(this._autoRotate){var d,g,v,y,T,w,x,b=this._autoRotate;for(r=b.length;--r>-1;)n=b[r][2],w=b[r][3]||0,x=b[r][4]===!0?1:t,a=this._beziers[b[r][0]],d=this._beziers[b[r][1]],a&&d&&(a=a[i],d=d[i],g=a.a+(a.b-a.a)*o,y=a.b+(a.c-a.b)*o,g+=(y-g)*o,y+=(a.c+(a.d-a.c)*o-y)*o,v=d.a+(d.b-d.a)*o,T=d.b+(d.c-d.b)*o,v+=(T-v)*o,T+=(d.c+(d.d-d.c)*o-T)*o,h=m?Math.atan2(T-v,y-g)*x+w:this._initialRotations[r],c[n]?f[n](h):f[n]=h)}}}),d=m.prototype;m.bezierThrough=u,m.cubicToQuadratic=h,m._autoCSS=!0,m.quadraticToCubic=function(t,e,i){return new a(t,(2*e+t)/3,(2*e+i)/3,i)},m._cssRegister=function(){var t=n.CSSPlugin;if(t){var e=t._internals,i=e._parseToProxy,s=e._setPluginRatio,r=e.CSSPropTween;e._registerComplexSpecialProp("bezier",{parser:function(t,e,n,a,o,h){e instanceof Array&&(e={values:e}),h=new m;var l,_,u,p=e.values,c=p.length-1,f=[],d={};if(0>c)return o;for(l=0;c>=l;l++)u=i(t,p[l],a,o,h,c!==l),f[l]=u.end;for(_ in e)d[_]=e[_];return d.values=f,o=new r(t,"bezier",0,0,u.pt,2),o.data=u,o.plugin=h,o.setRatio=s,0===d.autoRotate&&(d.autoRotate=!0),!d.autoRotate||d.autoRotate instanceof Array||(l=d.autoRotate===!0?0:Number(d.autoRotate),d.autoRotate=null!=u.end.left?[["left","top","rotation",l,!1]]:null!=u.end.x?[["x","y","rotation",l,!1]]:!1),d.autoRotate&&(a._transform||a._enableTransforms(!1),u.autoRotate=a._target._gsTransform),h._onInitTween(u.proxy,d,a._tween),o}})}},d._roundProps=function(t,e){for(var i=this._overwriteProps,s=i.length;--s>-1;)(t[i[s]]||t.bezier||t.bezierThrough)&&(this._round[i[s]]=e)},d._kill=function(t){var e,i,s=this._props;for(e in this._beziers)if(e in t)for(delete this._beziers[e],delete this._func[e],i=s.length;--i>-1;)s[i]===e&&s.splice(i,1);return this._super._kill.call(this,t)}}(),_gsScope._gsDefine("plugins.CSSPlugin",["plugins.TweenPlugin","TweenLite"],function(t,e){var i,s,r,n,a=function(){t.call(this,"css"),this._overwriteProps.length=0,this.setRatio=a.prototype.setRatio},o=_gsScope._gsDefine.globals,h={},l=a.prototype=new t("css");l.constructor=a,a.version="1.15.1",a.API=2,a.defaultTransformPerspective=0,a.defaultSkewType="compensated",l="px",a.suffixMap={top:l,right:l,bottom:l,left:l,width:l,height:l,fontSize:l,padding:l,margin:l,perspective:l,lineHeight:""};var _,u,p,c,f,m,d=/(?:\d|\-\d|\.\d|\-\.\d)+/g,g=/(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,v=/(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi,y=/(?![+-]?\d*\.?\d+|[+-]|e[+-]\d+)[^0-9]/g,T=/(?:\d|\-|\+|=|#|\.)*/g,w=/opacity *= *([^)]*)/i,x=/opacity:([^;]*)/i,b=/alpha\(opacity *=.+?\)/i,P=/^(rgb|hsl)/,S=/([A-Z])/g,k=/-([a-z])/gi,R=/(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi,A=function(t,e){return e.toUpperCase()},C=/(?:Left|Right|Width)/i,O=/(M11|M12|M21|M22)=[\d\-\.e]+/gi,D=/progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,M=/,(?=[^\)]*(?:\(|$))/gi,z=Math.PI/180,I=180/Math.PI,F={},E=document,N=function(t){return E.createElementNS?E.createElementNS("http://www.w3.org/1999/xhtml",t):E.createElement(t)},L=N("div"),X=N("img"),U=a._internals={_specialProps:h},Y=navigator.userAgent,B=function(){var t=Y.indexOf("Android"),e=N("a");return p=-1!==Y.indexOf("Safari")&&-1===Y.indexOf("Chrome")&&(-1===t||Number(Y.substr(t+8,1))>3),f=p&&6>Number(Y.substr(Y.indexOf("Version/")+8,1)),c=-1!==Y.indexOf("Firefox"),(/MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(Y)||/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(Y))&&(m=parseFloat(RegExp.$1)),e?(e.style.cssText="top:1px;opacity:.55;",/^0.55/.test(e.style.opacity)):!1}(),j=function(t){return w.test("string"==typeof t?t:(t.currentStyle?t.currentStyle.filter:t.style.filter)||"")?parseFloat(RegExp.$1)/100:1},q=function(t){window.console&&console.log(t)},V="",G="",W=function(t,e){e=e||L;var i,s,r=e.style;if(void 0!==r[t])return t;for(t=t.charAt(0).toUpperCase()+t.substr(1),i=["O","Moz","ms","Ms","Webkit"],s=5;--s>-1&&void 0===r[i[s]+t];);return s>=0?(G=3===s?"ms":i[s],V="-"+G.toLowerCase()+"-",G+t):null},Z=E.defaultView?E.defaultView.getComputedStyle:function(){},Q=a.getStyle=function(t,e,i,s,r){var n;return B||"opacity"!==e?(!s&&t.style[e]?n=t.style[e]:(i=i||Z(t))?n=i[e]||i.getPropertyValue(e)||i.getPropertyValue(e.replace(S,"-$1").toLowerCase()):t.currentStyle&&(n=t.currentStyle[e]),null==r||n&&"none"!==n&&"auto"!==n&&"auto auto"!==n?n:r):j(t)},$=U.convertToPixels=function(t,i,s,r,n){if("px"===r||!r)return s;if("auto"===r||!s)return 0;var o,h,l,_=C.test(i),u=t,p=L.style,c=0>s;if(c&&(s=-s),"%"===r&&-1!==i.indexOf("border"))o=s/100*(_?t.clientWidth:t.clientHeight);else{if(p.cssText="border:0 solid red;position:"+Q(t,"position")+";line-height:0;","%"!==r&&u.appendChild)p[_?"borderLeftWidth":"borderTopWidth"]=s+r;else{if(u=t.parentNode||E.body,h=u._gsCache,l=e.ticker.frame,h&&_&&h.time===l)return h.width*s/100;p[_?"width":"height"]=s+r}u.appendChild(L),o=parseFloat(L[_?"offsetWidth":"offsetHeight"]),u.removeChild(L),_&&"%"===r&&a.cacheWidths!==!1&&(h=u._gsCache=u._gsCache||{},h.time=l,h.width=100*(o/s)),0!==o||n||(o=$(t,i,s,r,!0))}return c?-o:o},H=U.calculateOffset=function(t,e,i){if("absolute"!==Q(t,"position",i))return 0;var s="left"===e?"Left":"Top",r=Q(t,"margin"+s,i);return t["offset"+s]-($(t,e,parseFloat(r),r.replace(T,""))||0)},K=function(t,e){var i,s,r={};if(e=e||Z(t,null))for(i in e)(-1===i.indexOf("Transform")||xe===i)&&(r[i]=e[i]);else if(e=t.currentStyle||t.style)for(i in e)"string"==typeof i&&void 0===r[i]&&(r[i.replace(k,A)]=e[i]);return B||(r.opacity=j(t)),s=Me(t,e,!1),r.rotation=s.rotation,r.skewX=s.skewX,r.scaleX=s.scaleX,r.scaleY=s.scaleY,r.x=s.x,r.y=s.y,Se&&(r.z=s.z,r.rotationX=s.rotationX,r.rotationY=s.rotationY,r.scaleZ=s.scaleZ),r.filters&&delete r.filters,r},J=function(t,e,i,s,r){var n,a,o,h={},l=t.style;for(a in i)"cssText"!==a&&"length"!==a&&isNaN(a)&&(e[a]!==(n=i[a])||r&&r[a])&&-1===a.indexOf("Origin")&&("number"==typeof n||"string"==typeof n)&&(h[a]="auto"!==n||"left"!==a&&"top"!==a?""!==n&&"auto"!==n&&"none"!==n||"string"!=typeof e[a]||""===e[a].replace(y,"")?n:0:H(t,a),void 0!==l[a]&&(o=new ce(l,a,l[a],o)));if(s)for(a in s)"className"!==a&&(h[a]=s[a]);return{difs:h,firstMPT:o}},te={width:["Left","Right"],height:["Top","Bottom"]},ee=["marginLeft","marginRight","marginTop","marginBottom"],ie=function(t,e,i){var s=parseFloat("width"===e?t.offsetWidth:t.offsetHeight),r=te[e],n=r.length;for(i=i||Z(t,null);--n>-1;)s-=parseFloat(Q(t,"padding"+r[n],i,!0))||0,s-=parseFloat(Q(t,"border"+r[n]+"Width",i,!0))||0;return s},se=function(t,e){(null==t||""===t||"auto"===t||"auto auto"===t)&&(t="0 0");var i=t.split(" "),s=-1!==t.indexOf("left")?"0%":-1!==t.indexOf("right")?"100%":i[0],r=-1!==t.indexOf("top")?"0%":-1!==t.indexOf("bottom")?"100%":i[1];return null==r?r="center"===s?"50%":"0":"center"===r&&(r="50%"),("center"===s||isNaN(parseFloat(s))&&-1===(s+"").indexOf("="))&&(s="50%"),e&&(e.oxp=-1!==s.indexOf("%"),e.oyp=-1!==r.indexOf("%"),e.oxr="="===s.charAt(1),e.oyr="="===r.charAt(1),e.ox=parseFloat(s.replace(y,"")),e.oy=parseFloat(r.replace(y,""))),s+" "+r+(i.length>2?" "+i[2]:"")},re=function(t,e){return"string"==typeof t&&"="===t.charAt(1)?parseInt(t.charAt(0)+"1",10)*parseFloat(t.substr(2)):parseFloat(t)-parseFloat(e)},ne=function(t,e){return null==t?e:"string"==typeof t&&"="===t.charAt(1)?parseInt(t.charAt(0)+"1",10)*parseFloat(t.substr(2))+e:parseFloat(t)},ae=function(t,e,i,s){var r,n,a,o,h,l=1e-6;return null==t?o=e:"number"==typeof t?o=t:(r=360,n=t.split("_"),h="="===t.charAt(1),a=(h?parseInt(t.charAt(0)+"1",10)*parseFloat(n[0].substr(2)):parseFloat(n[0]))*(-1===t.indexOf("rad")?1:I)-(h?0:e),n.length&&(s&&(s[i]=e+a),-1!==t.indexOf("short")&&(a%=r,a!==a%(r/2)&&(a=0>a?a+r:a-r)),-1!==t.indexOf("_cw")&&0>a?a=(a+9999999999*r)%r-(0|a/r)*r:-1!==t.indexOf("ccw")&&a>0&&(a=(a-9999999999*r)%r-(0|a/r)*r)),o=e+a),l>o&&o>-l&&(o=0),o},oe={aqua:[0,255,255],lime:[0,255,0],silver:[192,192,192],black:[0,0,0],maroon:[128,0,0],teal:[0,128,128],blue:[0,0,255],navy:[0,0,128],white:[255,255,255],fuchsia:[255,0,255],olive:[128,128,0],yellow:[255,255,0],orange:[255,165,0],gray:[128,128,128],purple:[128,0,128],green:[0,128,0],red:[255,0,0],pink:[255,192,203],cyan:[0,255,255],transparent:[255,255,255,0]},he=function(t,e,i){return t=0>t?t+1:t>1?t-1:t,0|255*(1>6*t?e+6*(i-e)*t:.5>t?i:2>3*t?e+6*(i-e)*(2/3-t):e)+.5},le=a.parseColor=function(t){var e,i,s,r,n,a;return t&&""!==t?"number"==typeof t?[t>>16,255&t>>8,255&t]:(","===t.charAt(t.length-1)&&(t=t.substr(0,t.length-1)),oe[t]?oe[t]:"#"===t.charAt(0)?(4===t.length&&(e=t.charAt(1),i=t.charAt(2),s=t.charAt(3),t="#"+e+e+i+i+s+s),t=parseInt(t.substr(1),16),[t>>16,255&t>>8,255&t]):"hsl"===t.substr(0,3)?(t=t.match(d),r=Number(t[0])%360/360,n=Number(t[1])/100,a=Number(t[2])/100,i=.5>=a?a*(n+1):a+n-a*n,e=2*a-i,t.length>3&&(t[3]=Number(t[3])),t[0]=he(r+1/3,e,i),t[1]=he(r,e,i),t[2]=he(r-1/3,e,i),t):(t=t.match(d)||oe.transparent,t[0]=Number(t[0]),t[1]=Number(t[1]),t[2]=Number(t[2]),t.length>3&&(t[3]=Number(t[3])),t)):oe.black},_e="(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#.+?\\b";for(l in oe)_e+="|"+l+"\\b";_e=RegExp(_e+")","gi");var ue=function(t,e,i,s){if(null==t)return function(t){return t};var r,n=e?(t.match(_e)||[""])[0]:"",a=t.split(n).join("").match(v)||[],o=t.substr(0,t.indexOf(a[0])),h=")"===t.charAt(t.length-1)?")":"",l=-1!==t.indexOf(" ")?" ":",",_=a.length,u=_>0?a[0].replace(d,""):"";return _?r=e?function(t){var e,p,c,f;if("number"==typeof t)t+=u;else if(s&&M.test(t)){for(f=t.replace(M,"|").split("|"),c=0;f.length>c;c++)f[c]=r(f[c]);return f.join(",")}if(e=(t.match(_e)||[n])[0],p=t.split(e).join("").match(v)||[],c=p.length,_>c--)for(;_>++c;)p[c]=i?p[0|(c-1)/2]:a[c];return o+p.join(l)+l+e+h+(-1!==t.indexOf("inset")?" inset":"")}:function(t){var e,n,p;if("number"==typeof t)t+=u;else if(s&&M.test(t)){for(n=t.replace(M,"|").split("|"),p=0;n.length>p;p++)n[p]=r(n[p]);return n.join(",")}if(e=t.match(v)||[],p=e.length,_>p--)for(;_>++p;)e[p]=i?e[0|(p-1)/2]:a[p];return o+e.join(l)+h}:function(t){return t}},pe=function(t){return t=t.split(","),function(e,i,s,r,n,a,o){var h,l=(i+"").split(" ");for(o={},h=0;4>h;h++)o[t[h]]=l[h]=l[h]||l[(h-1)/2>>0];return r.parse(e,o,n,a)}},ce=(U._setPluginRatio=function(t){this.plugin.setRatio(t);for(var e,i,s,r,n=this.data,a=n.proxy,o=n.firstMPT,h=1e-6;o;)e=a[o.v],o.r?e=Math.round(e):h>e&&e>-h&&(e=0),o.t[o.p]=e,o=o._next;if(n.autoRotate&&(n.autoRotate.rotation=a.rotation),1===t)for(o=n.firstMPT;o;){if(i=o.t,i.type){if(1===i.type){for(r=i.xs0+i.s+i.xs1,s=1;i.l>s;s++)r+=i["xn"+s]+i["xs"+(s+1)];i.e=r}}else i.e=i.s+i.xs0;o=o._next}},function(t,e,i,s,r){this.t=t,this.p=e,this.v=i,this.r=r,s&&(s._prev=this,this._next=s)}),fe=(U._parseToProxy=function(t,e,i,s,r,n){var a,o,h,l,_,u=s,p={},c={},f=i._transform,m=F;for(i._transform=null,F=e,s=_=i.parse(t,e,s,r),F=m,n&&(i._transform=f,u&&(u._prev=null,u._prev&&(u._prev._next=null)));s&&s!==u;){if(1>=s.type&&(o=s.p,c[o]=s.s+s.c,p[o]=s.s,n||(l=new ce(s,"s",o,l,s.r),s.c=0),1===s.type))for(a=s.l;--a>0;)h="xn"+a,o=s.p+"_"+h,c[o]=s.data[h],p[o]=s[h],n||(l=new ce(s,h,o,l,s.rxp[h]));s=s._next}return{proxy:p,end:c,firstMPT:l,pt:_}},U.CSSPropTween=function(t,e,s,r,a,o,h,l,_,u,p){this.t=t,this.p=e,this.s=s,this.c=r,this.n=h||e,t instanceof fe||n.push(this.n),this.r=l,this.type=o||0,_&&(this.pr=_,i=!0),this.b=void 0===u?s:u,this.e=void 0===p?s+r:p,a&&(this._next=a,a._prev=this)}),me=a.parseComplex=function(t,e,i,s,r,n,a,o,h,l){i=i||n||"",a=new fe(t,e,0,0,a,l?2:1,null,!1,o,i,s),s+="";var u,p,c,f,m,v,y,T,w,x,b,S,k=i.split(", ").join(",").split(" "),R=s.split(", ").join(",").split(" "),A=k.length,C=_!==!1;for((-1!==s.indexOf(",")||-1!==i.indexOf(","))&&(k=k.join(" ").replace(M,", ").split(" "),R=R.join(" ").replace(M,", ").split(" "),A=k.length),A!==R.length&&(k=(n||"").split(" "),A=k.length),a.plugin=h,a.setRatio=l,u=0;A>u;u++)if(f=k[u],m=R[u],T=parseFloat(f),T||0===T)a.appendXtra("",T,re(m,T),m.replace(g,""),C&&-1!==m.indexOf("px"),!0);else if(r&&("#"===f.charAt(0)||oe[f]||P.test(f)))S=","===m.charAt(m.length-1)?"),":")",f=le(f),m=le(m),w=f.length+m.length>6,w&&!B&&0===m[3]?(a["xs"+a.l]+=a.l?" transparent":"transparent",a.e=a.e.split(R[u]).join("transparent")):(B||(w=!1),a.appendXtra(w?"rgba(":"rgb(",f[0],m[0]-f[0],",",!0,!0).appendXtra("",f[1],m[1]-f[1],",",!0).appendXtra("",f[2],m[2]-f[2],w?",":S,!0),w&&(f=4>f.length?1:f[3],a.appendXtra("",f,(4>m.length?1:m[3])-f,S,!1)));else if(v=f.match(d)){if(y=m.match(g),!y||y.length!==v.length)return a;for(c=0,p=0;v.length>p;p++)b=v[p],x=f.indexOf(b,c),a.appendXtra(f.substr(c,x-c),Number(b),re(y[p],b),"",C&&"px"===f.substr(x+b.length,2),0===p),c=x+b.length;a["xs"+a.l]+=f.substr(c)}else a["xs"+a.l]+=a.l?" "+f:f;if(-1!==s.indexOf("=")&&a.data){for(S=a.xs0+a.data.s,u=1;a.l>u;u++)S+=a["xs"+u]+a.data["xn"+u];a.e=S+a["xs"+u]}return a.l||(a.type=-1,a.xs0=a.e),a.xfirst||a},de=9;for(l=fe.prototype,l.l=l.pr=0;--de>0;)l["xn"+de]=0,l["xs"+de]="";l.xs0="",l._next=l._prev=l.xfirst=l.data=l.plugin=l.setRatio=l.rxp=null,l.appendXtra=function(t,e,i,s,r,n){var a=this,o=a.l;return a["xs"+o]+=n&&o?" "+t:t||"",i||0===o||a.plugin?(a.l++,a.type=a.setRatio?2:1,a["xs"+a.l]=s||"",o>0?(a.data["xn"+o]=e+i,a.rxp["xn"+o]=r,a["xn"+o]=e,a.plugin||(a.xfirst=new fe(a,"xn"+o,e,i,a.xfirst||a,0,a.n,r,a.pr),a.xfirst.xs0=0),a):(a.data={s:e+i},a.rxp={},a.s=e,a.c=i,a.r=r,a)):(a["xs"+o]+=e+(s||""),a)};var ge=function(t,e){e=e||{},this.p=e.prefix?W(t)||t:t,h[t]=h[this.p]=this,this.format=e.formatter||ue(e.defaultValue,e.color,e.collapsible,e.multi),e.parser&&(this.parse=e.parser),this.clrs=e.color,this.multi=e.multi,this.keyword=e.keyword,this.dflt=e.defaultValue,this.pr=e.priority||0},ve=U._registerComplexSpecialProp=function(t,e,i){"object"!=typeof e&&(e={parser:i});var s,r,n=t.split(","),a=e.defaultValue;for(i=i||[a],s=0;n.length>s;s++)e.prefix=0===s&&e.prefix,e.defaultValue=i[s]||a,r=new ge(n[s],e)},ye=function(t){if(!h[t]){var e=t.charAt(0).toUpperCase()+t.substr(1)+"Plugin";ve(t,{parser:function(t,i,s,r,n,a,l){var _=o.com.greensock.plugins[e];return _?(_._cssRegister(),h[s].parse(t,i,s,r,n,a,l)):(q("Error: "+e+" js file not loaded."),n)}})}};l=ge.prototype,l.parseComplex=function(t,e,i,s,r,n){var a,o,h,l,_,u,p=this.keyword;if(this.multi&&(M.test(i)||M.test(e)?(o=e.replace(M,"|").split("|"),h=i.replace(M,"|").split("|")):p&&(o=[e],h=[i])),h){for(l=h.length>o.length?h.length:o.length,a=0;l>a;a++)e=o[a]=o[a]||this.dflt,i=h[a]=h[a]||this.dflt,p&&(_=e.indexOf(p),u=i.indexOf(p),_!==u&&(i=-1===u?h:o,i[a]+=" "+p));e=o.join(", "),i=h.join(", ")}return me(t,this.p,e,i,this.clrs,this.dflt,s,this.pr,r,n)},l.parse=function(t,e,i,s,n,a){return this.parseComplex(t.style,this.format(Q(t,this.p,r,!1,this.dflt)),this.format(e),n,a)},a.registerSpecialProp=function(t,e,i){ve(t,{parser:function(t,s,r,n,a,o){var h=new fe(t,r,0,0,a,2,r,!1,i);return h.plugin=o,h.setRatio=e(t,s,n._tween,r),h},priority:i})};var Te,we="scaleX,scaleY,scaleZ,x,y,z,skewX,skewY,rotation,rotationX,rotationY,perspective,xPercent,yPercent".split(","),xe=W("transform"),be=V+"transform",Pe=W("transformOrigin"),Se=null!==W("perspective"),ke=U.Transform=function(){this.perspective=parseFloat(a.defaultTransformPerspective)||0,this.force3D=a.defaultForce3D!==!1&&Se?a.defaultForce3D||"auto":!1},Re=window.SVGElement,Ae=function(t,e,i){var s,r=E.createElementNS("http://www.w3.org/2000/svg",t),n=/([a-z])([A-Z])/g;for(s in i)r.setAttributeNS(null,s.replace(n,"$1-$2").toLowerCase(),i[s]);return e.appendChild(r),r},Ce=document.documentElement,Oe=function(){var t,e,i,s=m||/Android/i.test(Y)&&!window.chrome;return E.createElementNS&&!s&&(t=Ae("svg",Ce),e=Ae("rect",t,{width:100,height:50,x:100}),i=e.getBoundingClientRect().width,e.style[Pe]="50% 50%",e.style[xe]="scaleX(0.5)",s=i===e.getBoundingClientRect().width&&!(c&&Se),Ce.removeChild(t)),s}(),De=function(t,e,i){var s=t.getBBox();e=se(e).split(" "),i.xOrigin=(-1!==e[0].indexOf("%")?parseFloat(e[0])/100*s.width:parseFloat(e[0]))+s.x,i.yOrigin=(-1!==e[1].indexOf("%")?parseFloat(e[1])/100*s.height:parseFloat(e[1]))+s.y},Me=U.getTransform=function(t,e,i,s){if(t._gsTransform&&i&&!s)return t._gsTransform;var n,o,h,l,_,u,p,c,f,m,d=i?t._gsTransform||new ke:new ke,g=0>d.scaleX,v=2e-5,y=1e5,T=Se?parseFloat(Q(t,Pe,e,!1,"0 0 0").split(" ")[2])||d.zOrigin||0:0,w=parseFloat(a.defaultTransformPerspective)||0;if(xe?o=Q(t,be,e,!0):t.currentStyle&&(o=t.currentStyle.filter.match(O),o=o&&4===o.length?[o[0].substr(4),Number(o[2].substr(4)),Number(o[1].substr(4)),o[3].substr(4),d.x||0,d.y||0].join(","):""),n=!o||"none"===o||"matrix(1, 0, 0, 1, 0, 0)"===o,d.svg=!!(Re&&"function"==typeof t.getBBox&&t.getCTM&&(!t.parentNode||t.parentNode.getBBox&&t.parentNode.getCTM)),d.svg&&(De(t,Q(t,Pe,r,!1,"50% 50%")+"",d),Te=a.useSVGTransformAttr||Oe,h=t.getAttribute("transform"),n&&h&&-1!==h.indexOf("matrix")&&(o=h,n=0)),!n){for(h=(o||"").match(/(?:\-|\b)[\d\-\.e]+\b/gi)||[],l=h.length;--l>-1;)_=Number(h[l]),h[l]=(u=_-(_|=0))?(0|u*y+(0>u?-.5:.5))/y+_:_;if(16===h.length){var x,b,P,S,k,R=h[0],A=h[1],C=h[2],D=h[3],M=h[4],z=h[5],F=h[6],E=h[7],N=h[8],L=h[9],X=h[10],U=h[12],Y=h[13],B=h[14],j=h[11],q=Math.atan2(F,X);d.zOrigin&&(B=-d.zOrigin,U=N*B-h[12],Y=L*B-h[13],B=X*B+d.zOrigin-h[14]),d.rotationX=q*I,q&&(S=Math.cos(-q),k=Math.sin(-q),x=M*S+N*k,b=z*S+L*k,P=F*S+X*k,N=M*-k+N*S,L=z*-k+L*S,X=F*-k+X*S,j=E*-k+j*S,M=x,z=b,F=P),q=Math.atan2(N,X),d.rotationY=q*I,q&&(S=Math.cos(-q),k=Math.sin(-q),x=R*S-N*k,b=A*S-L*k,P=C*S-X*k,L=A*k+L*S,X=C*k+X*S,j=D*k+j*S,R=x,A=b,C=P),q=Math.atan2(A,R),d.rotation=q*I,q&&(S=Math.cos(-q),k=Math.sin(-q),R=R*S+M*k,b=A*S+z*k,z=A*-k+z*S,F=C*-k+F*S,A=b),d.rotationX&&Math.abs(d.rotationX)+Math.abs(d.rotation)>359.9&&(d.rotationX=d.rotation=0,d.rotationY+=180),d.scaleX=(0|Math.sqrt(R*R+A*A)*y+.5)/y,d.scaleY=(0|Math.sqrt(z*z+L*L)*y+.5)/y,d.scaleZ=(0|Math.sqrt(F*F+X*X)*y+.5)/y,d.skewX=0,d.perspective=j?1/(0>j?-j:j):0,d.x=U,d.y=Y,d.z=B}else if(!(Se&&!s&&h.length&&d.x===h[4]&&d.y===h[5]&&(d.rotationX||d.rotationY)||void 0!==d.x&&"none"===Q(t,"display",e))){var V=h.length>=6,G=V?h[0]:1,W=h[1]||0,Z=h[2]||0,$=V?h[3]:1;d.x=h[4]||0,d.y=h[5]||0,p=Math.sqrt(G*G+W*W),c=Math.sqrt($*$+Z*Z),f=G||W?Math.atan2(W,G)*I:d.rotation||0,m=Z||$?Math.atan2(Z,$)*I+f:d.skewX||0,Math.abs(m)>90&&270>Math.abs(m)&&(g?(p*=-1,m+=0>=f?180:-180,f+=0>=f?180:-180):(c*=-1,m+=0>=m?180:-180)),d.scaleX=p,d.scaleY=c,d.rotation=f,d.skewX=m,Se&&(d.rotationX=d.rotationY=d.z=0,d.perspective=w,d.scaleZ=1)}d.zOrigin=T;for(l in d)v>d[l]&&d[l]>-v&&(d[l]=0)}return i&&(t._gsTransform=d),d},ze=function(t){var e,i,s=this.data,r=-s.rotation*z,n=r+s.skewX*z,a=1e5,o=(0|Math.cos(r)*s.scaleX*a)/a,h=(0|Math.sin(r)*s.scaleX*a)/a,l=(0|Math.sin(n)*-s.scaleY*a)/a,_=(0|Math.cos(n)*s.scaleY*a)/a,u=this.t.style,p=this.t.currentStyle;if(p){i=h,h=-l,l=-i,e=p.filter,u.filter="";var c,f,d=this.t.offsetWidth,g=this.t.offsetHeight,v="absolute"!==p.position,y="progid:DXImageTransform.Microsoft.Matrix(M11="+o+", M12="+h+", M21="+l+", M22="+_,x=s.x+d*s.xPercent/100,b=s.y+g*s.yPercent/100;if(null!=s.ox&&(c=(s.oxp?.01*d*s.ox:s.ox)-d/2,f=(s.oyp?.01*g*s.oy:s.oy)-g/2,x+=c-(c*o+f*h),b+=f-(c*l+f*_)),v?(c=d/2,f=g/2,y+=", Dx="+(c-(c*o+f*h)+x)+", Dy="+(f-(c*l+f*_)+b)+")"):y+=", sizingMethod='auto expand')",u.filter=-1!==e.indexOf("DXImageTransform.Microsoft.Matrix(")?e.replace(D,y):y+" "+e,(0===t||1===t)&&1===o&&0===h&&0===l&&1===_&&(v&&-1===y.indexOf("Dx=0, Dy=0")||w.test(e)&&100!==parseFloat(RegExp.$1)||-1===e.indexOf("gradient("&&e.indexOf("Alpha"))&&u.removeAttribute("filter")),!v){var P,S,k,R=8>m?1:-1;for(c=s.ieOffsetX||0,f=s.ieOffsetY||0,s.ieOffsetX=Math.round((d-((0>o?-o:o)*d+(0>h?-h:h)*g))/2+x),s.ieOffsetY=Math.round((g-((0>_?-_:_)*g+(0>l?-l:l)*d))/2+b),de=0;4>de;de++)S=ee[de],P=p[S],i=-1!==P.indexOf("px")?parseFloat(P):$(this.t,S,parseFloat(P),P.replace(T,""))||0,k=i!==s[S]?2>de?-s.ieOffsetX:-s.ieOffsetY:2>de?c-s.ieOffsetX:f-s.ieOffsetY,u[S]=(s[S]=Math.round(i-k*(0===de||2===de?1:R)))+"px"}}},Ie=U.set3DTransformRatio=function(t){var e,i,s,r,n,a,o,h,l,_,u,p,f,m,d,g,v,y,T,w,x,b=this.data,P=this.t.style,S=b.rotation*z,k=b.scaleX,R=b.scaleY,A=b.scaleZ,C=b.x,O=b.y,D=b.z,M=b.perspective;if(!(1!==t&&0!==t&&b.force3D||b.force3D===!0||b.rotationY||b.rotationX||1!==A||M||D))return Fe.call(this,t),void 0;if(c&&(m=1e-4,m>k&&k>-m&&(k=A=2e-5),m>R&&R>-m&&(R=A=2e-5),!M||b.z||b.rotationX||b.rotationY||(M=0)),S||b.skewX)d=e=Math.cos(S),g=r=Math.sin(S),b.skewX&&(S-=b.skewX*z,d=Math.cos(S),g=Math.sin(S),"simple"===b.skewType&&(v=Math.tan(b.skewX*z),v=Math.sqrt(1+v*v),d*=v,g*=v)),i=-g,n=d;else{if(!(b.rotationY||b.rotationX||1!==A||M||b.svg))return P[xe]=(b.xPercent||b.yPercent?"translate("+b.xPercent+"%,"+b.yPercent+"%) translate3d(":"translate3d(")+C+"px,"+O+"px,"+D+"px)"+(1!==k||1!==R?" scale("+k+","+R+")":""),void 0;e=n=1,i=r=0}l=1,s=a=o=h=_=u=0,p=M?-1/M:0,f=b.zOrigin,m=1e-6,w=",",x="0",S=b.rotationY*z,S&&(d=Math.cos(S),g=Math.sin(S),o=-g,_=p*-g,s=e*g,a=r*g,l=d,p*=d,e*=d,r*=d),S=b.rotationX*z,S&&(d=Math.cos(S),g=Math.sin(S),v=i*d+s*g,y=n*d+a*g,h=l*g,u=p*g,s=i*-g+s*d,a=n*-g+a*d,l*=d,p*=d,i=v,n=y),1!==A&&(s*=A,a*=A,l*=A,p*=A),1!==R&&(i*=R,n*=R,h*=R,u*=R),1!==k&&(e*=k,r*=k,o*=k,_*=k),(f||b.svg)&&(f&&(C+=s*-f,O+=a*-f,D+=l*-f+f),b.svg&&(C+=b.xOrigin-(b.xOrigin*e+b.yOrigin*i),O+=b.yOrigin-(b.xOrigin*r+b.yOrigin*n)),m>C&&C>-m&&(C=x),m>O&&O>-m&&(O=x),m>D&&D>-m&&(D=0)),T=b.xPercent||b.yPercent?"translate("+b.xPercent+"%,"+b.yPercent+"%) matrix3d(":"matrix3d(",T+=(m>e&&e>-m?x:e)+w+(m>r&&r>-m?x:r)+w+(m>o&&o>-m?x:o),T+=w+(m>_&&_>-m?x:_)+w+(m>i&&i>-m?x:i)+w+(m>n&&n>-m?x:n),b.rotationX||b.rotationY?(T+=w+(m>h&&h>-m?x:h)+w+(m>u&&u>-m?x:u)+w+(m>s&&s>-m?x:s),T+=w+(m>a&&a>-m?x:a)+w+(m>l&&l>-m?x:l)+w+(m>p&&p>-m?x:p)+w):T+=",0,0,0,0,1,0,",T+=C+w+O+w+D+w+(M?1+-D/M:1)+")",P[xe]=T},Fe=U.set2DTransformRatio=function(t){var e,i,s,r,n,a,o,h,l,_,u,p=this.data,c=this.t,f=c.style,m=p.x,d=p.y;return!(p.rotationX||p.rotationY||p.z||p.force3D===!0||"auto"===p.force3D&&1!==t&&0!==t)||p.svg&&Te||!Se?(r=p.scaleX,n=p.scaleY,p.rotation||p.skewX||p.svg?(e=p.rotation*z,i=e-p.skewX*z,s=1e5,a=Math.cos(e)*r,o=Math.sin(e)*r,h=Math.sin(i)*-n,l=Math.cos(i)*n,p.svg&&(m+=p.xOrigin-(p.xOrigin*a+p.yOrigin*h),d+=p.yOrigin-(p.xOrigin*o+p.yOrigin*l),u=1e-6,u>m&&m>-u&&(m=0),u>d&&d>-u&&(d=0)),_=(0|a*s)/s+","+(0|o*s)/s+","+(0|h*s)/s+","+(0|l*s)/s+","+m+","+d+")",p.svg&&Te?c.setAttribute("transform","matrix("+_):f[xe]=(p.xPercent||p.yPercent?"translate("+p.xPercent+"%,"+p.yPercent+"%) matrix(":"matrix(")+_):f[xe]=(p.xPercent||p.yPercent?"translate("+p.xPercent+"%,"+p.yPercent+"%) matrix(":"matrix(")+r+",0,0,"+n+","+m+","+d+")",void 0):(this.setRatio=Ie,Ie.call(this,t),void 0)};l=ke.prototype,l.x=l.y=l.z=l.skewX=l.skewY=l.rotation=l.rotationX=l.rotationY=l.zOrigin=l.xPercent=l.yPercent=0,l.scaleX=l.scaleY=l.scaleZ=1,ve("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,transformPerspective,directionalRotation,parseTransform,force3D,skewType,xPercent,yPercent",{parser:function(t,e,i,s,n,o,h){if(s._lastParsedTransform===h)return n;s._lastParsedTransform=h;var l,_,u,p,c,f,m,d=s._transform=Me(t,r,!0,h.parseTransform),g=t.style,v=1e-6,y=we.length,T=h,w={};if("string"==typeof T.transform&&xe)u=L.style,u[xe]=T.transform,u.display="block",u.position="absolute",E.body.appendChild(L),l=Me(L,null,!1),E.body.removeChild(L);else if("object"==typeof T){if(l={scaleX:ne(null!=T.scaleX?T.scaleX:T.scale,d.scaleX),scaleY:ne(null!=T.scaleY?T.scaleY:T.scale,d.scaleY),scaleZ:ne(T.scaleZ,d.scaleZ),x:ne(T.x,d.x),y:ne(T.y,d.y),z:ne(T.z,d.z),xPercent:ne(T.xPercent,d.xPercent),yPercent:ne(T.yPercent,d.yPercent),perspective:ne(T.transformPerspective,d.perspective)},m=T.directionalRotation,null!=m)if("object"==typeof m)for(u in m)T[u]=m[u];else T.rotation=m;"string"==typeof T.x&&-1!==T.x.indexOf("%")&&(l.x=0,l.xPercent=ne(T.x,d.xPercent)),"string"==typeof T.y&&-1!==T.y.indexOf("%")&&(l.y=0,l.yPercent=ne(T.y,d.yPercent)),l.rotation=ae("rotation"in T?T.rotation:"shortRotation"in T?T.shortRotation+"_short":"rotationZ"in T?T.rotationZ:d.rotation,d.rotation,"rotation",w),Se&&(l.rotationX=ae("rotationX"in T?T.rotationX:"shortRotationX"in T?T.shortRotationX+"_short":d.rotationX||0,d.rotationX,"rotationX",w),l.rotationY=ae("rotationY"in T?T.rotationY:"shortRotationY"in T?T.shortRotationY+"_short":d.rotationY||0,d.rotationY,"rotationY",w)),l.skewX=null==T.skewX?d.skewX:ae(T.skewX,d.skewX),l.skewY=null==T.skewY?d.skewY:ae(T.skewY,d.skewY),(_=l.skewY-d.skewY)&&(l.skewX+=_,l.rotation+=_)}for(Se&&null!=T.force3D&&(d.force3D=T.force3D,f=!0),d.skewType=T.skewType||d.skewType||a.defaultSkewType,c=d.force3D||d.z||d.rotationX||d.rotationY||l.z||l.rotationX||l.rotationY||l.perspective,c||null==T.scale||(l.scaleZ=1);--y>-1;)i=we[y],p=l[i]-d[i],(p>v||-v>p||null!=T[i]||null!=F[i])&&(f=!0,n=new fe(d,i,d[i],p,n),i in w&&(n.e=w[i]),n.xs0=0,n.plugin=o,s._overwriteProps.push(n.n));return p=T.transformOrigin,p&&d.svg&&(De(t,se(p),l),n=new fe(d,"xOrigin",d.xOrigin,l.xOrigin-d.xOrigin,n,-1,"transformOrigin"),n.b=d.xOrigin,n.e=n.xs0=l.xOrigin,n=new fe(d,"yOrigin",d.yOrigin,l.yOrigin-d.yOrigin,n,-1,"transformOrigin"),n.b=d.yOrigin,n.e=n.xs0=l.yOrigin,p="0px 0px"),(p||Se&&c&&d.zOrigin)&&(xe?(f=!0,i=Pe,p=(p||Q(t,i,r,!1,"50% 50%"))+"",n=new fe(g,i,0,0,n,-1,"transformOrigin"),n.b=g[i],n.plugin=o,Se?(u=d.zOrigin,p=p.split(" "),d.zOrigin=(p.length>2&&(0===u||"0px"!==p[2])?parseFloat(p[2]):u)||0,n.xs0=n.e=p[0]+" "+(p[1]||"50%")+" 0px",n=new fe(d,"zOrigin",0,0,n,-1,n.n),n.b=u,n.xs0=n.e=d.zOrigin):n.xs0=n.e=p):se(p+"",d)),f&&(s._transformType=d.svg&&Te||!c&&3!==this._transformType?2:3),n},prefix:!0}),ve("boxShadow",{defaultValue:"0px 0px 0px 0px #999",prefix:!0,color:!0,multi:!0,keyword:"inset"}),ve("borderRadius",{defaultValue:"0px",parser:function(t,e,i,n,a){e=this.format(e);var o,h,l,_,u,p,c,f,m,d,g,v,y,T,w,x,b=["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],P=t.style;for(m=parseFloat(t.offsetWidth),d=parseFloat(t.offsetHeight),o=e.split(" "),h=0;b.length>h;h++)this.p.indexOf("border")&&(b[h]=W(b[h])),u=_=Q(t,b[h],r,!1,"0px"),-1!==u.indexOf(" ")&&(_=u.split(" "),u=_[0],_=_[1]),p=l=o[h],c=parseFloat(u),v=u.substr((c+"").length),y="="===p.charAt(1),y?(f=parseInt(p.charAt(0)+"1",10),p=p.substr(2),f*=parseFloat(p),g=p.substr((f+"").length-(0>f?1:0))||""):(f=parseFloat(p),g=p.substr((f+"").length)),""===g&&(g=s[i]||v),g!==v&&(T=$(t,"borderLeft",c,v),w=$(t,"borderTop",c,v),"%"===g?(u=100*(T/m)+"%",_=100*(w/d)+"%"):"em"===g?(x=$(t,"borderLeft",1,"em"),u=T/x+"em",_=w/x+"em"):(u=T+"px",_=w+"px"),y&&(p=parseFloat(u)+f+g,l=parseFloat(_)+f+g)),a=me(P,b[h],u+" "+_,p+" "+l,!1,"0px",a);return a},prefix:!0,formatter:ue("0px 0px 0px 0px",!1,!0)}),ve("backgroundPosition",{defaultValue:"0 0",parser:function(t,e,i,s,n,a){var o,h,l,_,u,p,c="background-position",f=r||Z(t,null),d=this.format((f?m?f.getPropertyValue(c+"-x")+" "+f.getPropertyValue(c+"-y"):f.getPropertyValue(c):t.currentStyle.backgroundPositionX+" "+t.currentStyle.backgroundPositionY)||"0 0"),g=this.format(e);if(-1!==d.indexOf("%")!=(-1!==g.indexOf("%"))&&(p=Q(t,"backgroundImage").replace(R,""),p&&"none"!==p)){for(o=d.split(" "),h=g.split(" "),X.setAttribute("src",p),l=2;--l>-1;)d=o[l],_=-1!==d.indexOf("%"),_!==(-1!==h[l].indexOf("%"))&&(u=0===l?t.offsetWidth-X.width:t.offsetHeight-X.height,o[l]=_?parseFloat(d)/100*u+"px":100*(parseFloat(d)/u)+"%");d=o.join(" ")}return this.parseComplex(t.style,d,g,n,a)},formatter:se}),ve("backgroundSize",{defaultValue:"0 0",formatter:se}),ve("perspective",{defaultValue:"0px",prefix:!0}),ve("perspectiveOrigin",{defaultValue:"50% 50%",prefix:!0}),ve("transformStyle",{prefix:!0}),ve("backfaceVisibility",{prefix:!0}),ve("userSelect",{prefix:!0}),ve("margin",{parser:pe("marginTop,marginRight,marginBottom,marginLeft")}),ve("padding",{parser:pe("paddingTop,paddingRight,paddingBottom,paddingLeft")}),ve("clip",{defaultValue:"rect(0px,0px,0px,0px)",parser:function(t,e,i,s,n,a){var o,h,l;return 9>m?(h=t.currentStyle,l=8>m?" ":",",o="rect("+h.clipTop+l+h.clipRight+l+h.clipBottom+l+h.clipLeft+")",e=this.format(e).split(",").join(l)):(o=this.format(Q(t,this.p,r,!1,this.dflt)),e=this.format(e)),this.parseComplex(t.style,o,e,n,a)}}),ve("textShadow",{defaultValue:"0px 0px 0px #999",color:!0,multi:!0}),ve("autoRound,strictUnits",{parser:function(t,e,i,s,r){return r}}),ve("border",{defaultValue:"0px solid #000",parser:function(t,e,i,s,n,a){return this.parseComplex(t.style,this.format(Q(t,"borderTopWidth",r,!1,"0px")+" "+Q(t,"borderTopStyle",r,!1,"solid")+" "+Q(t,"borderTopColor",r,!1,"#000")),this.format(e),n,a)},color:!0,formatter:function(t){var e=t.split(" ");return e[0]+" "+(e[1]||"solid")+" "+(t.match(_e)||["#000"])[0]}}),ve("borderWidth",{parser:pe("borderTopWidth,borderRightWidth,borderBottomWidth,borderLeftWidth")}),ve("float,cssFloat,styleFloat",{parser:function(t,e,i,s,r){var n=t.style,a="cssFloat"in n?"cssFloat":"styleFloat";return new fe(n,a,0,0,r,-1,i,!1,0,n[a],e)}});var Ee=function(t){var e,i=this.t,s=i.filter||Q(this.data,"filter")||"",r=0|this.s+this.c*t;100===r&&(-1===s.indexOf("atrix(")&&-1===s.indexOf("radient(")&&-1===s.indexOf("oader(")?(i.removeAttribute("filter"),e=!Q(this.data,"filter")):(i.filter=s.replace(b,""),e=!0)),e||(this.xn1&&(i.filter=s=s||"alpha(opacity="+r+")"),-1===s.indexOf("pacity")?0===r&&this.xn1||(i.filter=s+" alpha(opacity="+r+")"):i.filter=s.replace(w,"opacity="+r))};ve("opacity,alpha,autoAlpha",{defaultValue:"1",parser:function(t,e,i,s,n,a){var o=parseFloat(Q(t,"opacity",r,!1,"1")),h=t.style,l="autoAlpha"===i;return"string"==typeof e&&"="===e.charAt(1)&&(e=("-"===e.charAt(0)?-1:1)*parseFloat(e.substr(2))+o),l&&1===o&&"hidden"===Q(t,"visibility",r)&&0!==e&&(o=0),B?n=new fe(h,"opacity",o,e-o,n):(n=new fe(h,"opacity",100*o,100*(e-o),n),n.xn1=l?1:0,h.zoom=1,n.type=2,n.b="alpha(opacity="+n.s+")",n.e="alpha(opacity="+(n.s+n.c)+")",n.data=t,n.plugin=a,n.setRatio=Ee),l&&(n=new fe(h,"visibility",0,0,n,-1,null,!1,0,0!==o?"inherit":"hidden",0===e?"hidden":"inherit"),n.xs0="inherit",s._overwriteProps.push(n.n),s._overwriteProps.push(i)),n}});var Ne=function(t,e){e&&(t.removeProperty?("ms"===e.substr(0,2)&&(e="M"+e.substr(1)),t.removeProperty(e.replace(S,"-$1").toLowerCase())):t.removeAttribute(e))},Le=function(t){if(this.t._gsClassPT=this,1===t||0===t){this.t.setAttribute("class",0===t?this.b:this.e);for(var e=this.data,i=this.t.style;e;)e.v?i[e.p]=e.v:Ne(i,e.p),e=e._next;1===t&&this.t._gsClassPT===this&&(this.t._gsClassPT=null)}else this.t.getAttribute("class")!==this.e&&this.t.setAttribute("class",this.e)};ve("className",{parser:function(t,e,s,n,a,o,h){var l,_,u,p,c,f=t.getAttribute("class")||"",m=t.style.cssText;if(a=n._classNamePT=new fe(t,s,0,0,a,2),a.setRatio=Le,a.pr=-11,i=!0,a.b=f,_=K(t,r),u=t._gsClassPT){for(p={},c=u.data;c;)p[c.p]=1,c=c._next;u.setRatio(1)}return t._gsClassPT=a,a.e="="!==e.charAt(1)?e:f.replace(RegExp("\\s*\\b"+e.substr(2)+"\\b"),"")+("+"===e.charAt(0)?" "+e.substr(2):""),n._tween._duration&&(t.setAttribute("class",a.e),l=J(t,_,K(t),h,p),t.setAttribute("class",f),a.data=l.firstMPT,t.style.cssText=m,a=a.xfirst=n.parse(t,l.difs,a,o)),a}});var Xe=function(t){if((1===t||0===t)&&this.data._totalTime===this.data._totalDuration&&"isFromStart"!==this.data.data){var e,i,s,r,n=this.t.style,a=h.transform.parse;if("all"===this.e)n.cssText="",r=!0;else for(e=this.e.split(" ").join("").split(","),s=e.length;--s>-1;)i=e[s],h[i]&&(h[i].parse===a?r=!0:i="transformOrigin"===i?Pe:h[i].p),Ne(n,i);r&&(Ne(n,xe),this.t._gsTransform&&delete this.t._gsTransform)}};for(ve("clearProps",{parser:function(t,e,s,r,n){return n=new fe(t,s,0,0,n,2),n.setRatio=Xe,n.e=e,n.pr=-10,n.data=r._tween,i=!0,n}}),l="bezier,throwProps,physicsProps,physics2D".split(","),de=l.length;de--;)ye(l[de]);l=a.prototype,l._firstPT=l._lastParsedTransform=l._transform=null,l._onInitTween=function(t,e,o){if(!t.nodeType)return!1;
this._target=t,this._tween=o,this._vars=e,_=e.autoRound,i=!1,s=e.suffixMap||a.suffixMap,r=Z(t,""),n=this._overwriteProps;var h,l,c,m,d,g,v,y,T,w=t.style;if(u&&""===w.zIndex&&(h=Q(t,"zIndex",r),("auto"===h||""===h)&&this._addLazySet(w,"zIndex",0)),"string"==typeof e&&(m=w.cssText,h=K(t,r),w.cssText=m+";"+e,h=J(t,h,K(t)).difs,!B&&x.test(e)&&(h.opacity=parseFloat(RegExp.$1)),e=h,w.cssText=m),this._firstPT=l=this.parse(t,e,null),this._transformType){for(T=3===this._transformType,xe?p&&(u=!0,""===w.zIndex&&(v=Q(t,"zIndex",r),("auto"===v||""===v)&&this._addLazySet(w,"zIndex",0)),f&&this._addLazySet(w,"WebkitBackfaceVisibility",this._vars.WebkitBackfaceVisibility||(T?"visible":"hidden"))):w.zoom=1,c=l;c&&c._next;)c=c._next;y=new fe(t,"transform",0,0,null,2),this._linkCSSP(y,null,c),y.setRatio=T&&Se?Ie:xe?Fe:ze,y.data=this._transform||Me(t,r,!0),n.pop()}if(i){for(;l;){for(g=l._next,c=m;c&&c.pr>l.pr;)c=c._next;(l._prev=c?c._prev:d)?l._prev._next=l:m=l,(l._next=c)?c._prev=l:d=l,l=g}this._firstPT=m}return!0},l.parse=function(t,e,i,n){var a,o,l,u,p,c,f,m,d,g,v=t.style;for(a in e)c=e[a],o=h[a],o?i=o.parse(t,c,a,this,i,n,e):(p=Q(t,a,r)+"",d="string"==typeof c,"color"===a||"fill"===a||"stroke"===a||-1!==a.indexOf("Color")||d&&P.test(c)?(d||(c=le(c),c=(c.length>3?"rgba(":"rgb(")+c.join(",")+")"),i=me(v,a,p,c,!0,"transparent",i,0,n)):!d||-1===c.indexOf(" ")&&-1===c.indexOf(",")?(l=parseFloat(p),f=l||0===l?p.substr((l+"").length):"",(""===p||"auto"===p)&&("width"===a||"height"===a?(l=ie(t,a,r),f="px"):"left"===a||"top"===a?(l=H(t,a,r),f="px"):(l="opacity"!==a?0:1,f="")),g=d&&"="===c.charAt(1),g?(u=parseInt(c.charAt(0)+"1",10),c=c.substr(2),u*=parseFloat(c),m=c.replace(T,"")):(u=parseFloat(c),m=d?c.replace(T,""):""),""===m&&(m=a in s?s[a]:f),c=u||0===u?(g?u+l:u)+m:e[a],f!==m&&""!==m&&(u||0===u)&&l&&(l=$(t,a,l,f),"%"===m?(l/=$(t,a,100,"%")/100,e.strictUnits!==!0&&(p=l+"%")):"em"===m?l/=$(t,a,1,"em"):"px"!==m&&(u=$(t,a,u,m),m="px"),g&&(u||0===u)&&(c=u+l+m)),g&&(u+=l),!l&&0!==l||!u&&0!==u?void 0!==v[a]&&(c||"NaN"!=c+""&&null!=c)?(i=new fe(v,a,u||l||0,0,i,-1,a,!1,0,p,c),i.xs0="none"!==c||"display"!==a&&-1===a.indexOf("Style")?c:p):q("invalid "+a+" tween value: "+e[a]):(i=new fe(v,a,l,u-l,i,0,a,_!==!1&&("px"===m||"zIndex"===a),0,p,c),i.xs0=m)):i=me(v,a,p,c,!0,null,i,0,n)),n&&i&&!i.plugin&&(i.plugin=n);return i},l.setRatio=function(t){var e,i,s,r=this._firstPT,n=1e-6;if(1!==t||this._tween._time!==this._tween._duration&&0!==this._tween._time)if(t||this._tween._time!==this._tween._duration&&0!==this._tween._time||this._tween._rawPrevTime===-1e-6)for(;r;){if(e=r.c*t+r.s,r.r?e=Math.round(e):n>e&&e>-n&&(e=0),r.type)if(1===r.type)if(s=r.l,2===s)r.t[r.p]=r.xs0+e+r.xs1+r.xn1+r.xs2;else if(3===s)r.t[r.p]=r.xs0+e+r.xs1+r.xn1+r.xs2+r.xn2+r.xs3;else if(4===s)r.t[r.p]=r.xs0+e+r.xs1+r.xn1+r.xs2+r.xn2+r.xs3+r.xn3+r.xs4;else if(5===s)r.t[r.p]=r.xs0+e+r.xs1+r.xn1+r.xs2+r.xn2+r.xs3+r.xn3+r.xs4+r.xn4+r.xs5;else{for(i=r.xs0+e+r.xs1,s=1;r.l>s;s++)i+=r["xn"+s]+r["xs"+(s+1)];r.t[r.p]=i}else-1===r.type?r.t[r.p]=r.xs0:r.setRatio&&r.setRatio(t);else r.t[r.p]=e+r.xs0;r=r._next}else for(;r;)2!==r.type?r.t[r.p]=r.b:r.setRatio(t),r=r._next;else for(;r;)2!==r.type?r.t[r.p]=r.e:r.setRatio(t),r=r._next},l._enableTransforms=function(t){this._transform=this._transform||Me(this._target,r,!0),this._transformType=this._transform.svg&&Te||!t&&3!==this._transformType?2:3};var Ue=function(){this.t[this.p]=this.e,this.data._linkCSSP(this,this._next,null,!0)};l._addLazySet=function(t,e,i){var s=this._firstPT=new fe(t,e,0,0,this._firstPT,2);s.e=i,s.setRatio=Ue,s.data=this},l._linkCSSP=function(t,e,i,s){return t&&(e&&(e._prev=t),t._next&&(t._next._prev=t._prev),t._prev?t._prev._next=t._next:this._firstPT===t&&(this._firstPT=t._next,s=!0),i?i._next=t:s||null!==this._firstPT||(this._firstPT=t),t._next=e,t._prev=i),t},l._kill=function(e){var i,s,r,n=e;if(e.autoAlpha||e.alpha){n={};for(s in e)n[s]=e[s];n.opacity=1,n.autoAlpha&&(n.visibility=1)}return e.className&&(i=this._classNamePT)&&(r=i.xfirst,r&&r._prev?this._linkCSSP(r._prev,i._next,r._prev._prev):r===this._firstPT&&(this._firstPT=i._next),i._next&&this._linkCSSP(i._next,i._next._next,r._prev),this._classNamePT=null),t.prototype._kill.call(this,n)};var Ye=function(t,e,i){var s,r,n,a;if(t.slice)for(r=t.length;--r>-1;)Ye(t[r],e,i);else for(s=t.childNodes,r=s.length;--r>-1;)n=s[r],a=n.type,n.style&&(e.push(K(n)),i&&i.push(n)),1!==a&&9!==a&&11!==a||!n.childNodes.length||Ye(n,e,i)};return a.cascadeTo=function(t,i,s){var r,n,a,o=e.to(t,i,s),h=[o],l=[],_=[],u=[],p=e._internals.reservedProps;for(t=o._targets||o.target,Ye(t,l,u),o.render(i,!0),Ye(t,_),o.render(0,!0),o._enabled(!0),r=u.length;--r>-1;)if(n=J(u[r],l[r],_[r]),n.firstMPT){n=n.difs;for(a in s)p[a]&&(n[a]=s[a]);h.push(e.to(u[r],i,n))}return h},t.activate([a]),a},!0),function(){var t=_gsScope._gsDefine.plugin({propName:"roundProps",priority:-1,API:2,init:function(t,e,i){return this._tween=i,!0}}),e=t.prototype;e._onInitAllProps=function(){for(var t,e,i,s=this._tween,r=s.vars.roundProps instanceof Array?s.vars.roundProps:s.vars.roundProps.split(","),n=r.length,a={},o=s._propLookup.roundProps;--n>-1;)a[r[n]]=1;for(n=r.length;--n>-1;)for(t=r[n],e=s._firstPT;e;)i=e._next,e.pg?e.t._roundProps(a,!0):e.n===t&&(this._add(e.t,t,e.s,e.c),i&&(i._prev=e._prev),e._prev?e._prev._next=i:s._firstPT===e&&(s._firstPT=i),e._next=e._prev=null,s._propLookup[t]=o),e=i;return!1},e._add=function(t,e,i,s){this._addTween(t,e,i,i+s,e,!0),this._overwriteProps.push(e)}}(),_gsScope._gsDefine.plugin({propName:"attr",API:2,version:"0.3.3",init:function(t,e){var i,s,r;if("function"!=typeof t.setAttribute)return!1;this._target=t,this._proxy={},this._start={},this._end={};for(i in e)this._start[i]=this._proxy[i]=s=t.getAttribute(i),r=this._addTween(this._proxy,i,parseFloat(s),e[i],i),this._end[i]=r?r.s+r.c:e[i],this._overwriteProps.push(i);return!0},set:function(t){this._super.setRatio.call(this,t);for(var e,i=this._overwriteProps,s=i.length,r=1===t?this._end:t?this._proxy:this._start;--s>-1;)e=i[s],this._target.setAttribute(e,r[e]+"")}}),_gsScope._gsDefine.plugin({propName:"directionalRotation",version:"0.2.1",API:2,init:function(t,e){"object"!=typeof e&&(e={rotation:e}),this.finals={};var i,s,r,n,a,o,h=e.useRadians===!0?2*Math.PI:360,l=1e-6;for(i in e)"useRadians"!==i&&(o=(e[i]+"").split("_"),s=o[0],r=parseFloat("function"!=typeof t[i]?t[i]:t[i.indexOf("set")||"function"!=typeof t["get"+i.substr(3)]?i:"get"+i.substr(3)]()),n=this.finals[i]="string"==typeof s&&"="===s.charAt(1)?r+parseInt(s.charAt(0)+"1",10)*Number(s.substr(2)):Number(s)||0,a=n-r,o.length&&(s=o.join("_"),-1!==s.indexOf("short")&&(a%=h,a!==a%(h/2)&&(a=0>a?a+h:a-h)),-1!==s.indexOf("_cw")&&0>a?a=(a+9999999999*h)%h-(0|a/h)*h:-1!==s.indexOf("ccw")&&a>0&&(a=(a-9999999999*h)%h-(0|a/h)*h)),(a>l||-l>a)&&(this._addTween(t,i,r,r+a,i),this._overwriteProps.push(i)));return!0},set:function(t){var e;if(1!==t)this._super.setRatio.call(this,t);else for(e=this._firstPT;e;)e.f?e.t[e.p](this.finals[e.p]):e.t[e.p]=this.finals[e.p],e=e._next}})._autoCSS=!0,_gsScope._gsDefine("easing.Back",["easing.Ease"],function(t){var e,i,s,r=_gsScope.GreenSockGlobals||_gsScope,n=r.com.greensock,a=2*Math.PI,o=Math.PI/2,h=n._class,l=function(e,i){var s=h("easing."+e,function(){},!0),r=s.prototype=new t;return r.constructor=s,r.getRatio=i,s},_=t.register||function(){},u=function(t,e,i,s){var r=h("easing."+t,{easeOut:new e,easeIn:new i,easeInOut:new s},!0);return _(r,t),r},p=function(t,e,i){this.t=t,this.v=e,i&&(this.next=i,i.prev=this,this.c=i.v-e,this.gap=i.t-t)},c=function(e,i){var s=h("easing."+e,function(t){this._p1=t||0===t?t:1.70158,this._p2=1.525*this._p1},!0),r=s.prototype=new t;return r.constructor=s,r.getRatio=i,r.config=function(t){return new s(t)},s},f=u("Back",c("BackOut",function(t){return(t-=1)*t*((this._p1+1)*t+this._p1)+1}),c("BackIn",function(t){return t*t*((this._p1+1)*t-this._p1)}),c("BackInOut",function(t){return 1>(t*=2)?.5*t*t*((this._p2+1)*t-this._p2):.5*((t-=2)*t*((this._p2+1)*t+this._p2)+2)})),m=h("easing.SlowMo",function(t,e,i){e=e||0===e?e:.7,null==t?t=.7:t>1&&(t=1),this._p=1!==t?e:0,this._p1=(1-t)/2,this._p2=t,this._p3=this._p1+this._p2,this._calcEnd=i===!0},!0),d=m.prototype=new t;return d.constructor=m,d.getRatio=function(t){var e=t+(.5-t)*this._p;return this._p1>t?this._calcEnd?1-(t=1-t/this._p1)*t:e-(t=1-t/this._p1)*t*t*t*e:t>this._p3?this._calcEnd?1-(t=(t-this._p3)/this._p1)*t:e+(t-e)*(t=(t-this._p3)/this._p1)*t*t*t:this._calcEnd?1:e},m.ease=new m(.7,.7),d.config=m.config=function(t,e,i){return new m(t,e,i)},e=h("easing.SteppedEase",function(t){t=t||1,this._p1=1/t,this._p2=t+1},!0),d=e.prototype=new t,d.constructor=e,d.getRatio=function(t){return 0>t?t=0:t>=1&&(t=.999999999),(this._p2*t>>0)*this._p1},d.config=e.config=function(t){return new e(t)},i=h("easing.RoughEase",function(e){e=e||{};for(var i,s,r,n,a,o,h=e.taper||"none",l=[],_=0,u=0|(e.points||20),c=u,f=e.randomize!==!1,m=e.clamp===!0,d=e.template instanceof t?e.template:null,g="number"==typeof e.strength?.4*e.strength:.4;--c>-1;)i=f?Math.random():1/u*c,s=d?d.getRatio(i):i,"none"===h?r=g:"out"===h?(n=1-i,r=n*n*g):"in"===h?r=i*i*g:.5>i?(n=2*i,r=.5*n*n*g):(n=2*(1-i),r=.5*n*n*g),f?s+=Math.random()*r-.5*r:c%2?s+=.5*r:s-=.5*r,m&&(s>1?s=1:0>s&&(s=0)),l[_++]={x:i,y:s};for(l.sort(function(t,e){return t.x-e.x}),o=new p(1,1,null),c=u;--c>-1;)a=l[c],o=new p(a.x,a.y,o);this._prev=new p(0,0,0!==o.t?o:o.next)},!0),d=i.prototype=new t,d.constructor=i,d.getRatio=function(t){var e=this._prev;if(t>e.t){for(;e.next&&t>=e.t;)e=e.next;e=e.prev}else for(;e.prev&&e.t>=t;)e=e.prev;return this._prev=e,e.v+(t-e.t)/e.gap*e.c},d.config=function(t){return new i(t)},i.ease=new i,u("Bounce",l("BounceOut",function(t){return 1/2.75>t?7.5625*t*t:2/2.75>t?7.5625*(t-=1.5/2.75)*t+.75:2.5/2.75>t?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375}),l("BounceIn",function(t){return 1/2.75>(t=1-t)?1-7.5625*t*t:2/2.75>t?1-(7.5625*(t-=1.5/2.75)*t+.75):2.5/2.75>t?1-(7.5625*(t-=2.25/2.75)*t+.9375):1-(7.5625*(t-=2.625/2.75)*t+.984375)}),l("BounceInOut",function(t){var e=.5>t;return t=e?1-2*t:2*t-1,t=1/2.75>t?7.5625*t*t:2/2.75>t?7.5625*(t-=1.5/2.75)*t+.75:2.5/2.75>t?7.5625*(t-=2.25/2.75)*t+.9375:7.5625*(t-=2.625/2.75)*t+.984375,e?.5*(1-t):.5*t+.5})),u("Circ",l("CircOut",function(t){return Math.sqrt(1-(t-=1)*t)}),l("CircIn",function(t){return-(Math.sqrt(1-t*t)-1)}),l("CircInOut",function(t){return 1>(t*=2)?-.5*(Math.sqrt(1-t*t)-1):.5*(Math.sqrt(1-(t-=2)*t)+1)})),s=function(e,i,s){var r=h("easing."+e,function(t,e){this._p1=t||1,this._p2=e||s,this._p3=this._p2/a*(Math.asin(1/this._p1)||0)},!0),n=r.prototype=new t;return n.constructor=r,n.getRatio=i,n.config=function(t,e){return new r(t,e)},r},u("Elastic",s("ElasticOut",function(t){return this._p1*Math.pow(2,-10*t)*Math.sin((t-this._p3)*a/this._p2)+1},.3),s("ElasticIn",function(t){return-(this._p1*Math.pow(2,10*(t-=1))*Math.sin((t-this._p3)*a/this._p2))},.3),s("ElasticInOut",function(t){return 1>(t*=2)?-.5*this._p1*Math.pow(2,10*(t-=1))*Math.sin((t-this._p3)*a/this._p2):.5*this._p1*Math.pow(2,-10*(t-=1))*Math.sin((t-this._p3)*a/this._p2)+1},.45)),u("Expo",l("ExpoOut",function(t){return 1-Math.pow(2,-10*t)}),l("ExpoIn",function(t){return Math.pow(2,10*(t-1))-.001}),l("ExpoInOut",function(t){return 1>(t*=2)?.5*Math.pow(2,10*(t-1)):.5*(2-Math.pow(2,-10*(t-1)))})),u("Sine",l("SineOut",function(t){return Math.sin(t*o)}),l("SineIn",function(t){return-Math.cos(t*o)+1}),l("SineInOut",function(t){return-.5*(Math.cos(Math.PI*t)-1)})),h("easing.EaseLookup",{find:function(e){return t.map[e]}},!0),_(r.SlowMo,"SlowMo","ease,"),_(i,"RoughEase","ease,"),_(e,"SteppedEase","ease,"),f},!0)}),_gsScope._gsDefine&&_gsScope._gsQueue.pop()(),function(t,e){"use strict";var i=t.GreenSockGlobals=t.GreenSockGlobals||t;if(!i.TweenLite){var s,r,n,a,o,h=function(t){var e,s=t.split("."),r=i;for(e=0;s.length>e;e++)r[s[e]]=r=r[s[e]]||{};return r},l=h("com.greensock"),_=1e-10,u=function(t){var e,i=[],s=t.length;for(e=0;e!==s;i.push(t[e++]));return i},p=function(){},c=function(){var t=Object.prototype.toString,e=t.call([]);return function(i){return null!=i&&(i instanceof Array||"object"==typeof i&&!!i.push&&t.call(i)===e)}}(),f={},m=function(s,r,n,a){this.sc=f[s]?f[s].sc:[],f[s]=this,this.gsClass=null,this.func=n;var o=[];this.check=function(l){for(var _,u,p,c,d=r.length,g=d;--d>-1;)(_=f[r[d]]||new m(r[d],[])).gsClass?(o[d]=_.gsClass,g--):l&&_.sc.push(this);if(0===g&&n)for(u=("com.greensock."+s).split("."),p=u.pop(),c=h(u.join("."))[p]=this.gsClass=n.apply(n,o),a&&(i[p]=c,"function"==typeof define&&define.amd?define((t.GreenSockAMDPath?t.GreenSockAMDPath+"/":"")+s.split(".").pop(),[],function(){return c}):s===e&&"undefined"!=typeof module&&module.exports&&(module.exports=c)),d=0;this.sc.length>d;d++)this.sc[d].check()},this.check(!0)},d=t._gsDefine=function(t,e,i,s){return new m(t,e,i,s)},g=l._class=function(t,e,i){return e=e||function(){},d(t,[],function(){return e},i),e};d.globals=i;var v=[0,0,1,1],y=[],T=g("easing.Ease",function(t,e,i,s){this._func=t,this._type=i||0,this._power=s||0,this._params=e?v.concat(e):v},!0),w=T.map={},x=T.register=function(t,e,i,s){for(var r,n,a,o,h=e.split(","),_=h.length,u=(i||"easeIn,easeOut,easeInOut").split(",");--_>-1;)for(n=h[_],r=s?g("easing."+n,null,!0):l.easing[n]||{},a=u.length;--a>-1;)o=u[a],w[n+"."+o]=w[o+n]=r[o]=t.getRatio?t:t[o]||new t};for(n=T.prototype,n._calcEnd=!1,n.getRatio=function(t){if(this._func)return this._params[0]=t,this._func.apply(null,this._params);var e=this._type,i=this._power,s=1===e?1-t:2===e?t:.5>t?2*t:2*(1-t);return 1===i?s*=s:2===i?s*=s*s:3===i?s*=s*s*s:4===i&&(s*=s*s*s*s),1===e?1-s:2===e?s:.5>t?s/2:1-s/2},s=["Linear","Quad","Cubic","Quart","Quint,Strong"],r=s.length;--r>-1;)n=s[r]+",Power"+r,x(new T(null,null,1,r),n,"easeOut",!0),x(new T(null,null,2,r),n,"easeIn"+(0===r?",easeNone":"")),x(new T(null,null,3,r),n,"easeInOut");w.linear=l.easing.Linear.easeIn,w.swing=l.easing.Quad.easeInOut;var b=g("events.EventDispatcher",function(t){this._listeners={},this._eventTarget=t||this});n=b.prototype,n.addEventListener=function(t,e,i,s,r){r=r||0;var n,h,l=this._listeners[t],_=0;for(null==l&&(this._listeners[t]=l=[]),h=l.length;--h>-1;)n=l[h],n.c===e&&n.s===i?l.splice(h,1):0===_&&r>n.pr&&(_=h+1);l.splice(_,0,{c:e,s:i,up:s,pr:r}),this!==a||o||a.wake()},n.removeEventListener=function(t,e){var i,s=this._listeners[t];if(s)for(i=s.length;--i>-1;)if(s[i].c===e)return s.splice(i,1),void 0},n.dispatchEvent=function(t){var e,i,s,r=this._listeners[t];if(r)for(e=r.length,i=this._eventTarget;--e>-1;)s=r[e],s&&(s.up?s.c.call(s.s||i,{type:t,target:i}):s.c.call(s.s||i))};var P=t.requestAnimationFrame,S=t.cancelAnimationFrame,k=Date.now||function(){return(new Date).getTime()},R=k();for(s=["ms","moz","webkit","o"],r=s.length;--r>-1&&!P;)P=t[s[r]+"RequestAnimationFrame"],S=t[s[r]+"CancelAnimationFrame"]||t[s[r]+"CancelRequestAnimationFrame"];g("Ticker",function(t,e){var i,s,r,n,h,l=this,u=k(),c=e!==!1&&P,f=500,m=33,d="tick",g=function(t){var e,a,o=k()-R;o>f&&(u+=o-m),R+=o,l.time=(R-u)/1e3,e=l.time-h,(!i||e>0||t===!0)&&(l.frame++,h+=e+(e>=n?.004:n-e),a=!0),t!==!0&&(r=s(g)),a&&l.dispatchEvent(d)};b.call(l),l.time=l.frame=0,l.tick=function(){g(!0)},l.lagSmoothing=function(t,e){f=t||1/_,m=Math.min(e,f,0)},l.sleep=function(){null!=r&&(c&&S?S(r):clearTimeout(r),s=p,r=null,l===a&&(o=!1))},l.wake=function(){null!==r?l.sleep():l.frame>10&&(R=k()-f+5),s=0===i?p:c&&P?P:function(t){return setTimeout(t,0|1e3*(h-l.time)+1)},l===a&&(o=!0),g(2)},l.fps=function(t){return arguments.length?(i=t,n=1/(i||60),h=this.time+n,l.wake(),void 0):i},l.useRAF=function(t){return arguments.length?(l.sleep(),c=t,l.fps(i),void 0):c},l.fps(t),setTimeout(function(){c&&(!r||5>l.frame)&&l.useRAF(!1)},1500)}),n=l.Ticker.prototype=new l.events.EventDispatcher,n.constructor=l.Ticker;var A=g("core.Animation",function(t,e){if(this.vars=e=e||{},this._duration=this._totalDuration=t||0,this._delay=Number(e.delay)||0,this._timeScale=1,this._active=e.immediateRender===!0,this.data=e.data,this._reversed=e.reversed===!0,j){o||a.wake();var i=this.vars.useFrames?B:j;i.add(this,i._time),this.vars.paused&&this.paused(!0)}});a=A.ticker=new l.Ticker,n=A.prototype,n._dirty=n._gc=n._initted=n._paused=!1,n._totalTime=n._time=0,n._rawPrevTime=-1,n._next=n._last=n._onUpdate=n._timeline=n.timeline=null,n._paused=!1;var C=function(){o&&k()-R>2e3&&a.wake(),setTimeout(C,2e3)};C(),n.play=function(t,e){return null!=t&&this.seek(t,e),this.reversed(!1).paused(!1)},n.pause=function(t,e){return null!=t&&this.seek(t,e),this.paused(!0)},n.resume=function(t,e){return null!=t&&this.seek(t,e),this.paused(!1)},n.seek=function(t,e){return this.totalTime(Number(t),e!==!1)},n.restart=function(t,e){return this.reversed(!1).paused(!1).totalTime(t?-this._delay:0,e!==!1,!0)},n.reverse=function(t,e){return null!=t&&this.seek(t||this.totalDuration(),e),this.reversed(!0).paused(!1)},n.render=function(){},n.invalidate=function(){return this._time=this._totalTime=0,this._initted=this._gc=!1,this._rawPrevTime=-1,(this._gc||!this.timeline)&&this._enabled(!0),this},n.isActive=function(){var t,e=this._timeline,i=this._startTime;return!e||!this._gc&&!this._paused&&e.isActive()&&(t=e.rawTime())>=i&&i+this.totalDuration()/this._timeScale>t},n._enabled=function(t,e){return o||a.wake(),this._gc=!t,this._active=this.isActive(),e!==!0&&(t&&!this.timeline?this._timeline.add(this,this._startTime-this._delay):!t&&this.timeline&&this._timeline._remove(this,!0)),!1},n._kill=function(){return this._enabled(!1,!1)},n.kill=function(t,e){return this._kill(t,e),this},n._uncache=function(t){for(var e=t?this:this.timeline;e;)e._dirty=!0,e=e.timeline;return this},n._swapSelfInParams=function(t){for(var e=t.length,i=t.concat();--e>-1;)"{self}"===t[e]&&(i[e]=this);return i},n.eventCallback=function(t,e,i,s){if("on"===(t||"").substr(0,2)){var r=this.vars;if(1===arguments.length)return r[t];null==e?delete r[t]:(r[t]=e,r[t+"Params"]=c(i)&&-1!==i.join("").indexOf("{self}")?this._swapSelfInParams(i):i,r[t+"Scope"]=s),"onUpdate"===t&&(this._onUpdate=e)}return this},n.delay=function(t){return arguments.length?(this._timeline.smoothChildTiming&&this.startTime(this._startTime+t-this._delay),this._delay=t,this):this._delay},n.duration=function(t){return arguments.length?(this._duration=this._totalDuration=t,this._uncache(!0),this._timeline.smoothChildTiming&&this._time>0&&this._time<this._duration&&0!==t&&this.totalTime(this._totalTime*(t/this._duration),!0),this):(this._dirty=!1,this._duration)},n.totalDuration=function(t){return this._dirty=!1,arguments.length?this.duration(t):this._totalDuration},n.time=function(t,e){return arguments.length?(this._dirty&&this.totalDuration(),this.totalTime(t>this._duration?this._duration:t,e)):this._time},n.totalTime=function(t,e,i){if(o||a.wake(),!arguments.length)return this._totalTime;if(this._timeline){if(0>t&&!i&&(t+=this.totalDuration()),this._timeline.smoothChildTiming){this._dirty&&this.totalDuration();var s=this._totalDuration,r=this._timeline;if(t>s&&!i&&(t=s),this._startTime=(this._paused?this._pauseTime:r._time)-(this._reversed?s-t:t)/this._timeScale,r._dirty||this._uncache(!1),r._timeline)for(;r._timeline;)r._timeline._time!==(r._startTime+r._totalTime)/r._timeScale&&r.totalTime(r._totalTime,!0),r=r._timeline}this._gc&&this._enabled(!0,!1),(this._totalTime!==t||0===this._duration)&&(this.render(t,e,!1),I.length&&q())}return this},n.progress=n.totalProgress=function(t,e){return arguments.length?this.totalTime(this.duration()*t,e):this._time/this.duration()},n.startTime=function(t){return arguments.length?(t!==this._startTime&&(this._startTime=t,this.timeline&&this.timeline._sortChildren&&this.timeline.add(this,t-this._delay)),this):this._startTime},n.endTime=function(t){return this._startTime+(0!=t?this.totalDuration():this.duration())/this._timeScale},n.timeScale=function(t){if(!arguments.length)return this._timeScale;if(t=t||_,this._timeline&&this._timeline.smoothChildTiming){var e=this._pauseTime,i=e||0===e?e:this._timeline.totalTime();this._startTime=i-(i-this._startTime)*this._timeScale/t}return this._timeScale=t,this._uncache(!1)},n.reversed=function(t){return arguments.length?(t!=this._reversed&&(this._reversed=t,this.totalTime(this._timeline&&!this._timeline.smoothChildTiming?this.totalDuration()-this._totalTime:this._totalTime,!0)),this):this._reversed},n.paused=function(t){if(!arguments.length)return this._paused;if(t!=this._paused&&this._timeline){o||t||a.wake();var e=this._timeline,i=e.rawTime(),s=i-this._pauseTime;!t&&e.smoothChildTiming&&(this._startTime+=s,this._uncache(!1)),this._pauseTime=t?i:null,this._paused=t,this._active=this.isActive(),!t&&0!==s&&this._initted&&this.duration()&&this.render(e.smoothChildTiming?this._totalTime:(i-this._startTime)/this._timeScale,!0,!0)}return this._gc&&!t&&this._enabled(!0,!1),this};var O=g("core.SimpleTimeline",function(t){A.call(this,0,t),this.autoRemoveChildren=this.smoothChildTiming=!0});n=O.prototype=new A,n.constructor=O,n.kill()._gc=!1,n._first=n._last=n._recent=null,n._sortChildren=!1,n.add=n.insert=function(t,e){var i,s;if(t._startTime=Number(e||0)+t._delay,t._paused&&this!==t._timeline&&(t._pauseTime=t._startTime+(this.rawTime()-t._startTime)/t._timeScale),t.timeline&&t.timeline._remove(t,!0),t.timeline=t._timeline=this,t._gc&&t._enabled(!0,!0),i=this._last,this._sortChildren)for(s=t._startTime;i&&i._startTime>s;)i=i._prev;return i?(t._next=i._next,i._next=t):(t._next=this._first,this._first=t),t._next?t._next._prev=t:this._last=t,t._prev=i,this._recent=t,this._timeline&&this._uncache(!0),this},n._remove=function(t,e){return t.timeline===this&&(e||t._enabled(!1,!0),t._prev?t._prev._next=t._next:this._first===t&&(this._first=t._next),t._next?t._next._prev=t._prev:this._last===t&&(this._last=t._prev),t._next=t._prev=t.timeline=null,t===this._recent&&(this._recent=this._last),this._timeline&&this._uncache(!0)),this},n.render=function(t,e,i){var s,r=this._first;for(this._totalTime=this._time=this._rawPrevTime=t;r;)s=r._next,(r._active||t>=r._startTime&&!r._paused)&&(r._reversed?r.render((r._dirty?r.totalDuration():r._totalDuration)-(t-r._startTime)*r._timeScale,e,i):r.render((t-r._startTime)*r._timeScale,e,i)),r=s},n.rawTime=function(){return o||a.wake(),this._totalTime};var D=g("TweenLite",function(e,i,s){if(A.call(this,i,s),this.render=D.prototype.render,null==e)throw"Cannot tween a null target.";this.target=e="string"!=typeof e?e:D.selector(e)||e;var r,n,a,o=e.jquery||e.length&&e!==t&&e[0]&&(e[0]===t||e[0].nodeType&&e[0].style&&!e.nodeType),h=this.vars.overwrite;if(this._overwrite=h=null==h?Y[D.defaultOverwrite]:"number"==typeof h?h>>0:Y[h],(o||e instanceof Array||e.push&&c(e))&&"number"!=typeof e[0])for(this._targets=a=u(e),this._propLookup=[],this._siblings=[],r=0;a.length>r;r++)n=a[r],n?"string"!=typeof n?n.length&&n!==t&&n[0]&&(n[0]===t||n[0].nodeType&&n[0].style&&!n.nodeType)?(a.splice(r--,1),this._targets=a=a.concat(u(n))):(this._siblings[r]=V(n,this,!1),1===h&&this._siblings[r].length>1&&W(n,this,null,1,this._siblings[r])):(n=a[r--]=D.selector(n),"string"==typeof n&&a.splice(r+1,1)):a.splice(r--,1);else this._propLookup={},this._siblings=V(e,this,!1),1===h&&this._siblings.length>1&&W(e,this,null,1,this._siblings);(this.vars.immediateRender||0===i&&0===this._delay&&this.vars.immediateRender!==!1)&&(this._time=-_,this.render(-this._delay))},!0),M=function(e){return e&&e.length&&e!==t&&e[0]&&(e[0]===t||e[0].nodeType&&e[0].style&&!e.nodeType)},z=function(t,e){var i,s={};for(i in t)U[i]||i in e&&"transform"!==i&&"x"!==i&&"y"!==i&&"width"!==i&&"height"!==i&&"className"!==i&&"border"!==i||!(!N[i]||N[i]&&N[i]._autoCSS)||(s[i]=t[i],delete t[i]);t.css=s};n=D.prototype=new A,n.constructor=D,n.kill()._gc=!1,n.ratio=0,n._firstPT=n._targets=n._overwrittenProps=n._startAt=null,n._notifyPluginsOfEnabled=n._lazy=!1,D.version="1.15.1",D.defaultEase=n._ease=new T(null,null,1,1),D.defaultOverwrite="auto",D.ticker=a,D.autoSleep=!0,D.lagSmoothing=function(t,e){a.lagSmoothing(t,e)},D.selector=t.$||t.jQuery||function(e){var i=t.$||t.jQuery;return i?(D.selector=i,i(e)):"undefined"==typeof document?e:document.querySelectorAll?document.querySelectorAll(e):document.getElementById("#"===e.charAt(0)?e.substr(1):e)};var I=[],F={},E=D._internals={isArray:c,isSelector:M,lazyTweens:I},N=D._plugins={},L=E.tweenLookup={},X=0,U=E.reservedProps={ease:1,delay:1,overwrite:1,onComplete:1,onCompleteParams:1,onCompleteScope:1,useFrames:1,runBackwards:1,startAt:1,onUpdate:1,onUpdateParams:1,onUpdateScope:1,onStart:1,onStartParams:1,onStartScope:1,onReverseComplete:1,onReverseCompleteParams:1,onReverseCompleteScope:1,onRepeat:1,onRepeatParams:1,onRepeatScope:1,easeParams:1,yoyo:1,immediateRender:1,repeat:1,repeatDelay:1,data:1,paused:1,reversed:1,autoCSS:1,lazy:1,onOverwrite:1},Y={none:0,all:1,auto:2,concurrent:3,allOnStart:4,preexisting:5,"true":1,"false":0},B=A._rootFramesTimeline=new O,j=A._rootTimeline=new O,q=E.lazyRender=function(){var t,e=I.length;for(F={};--e>-1;)t=I[e],t&&t._lazy!==!1&&(t.render(t._lazy[0],t._lazy[1],!0),t._lazy=!1);I.length=0};j._startTime=a.time,B._startTime=a.frame,j._active=B._active=!0,setTimeout(q,1),A._updateRoot=D.render=function(){var t,e,i;if(I.length&&q(),j.render((a.time-j._startTime)*j._timeScale,!1,!1),B.render((a.frame-B._startTime)*B._timeScale,!1,!1),I.length&&q(),!(a.frame%120)){for(i in L){for(e=L[i].tweens,t=e.length;--t>-1;)e[t]._gc&&e.splice(t,1);0===e.length&&delete L[i]}if(i=j._first,(!i||i._paused)&&D.autoSleep&&!B._first&&1===a._listeners.tick.length){for(;i&&i._paused;)i=i._next;i||a.sleep()}}},a.addEventListener("tick",A._updateRoot);var V=function(t,e,i){var s,r,n=t._gsTweenID;if(L[n||(t._gsTweenID=n="t"+X++)]||(L[n]={target:t,tweens:[]}),e&&(s=L[n].tweens,s[r=s.length]=e,i))for(;--r>-1;)s[r]===e&&s.splice(r,1);return L[n].tweens},G=function(t,e,i,s){var r,n,a=t.vars.onOverwrite;return a&&(r=a(t,e,i,s)),a=D.onOverwrite,a&&(n=a(t,e,i,s)),r!==!1&&n!==!1},W=function(t,e,i,s,r){var n,a,o,h;if(1===s||s>=4){for(h=r.length,n=0;h>n;n++)if((o=r[n])!==e)o._gc||G(o,e)&&o._enabled(!1,!1)&&(a=!0);else if(5===s)break;return a}var l,u=e._startTime+_,p=[],c=0,f=0===e._duration;for(n=r.length;--n>-1;)(o=r[n])===e||o._gc||o._paused||(o._timeline!==e._timeline?(l=l||Z(e,0,f),0===Z(o,l,f)&&(p[c++]=o)):u>=o._startTime&&o._startTime+o.totalDuration()/o._timeScale>u&&((f||!o._initted)&&2e-10>=u-o._startTime||(p[c++]=o)));for(n=c;--n>-1;)if(o=p[n],2===s&&o._kill(i,t,e)&&(a=!0),2!==s||!o._firstPT&&o._initted){if(2!==s&&!G(o,e))continue;o._enabled(!1,!1)&&(a=!0)}return a},Z=function(t,e,i){for(var s=t._timeline,r=s._timeScale,n=t._startTime;s._timeline;){if(n+=s._startTime,r*=s._timeScale,s._paused)return-100;s=s._timeline}return n/=r,n>e?n-e:i&&n===e||!t._initted&&2*_>n-e?_:(n+=t.totalDuration()/t._timeScale/r)>e+_?0:n-e-_};n._init=function(){var t,e,i,s,r,n=this.vars,a=this._overwrittenProps,o=this._duration,h=!!n.immediateRender,l=n.ease;if(n.startAt){this._startAt&&(this._startAt.render(-1,!0),this._startAt.kill()),r={};for(s in n.startAt)r[s]=n.startAt[s];if(r.overwrite=!1,r.immediateRender=!0,r.lazy=h&&n.lazy!==!1,r.startAt=r.delay=null,this._startAt=D.to(this.target,0,r),h)if(this._time>0)this._startAt=null;else if(0!==o)return}else if(n.runBackwards&&0!==o)if(this._startAt)this._startAt.render(-1,!0),this._startAt.kill(),this._startAt=null;else{0!==this._time&&(h=!1),i={};for(s in n)U[s]&&"autoCSS"!==s||(i[s]=n[s]);if(i.overwrite=0,i.data="isFromStart",i.lazy=h&&n.lazy!==!1,i.immediateRender=h,this._startAt=D.to(this.target,0,i),h){if(0===this._time)return}else this._startAt._init(),this._startAt._enabled(!1),this.vars.immediateRender&&(this._startAt=null)}if(this._ease=l=l?l instanceof T?l:"function"==typeof l?new T(l,n.easeParams):w[l]||D.defaultEase:D.defaultEase,n.easeParams instanceof Array&&l.config&&(this._ease=l.config.apply(l,n.easeParams)),this._easeType=this._ease._type,this._easePower=this._ease._power,this._firstPT=null,this._targets)for(t=this._targets.length;--t>-1;)this._initProps(this._targets[t],this._propLookup[t]={},this._siblings[t],a?a[t]:null)&&(e=!0);else e=this._initProps(this.target,this._propLookup,this._siblings,a);if(e&&D._onPluginEvent("_onInitAllProps",this),a&&(this._firstPT||"function"!=typeof this.target&&this._enabled(!1,!1)),n.runBackwards)for(i=this._firstPT;i;)i.s+=i.c,i.c=-i.c,i=i._next;this._onUpdate=n.onUpdate,this._initted=!0},n._initProps=function(e,i,s,r){var n,a,o,h,l,_;if(null==e)return!1;F[e._gsTweenID]&&q(),this.vars.css||e.style&&e!==t&&e.nodeType&&N.css&&this.vars.autoCSS!==!1&&z(this.vars,e);for(n in this.vars){if(_=this.vars[n],U[n])_&&(_ instanceof Array||_.push&&c(_))&&-1!==_.join("").indexOf("{self}")&&(this.vars[n]=_=this._swapSelfInParams(_,this));else if(N[n]&&(h=new N[n])._onInitTween(e,this.vars[n],this)){for(this._firstPT=l={_next:this._firstPT,t:h,p:"setRatio",s:0,c:1,f:!0,n:n,pg:!0,pr:h._priority},a=h._overwriteProps.length;--a>-1;)i[h._overwriteProps[a]]=this._firstPT;(h._priority||h._onInitAllProps)&&(o=!0),(h._onDisable||h._onEnable)&&(this._notifyPluginsOfEnabled=!0)}else this._firstPT=i[n]=l={_next:this._firstPT,t:e,p:n,f:"function"==typeof e[n],n:n,pg:!1,pr:0},l.s=l.f?e[n.indexOf("set")||"function"!=typeof e["get"+n.substr(3)]?n:"get"+n.substr(3)]():parseFloat(e[n]),l.c="string"==typeof _&&"="===_.charAt(1)?parseInt(_.charAt(0)+"1",10)*Number(_.substr(2)):Number(_)-l.s||0;l&&l._next&&(l._next._prev=l)}return r&&this._kill(r,e)?this._initProps(e,i,s,r):this._overwrite>1&&this._firstPT&&s.length>1&&W(e,this,i,this._overwrite,s)?(this._kill(i,e),this._initProps(e,i,s,r)):(this._firstPT&&(this.vars.lazy!==!1&&this._duration||this.vars.lazy&&!this._duration)&&(F[e._gsTweenID]=!0),o)},n.render=function(t,e,i){var s,r,n,a,o=this._time,h=this._duration,l=this._rawPrevTime;if(t>=h)this._totalTime=this._time=h,this.ratio=this._ease._calcEnd?this._ease.getRatio(1):1,this._reversed||(s=!0,r="onComplete"),0===h&&(this._initted||!this.vars.lazy||i)&&(this._startTime===this._timeline._duration&&(t=0),(0===t||0>l||l===_&&"isPause"!==this.data)&&l!==t&&(i=!0,l>_&&(r="onReverseComplete")),this._rawPrevTime=a=!e||t||l===t?t:_);else if(1e-7>t)this._totalTime=this._time=0,this.ratio=this._ease._calcEnd?this._ease.getRatio(0):0,(0!==o||0===h&&l>0&&l!==_)&&(r="onReverseComplete",s=this._reversed),0>t&&(this._active=!1,0===h&&(this._initted||!this.vars.lazy||i)&&(l>=0&&(l!==_||"isPause"!==this.data)&&(i=!0),this._rawPrevTime=a=!e||t||l===t?t:_)),this._initted||(i=!0);else if(this._totalTime=this._time=t,this._easeType){var u=t/h,p=this._easeType,c=this._easePower;(1===p||3===p&&u>=.5)&&(u=1-u),3===p&&(u*=2),1===c?u*=u:2===c?u*=u*u:3===c?u*=u*u*u:4===c&&(u*=u*u*u*u),this.ratio=1===p?1-u:2===p?u:.5>t/h?u/2:1-u/2}else this.ratio=this._ease.getRatio(t/h);if(this._time!==o||i){if(!this._initted){if(this._init(),!this._initted||this._gc)return;if(!i&&this._firstPT&&(this.vars.lazy!==!1&&this._duration||this.vars.lazy&&!this._duration))return this._time=this._totalTime=o,this._rawPrevTime=l,I.push(this),this._lazy=[t,e],void 0;this._time&&!s?this.ratio=this._ease.getRatio(this._time/h):s&&this._ease._calcEnd&&(this.ratio=this._ease.getRatio(0===this._time?0:1))}for(this._lazy!==!1&&(this._lazy=!1),this._active||!this._paused&&this._time!==o&&t>=0&&(this._active=!0),0===o&&(this._startAt&&(t>=0?this._startAt.render(t,e,i):r||(r="_dummyGS")),this.vars.onStart&&(0!==this._time||0===h)&&(e||this.vars.onStart.apply(this.vars.onStartScope||this,this.vars.onStartParams||y))),n=this._firstPT;n;)n.f?n.t[n.p](n.c*this.ratio+n.s):n.t[n.p]=n.c*this.ratio+n.s,n=n._next;this._onUpdate&&(0>t&&this._startAt&&t!==-1e-4&&this._startAt.render(t,e,i),e||(this._time!==o||s)&&this._onUpdate.apply(this.vars.onUpdateScope||this,this.vars.onUpdateParams||y)),r&&(!this._gc||i)&&(0>t&&this._startAt&&!this._onUpdate&&t!==-1e-4&&this._startAt.render(t,e,i),s&&(this._timeline.autoRemoveChildren&&this._enabled(!1,!1),this._active=!1),!e&&this.vars[r]&&this.vars[r].apply(this.vars[r+"Scope"]||this,this.vars[r+"Params"]||y),0===h&&this._rawPrevTime===_&&a!==_&&(this._rawPrevTime=0))
}},n._kill=function(t,e,i){if("all"===t&&(t=null),null==t&&(null==e||e===this.target))return this._lazy=!1,this._enabled(!1,!1);e="string"!=typeof e?e||this._targets||this.target:D.selector(e)||e;var s,r,n,a,o,h,l,_,u;if((c(e)||M(e))&&"number"!=typeof e[0])for(s=e.length;--s>-1;)this._kill(t,e[s])&&(h=!0);else{if(this._targets){for(s=this._targets.length;--s>-1;)if(e===this._targets[s]){o=this._propLookup[s]||{},this._overwrittenProps=this._overwrittenProps||[],r=this._overwrittenProps[s]=t?this._overwrittenProps[s]||{}:"all";break}}else{if(e!==this.target)return!1;o=this._propLookup,r=this._overwrittenProps=t?this._overwrittenProps||{}:"all"}if(o){if(l=t||o,_=t!==r&&"all"!==r&&t!==o&&("object"!=typeof t||!t._tempKill),i&&(D.onOverwrite||this.vars.onOverwrite)){for(n in l)o[n]&&(u||(u=[]),u.push(n));if(!G(this,i,e,u))return!1}for(n in l)(a=o[n])&&(a.pg&&a.t._kill(l)&&(h=!0),a.pg&&0!==a.t._overwriteProps.length||(a._prev?a._prev._next=a._next:a===this._firstPT&&(this._firstPT=a._next),a._next&&(a._next._prev=a._prev),a._next=a._prev=null),delete o[n]),_&&(r[n]=1);!this._firstPT&&this._initted&&this._enabled(!1,!1)}}return h},n.invalidate=function(){return this._notifyPluginsOfEnabled&&D._onPluginEvent("_onDisable",this),this._firstPT=this._overwrittenProps=this._startAt=this._onUpdate=null,this._notifyPluginsOfEnabled=this._active=this._lazy=!1,this._propLookup=this._targets?{}:[],A.prototype.invalidate.call(this),this.vars.immediateRender&&(this._time=-_,this.render(-this._delay)),this},n._enabled=function(t,e){if(o||a.wake(),t&&this._gc){var i,s=this._targets;if(s)for(i=s.length;--i>-1;)this._siblings[i]=V(s[i],this,!0);else this._siblings=V(this.target,this,!0)}return A.prototype._enabled.call(this,t,e),this._notifyPluginsOfEnabled&&this._firstPT?D._onPluginEvent(t?"_onEnable":"_onDisable",this):!1},D.to=function(t,e,i){return new D(t,e,i)},D.from=function(t,e,i){return i.runBackwards=!0,i.immediateRender=0!=i.immediateRender,new D(t,e,i)},D.fromTo=function(t,e,i,s){return s.startAt=i,s.immediateRender=0!=s.immediateRender&&0!=i.immediateRender,new D(t,e,s)},D.delayedCall=function(t,e,i,s,r){return new D(e,0,{delay:t,onComplete:e,onCompleteParams:i,onCompleteScope:s,onReverseComplete:e,onReverseCompleteParams:i,onReverseCompleteScope:s,immediateRender:!1,lazy:!1,useFrames:r,overwrite:0})},D.set=function(t,e){return new D(t,0,e)},D.getTweensOf=function(t,e){if(null==t)return[];t="string"!=typeof t?t:D.selector(t)||t;var i,s,r,n;if((c(t)||M(t))&&"number"!=typeof t[0]){for(i=t.length,s=[];--i>-1;)s=s.concat(D.getTweensOf(t[i],e));for(i=s.length;--i>-1;)for(n=s[i],r=i;--r>-1;)n===s[r]&&s.splice(i,1)}else for(s=V(t).concat(),i=s.length;--i>-1;)(s[i]._gc||e&&!s[i].isActive())&&s.splice(i,1);return s},D.killTweensOf=D.killDelayedCallsTo=function(t,e,i){"object"==typeof e&&(i=e,e=!1);for(var s=D.getTweensOf(t,e),r=s.length;--r>-1;)s[r]._kill(i,t)};var Q=g("plugins.TweenPlugin",function(t,e){this._overwriteProps=(t||"").split(","),this._propName=this._overwriteProps[0],this._priority=e||0,this._super=Q.prototype},!0);if(n=Q.prototype,Q.version="1.10.1",Q.API=2,n._firstPT=null,n._addTween=function(t,e,i,s,r,n){var a,o;return null!=s&&(a="number"==typeof s||"="!==s.charAt(1)?Number(s)-i:parseInt(s.charAt(0)+"1",10)*Number(s.substr(2)))?(this._firstPT=o={_next:this._firstPT,t:t,p:e,s:i,c:a,f:"function"==typeof t[e],n:r||e,r:n},o._next&&(o._next._prev=o),o):void 0},n.setRatio=function(t){for(var e,i=this._firstPT,s=1e-6;i;)e=i.c*t+i.s,i.r?e=Math.round(e):s>e&&e>-s&&(e=0),i.f?i.t[i.p](e):i.t[i.p]=e,i=i._next},n._kill=function(t){var e,i=this._overwriteProps,s=this._firstPT;if(null!=t[this._propName])this._overwriteProps=[];else for(e=i.length;--e>-1;)null!=t[i[e]]&&i.splice(e,1);for(;s;)null!=t[s.n]&&(s._next&&(s._next._prev=s._prev),s._prev?(s._prev._next=s._next,s._prev=null):this._firstPT===s&&(this._firstPT=s._next)),s=s._next;return!1},n._roundProps=function(t,e){for(var i=this._firstPT;i;)(t[this._propName]||null!=i.n&&t[i.n.split(this._propName+"_").join("")])&&(i.r=e),i=i._next},D._onPluginEvent=function(t,e){var i,s,r,n,a,o=e._firstPT;if("_onInitAllProps"===t){for(;o;){for(a=o._next,s=r;s&&s.pr>o.pr;)s=s._next;(o._prev=s?s._prev:n)?o._prev._next=o:r=o,(o._next=s)?s._prev=o:n=o,o=a}o=e._firstPT=r}for(;o;)o.pg&&"function"==typeof o.t[t]&&o.t[t]()&&(i=!0),o=o._next;return i},Q.activate=function(t){for(var e=t.length;--e>-1;)t[e].API===Q.API&&(N[(new t[e])._propName]=t[e]);return!0},d.plugin=function(t){if(!(t&&t.propName&&t.init&&t.API))throw"illegal plugin definition.";var e,i=t.propName,s=t.priority||0,r=t.overwriteProps,n={init:"_onInitTween",set:"setRatio",kill:"_kill",round:"_roundProps",initAll:"_onInitAllProps"},a=g("plugins."+i.charAt(0).toUpperCase()+i.substr(1)+"Plugin",function(){Q.call(this,i,s),this._overwriteProps=r||[]},t.global===!0),o=a.prototype=new Q(i);o.constructor=a,a.API=t.API;for(e in n)"function"==typeof t[e]&&(o[n[e]]=t[e]);return a.version=t.version,Q.activate([a]),a},s=t._gsQueue){for(r=0;s.length>r;r++)s[r]();for(n in f)f[n].func||t.console.log("GSAP encountered missing dependency: com.greensock."+n)}o=!1}}("undefined"!=typeof module&&module.exports&&"undefined"!=typeof global?global:this||window,"TweenMax");
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$timeout", function($scope, $state, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$timeout", function($scope, $state, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else {
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                angular.element(".modal-dialog").addClass("modal-auto-width");
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubblePoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["LptHelper", "$scope", "$rootScope", "$state", "$timeout", function(LptHelper, $scope, $rootScope, $state, $timeout) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                vm.onclick = onclick;

                var targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                // $scope.lptsphereinstance.addHotspotEventCallback('c-'+vm.hotspot.name, 'onclick', onclick);
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);
                ///////////////

                // Goto target scene
                function onclick() {
                    if (vm.hotspot.target_scene_id) {
                        if (vm.hotspot.target_view) {
                            targetScene.target_view = vm.hotspot.target_view;
                        }
                        $rootScope.$emit('evt.livesphere.changescene', targetScene);
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "$timeout", "LptHelper", function($scope, $timeout, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onclick = togglePopover;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

                ///////////////

                function togglePopover() {
                    $timeout(function() {
                        angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                    });
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotBubbleVideo', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$sce", function($scope, $state, $sce) {
                var vm = this;
                var modal = null;
                vm.hotspot = $scope.hotspot;
                vm.onclick = onclick;
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;
                    
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/bubble/tpl/video.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", "$filter", function($scope, $uibModalInstance, $filter) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                            if ($filter('parseEmbed')(vm.hotspot.src)) {
                                vm.hotspot.src = $filter('parseEmbed')(vm.hotspot.src);
                                vm.hotspot.src = $sce.trustAsHtml(vm.hotspot.src);
                            }
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: Transparent
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
  .directive('hotspotCrystalArticle', ["$uibModal", function($uibModal) {
    return {
      restrict: 'E',
      controllerAs: 'vm',
      controller: ["$scope", "LptHelper", "$rootScope", function($scope, LptHelper, $rootScope) {
        var vm = this;
        vm.hotspot = $scope.hotspot;
        vm.project = $scope.project;
        var modal = null;
        vm.onclick = onclick;

        $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
          LptHelper.checkHotspotPassword(vm.hotspot, onclick);
        });
        ///////////////

        // Goto target scene
        function onclick() {
          var isScenelistOff = $('#scenelist-crystal').hasClass('off');
          if (!$rootScope.isScenelistOff) {
            $rootScope.$broadcast('evt.onsphereclick');
          }
          modal = $uibModal.open({
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/article.html',
            scope: $scope,
            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
              vm.cancel = function() {
                if ($rootScope.isScenelistOff) {
                  $rootScope.$broadcast('evt.onsphereclick');
                }
                $uibModalInstance.dismiss('cancel');
              };
            }]
          });
        }
      }]
    };
  }]);
}());

;(function() {
"use strict";

/**
 * Theme: Transparent
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystalImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width hotspot-crystal-image-popup",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }

                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: Transparent
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystalPoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", function($scope) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: Transparent
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
  .directive('hotspotCrystalTextf', function() {
    return {
      restrict: 'E',
      templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/textf.html',
      controllerAs: 'vm',
      controller: ["$scope", "$timeout", "LptHelper", "$rootScope", function($scope, $timeout, LptHelper, $rootScope) {
        var vm = this;
        vm.hotspot = $scope.hotspot;
        vm.onclick = togglePopover;
        ///////////////
        $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

        function togglePopover() {
          $timeout(function() {
            jQuery('#textf' + vm.hotspot.name).toggleClass('active');
            jQuery('#icon-textf').toggleClass('active');
          });
        }
      }]
    };
  });
}());

;(function() {
"use strict";

/**
 * Theme: Transparent
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotCrystalVideo', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$sce", function($scope, $state, $sce) {
                var vm = this;
                var modal = null;
                vm.hotspot = $scope.hotspot;
                vm.onclick = onclick;
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);


                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;
                    
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/crystal/tpl/video.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", "$filter", function($scope, $uibModalInstance, $filter) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                            if ($filter('parseEmbed')(vm.hotspot.src)) {
                                vm.hotspot.src = $filter('parseEmbed')(vm.hotspot.src);
                                vm.hotspot.src = $sce.trustAsHtml(vm.hotspot.src);
                            }
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: default
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/default/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            $scope.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: default
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });
                ///////////////

                // Goto target scene
                function onclick() {

                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/default/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                $scope.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: default
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultPoint', function() {
        return {
            restrict: 'E',
            controller: ["$scope", function($scope) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: default
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/default/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.updatePopoverPosition = updatePopoverPosition;
                vm.togglePopover = togglePopover;

                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);
                $scope.lptsphereinstance.on('onviewchange', updatePopoverPosition, vm.hotspot.name);
                
                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                    updatePopoverPosition();
                }

                function updatePopoverPosition() {
                    LptHelper.stickElementWithHotspot('#textf' + vm.hotspot.name, vm.hotspot.name, $scope.lptsphereinstance, 25, -24);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: default
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotDefaultVideo', function() {
        return {
            restrict: 'E',
            controller: function() {
            }
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$timeout", function($scope, $state, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$timeout", function($scope, $state, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }

                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyPoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["LptHelper", "$scope", "$rootScope", "$state", "$timeout", function(LptHelper, $scope, $rootScope, $state, $timeout) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                vm.onclick = onclick;
                
                var targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                // $scope.lptsphereinstance.addHotspotEventCallback('c-'+vm.hotspot.name, 'onclick', onclick);
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    if (vm.hotspot.target_scene_id) {
                        var targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                        if (vm.hotspot.target_view) {
                            targetScene.target_view = vm.hotspot.target_view;
                        }
                        $rootScope.$emit('evt.livesphere.changescene', targetScene);
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onclick = togglePopover;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGifyVideo', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "$state", "$sce", function($scope, $state, $sce) {
                var vm = this;
                var modal = null;
                vm.hotspot = $scope.hotspot;
                vm.onclick = onclick;
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;
                    
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/video.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", "$filter", function($scope, $uibModalInstance, $filter) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                            if ($filter('parseEmbed')(vm.hotspot.src)) {
                                vm.hotspot.src = $filter('parseEmbed')(vm.hotspot.src);
                                vm.hotspot.src = $sce.trustAsHtml(vm.hotspot.src);
                            }
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: grady
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGradyArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });
                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/grady/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            $scope.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: grady
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGradyImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });
                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/grady/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                $scope.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: grady
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGradyTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/grady/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.updatePopoverPosition = updatePopoverPosition;
                vm.togglePopover = togglePopover;

                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);
                $scope.lptsphereinstance.on('onviewchange', updatePopoverPosition, vm.hotspot.name);
                
                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                    updatePopoverPosition();
                }

                function updatePopoverPosition() {
                    LptHelper.stickElementWithHotspot('#textf' + vm.hotspot.name, vm.hotspot.name, $scope.lptsphereinstance, 25, -24);
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: grady
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotGradyVideo', function() {
        return {
            restrict: 'E',
            controller: function() {
            }
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });
                

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/pentagon/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonPoint', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function() {
               
            }
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: gify
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/gify/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onclick = togglePopover;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', togglePopover);

                ///////////////
            
                function togglePopover() {
                    angular.element('#textf' + vm.hotspot.name).toggleClass('active');
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotPentagonVideo', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function() {
            }
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: article
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalArticle', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    modal = $uibModal.open({
                        templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/article.html',
                        scope: $scope,
                        controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                            vm.cancel = function() {
                                $uibModalInstance.dismiss('cancel');
                            };
                        }]
                    });
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: image
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalImage', ["$uibModal", function($uibModal) {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", function($scope, LptHelper) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                var modal = null;
                vm.onclick = onclick;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', function() {
                    LptHelper.checkHotspotPassword(vm.hotspot, onclick);
                });

                ///////////////

                // Goto target scene
                function onclick() {
                    if(!vm.hotspot.src) return;

                    vm.hotspot.theme_type = vm.hotspot.theme_type || 'modal';

                    if(vm.hotspot.theme_type == 'fancybox'){
                        var arrayFancy = [];

                        arrayFancy.push({
                            src  :  vm.hotspot.src,
                            opts : {
                                caption : vm.hotspot.caption
                            }
                        });

                        $.fancybox.open(arrayFancy, {
                            loop : true
                        });
                    }else{
                        modal = $uibModal.open({
                            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/image.html',
                            scope: $scope,
                            windowClass : "modal-auto-width",
                            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                                vm.cancel = function() {
                                    $uibModalInstance.dismiss('cancel');
                                };
                            }]
                        });
                    }
                }
            }]
        };
    }]);
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: point
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalPoint', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/point.html',
            controllerAs: 'vm',
            controller: ["LptHelper", "$scope", "$rootScope", "$state", "$timeout", function(LptHelper, $scope, $rootScope, $state, $timeout) {
                var vm = this;

                vm.hotspot = $scope.hotspot;
                vm.project = $scope.project;
                vm.onclick = onclick;

                vm.onmouseover = onmouseover;
                vm.onmouseout = onmouseout;
                vm.isActive = false;

                ///////////////

                function onmouseover() {
                    $timeout(function() {
                        vm.isActive = true;
                    }, 800);
                }

                function onmouseout() {
                    vm.isActive = false;
                }

                var targetScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.project.scenes);
                // $scope.lptsphereinstance.addHotspotEventCallback('c-'+vm.hotspot.name, 'onclick', onclick);
                // $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onclick);
                ///////////////

                // Goto target scene
                function onclick() {
                    if (vm.hotspot.target_scene_id) {
                        if (vm.hotspot.target_view) {
                            targetScene.target_view = vm.hotspot.target_view;
                        }
                        $rootScope.$emit('evt.livesphere.changescene', targetScene);
                    }
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: textf
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalTextf', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/hotspot/royal/tpl/textf.html',
            controllerAs: 'vm',
            controller: ["$scope", "LptHelper", "$timeout", function($scope, LptHelper, $timeout) {
                var vm = this;
                vm.hotspot = $scope.hotspot;
                vm.onmouseover = onmouseover;
                vm.onmouseout = onmouseout;
                vm.isActive = false;
                $scope.lptsphereinstance.addHotspotEventCallback(vm.hotspot.name, 'onclick', onmouseover);


                ///////////////

                function onmouseover() {
                    $timeout(function() {
                        vm.isActive = true;
                    }, 800);
                }

                function onmouseout() {
                        vm.isActive = false;
                }
            }]
        };
    });
}());

;(function() {
"use strict";

/**
 * Theme: bubble
 * Type: video
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspotRoyalVideo', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function() {
            }
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginGalleryClipped', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/gallery/lib/clipped/clipped.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", "$ocLazyLoad", function($scope, $rootScope, $timeout, $ocLazyLoad) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.gallery = [];
                vm.ShowGallery = false;

                if (vm.config.show_on_start == 'yes') {
                    $timeout(function() {
                        vm.ShowGallery = true;
                    });
                }

                $ocLazyLoad.load('bower_components/snap.svg-min.js').then(function() {
                    if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }
                    if (!vm.config.type) vm.config.type = 'project';

                    if (vm.config.gallery.project && vm.config.type == 'project') {

                        vm.gallery = $.map(vm.config.gallery.project, function(value, index) {
                            return [value];
                        });

                        $timeout(function() {
                            duration = ($('.no-csstransitions').length > 0) ? 0 : 300;
                            $('.cd-svg-clipped-slider').each(function() {
                                //create a svgClippedSlider object for each .cd-svg-clipped-slider
                                new svgClippedSlider($(this));
                            });
                        }, 200)
                    }

                    $scope.$on('evt.krpano.onxmlcomplete', function() {
                        if (vm.config.type == 'scene') {
                            if (!vm.config.gallery[$scope.scene._id]) vm.gallery = [];

                            vm.gallery = $.map(vm.config.gallery[$scope.scene._id], function(value, index) {
                                return [value];
                            });

                            $timeout(function() {
                                duration = ($('.no-csstransitions').length > 0) ? 0 : 300;
                                $('.cd-svg-clipped-slider').each(function() {
                                    //create a svgClippedSlider object for each .cd-svg-clipped-slider
                                    new svgClippedSlider($(this));
                                });
                            }, 200)
                        }
                    });

                    var duration;
                    var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'gallery-';
                    $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                        if (eventType == 'click') {
                            vm.ShowGallery = !vm.ShowGallery;
                        }
                    });

                    //define a svgClippedSlider object
                    function svgClippedSlider(element) {
                        this.element = element;
                        this.slidesGallery = this.element.find('.gallery').children('li');
                        this.slidesCaption = this.element.find('.caption').children('li');
                        this.slidesNumber = this.slidesGallery.length;
                        this.selectedSlide = this.slidesGallery.filter('.selected').index();
                        this.arrowNext = this.element.find('.navigation').find('.next');
                        this.arrowPrev = this.element.find('.navigation').find('.prev');

                        this.visibleSlidePath = this.element.data('selected');
                        this.lateralSlidePath = this.element.data('lateral');

                        this.bindEvents();
                    }

                    svgClippedSlider.prototype.bindEvents = function() {
                        var self = this;
                        //detect click on one of the slides
                        this.slidesGallery.on('click', function(event) {
                            if (!$(this).hasClass('selected')) {
                                //determine new slide index and show it
                                var newSlideIndex = ($(this).hasClass('left')) ? self.showPrevSlide(self.selectedSlide - 1) : self.showNextSlide(self.selectedSlide + 1);
                            }
                        });
                    }

                    svgClippedSlider.prototype.showPrevSlide = function(index) {
                        var self = this;
                        this.selectedSlide = index;
                        this.slidesGallery.eq(index + 1).add(this.slidesCaption.eq(index + 1)).removeClass('selected').addClass('right');
                        this.slidesGallery.eq(index).add(this.slidesCaption.eq(index)).removeClass('left').addClass('selected');

                        //morph the svg cliph path to reveal a different region of the image
                        Snap("#cd-morphing-path-" + (index + 1)).animate({ 'd': self.visibleSlidePath }, duration, mina.easeinout);
                        Snap("#cd-morphing-path-" + (index + 2)).animate({ 'd': self.lateralSlidePath }, duration, mina.easeinout);

                        if (index - 1 >= 0) this.slidesGallery.eq(index - 1).add(this.slidesCaption.eq(index - 1)).removeClass('left-hide').addClass('left');
                        if (index + 2 < this.slidesNumber) this.slidesGallery.eq(index + 2).add(this.slidesCaption.eq(index + 2)).removeClass('right');

                        (index <= 0) && this.element.addClass('prev-hidden');
                        this.element.removeClass('next-hidden');

                        //animate prev arrow on click
                        this.arrowPrev.addClass('active').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
                            self.arrowPrev.removeClass('active');
                        });
                    }

                    svgClippedSlider.prototype.showNextSlide = function(index) {
                        var self = this;
                        this.selectedSlide = index;
                        this.slidesGallery.eq(index - 1).add(this.slidesCaption.eq(index - 1)).removeClass('selected').addClass('left');
                        this.slidesGallery.eq(index).add(this.slidesCaption.eq(index)).removeClass('right').addClass('selected');

                        //morph the svg cliph path to reveal a different region of the image
                        Snap("#cd-morphing-path-" + (index + 1)).animate({ 'd': self.visibleSlidePath }, duration, mina.easeinout);
                        Snap("#cd-morphing-path-" + (index)).animate({ 'd': self.lateralSlidePath }, duration, mina.easeinout);

                        if (index - 2 >= 0) this.slidesGallery.eq(index - 2).add(this.slidesCaption.eq(index - 2)).removeClass('left').addClass('left-hide');
                        if (index + 1 < this.slidesNumber) this.slidesGallery.eq(index + 1).add(this.slidesCaption.eq(index + 1)).addClass('right');

                        (index + 1 >= this.slidesNumber) && this.element.addClass('next-hidden');
                        this.element.removeClass('prev-hidden');

                        //animate next arrow on click
                        this.arrowNext.addClass('active').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
                            self.arrowNext.removeClass('active');
                        });
                    }
                });
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginGalleryFancybox', function() {
        return {
            restrict: 'E',
            //templateUrl: Config.PLUGIN_PATH + '/gallery/lib/royalslider/royalslider.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", "$ocLazyLoad", function($scope, $rootScope, $timeout, $ocLazyLoad) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.gallery = [];
                vm.ShowGallery = false;

                if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }
                if (!vm.config.type) vm.config.type = 'project';

                if (vm.config.gallery.project && vm.config.type == 'project') {

                    vm.gallery = $.map(vm.config.gallery.project, function(value, index) {
                        return [value];
                    });


                }
                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    if (vm.config.type == 'scene') {
                        if (!vm.config.gallery[$scope.scene._id]) vm.gallery = [];

                        vm.gallery = $.map(vm.config.gallery[$scope.scene._id], function(value, index) {
                            return [value];
                        });


                    }
                });

                if(vm.config.show_on_start == 'yes') {
                    $timeout(function () {
                        openFancybox();
                    });
                }


                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'gallery-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openFancybox();
                    }
                });

                function openFancybox(){
                    var arrayFancy = [];
                    vm.gallery = vm.gallery.sort(function (a, b) {
                        return (a.sort - b.sort );
                    });
                    angular.forEach(vm.gallery, function(img, key) {
                        
                        arrayFancy.push({
                            src  :  img.path,
                            opts : {
                                //caption : $(this).attr('title')
                            }
                        })    
                    });
        
                    $.fancybox.open(arrayFancy, {
                        loop : true
                    });
                }
            }]
        }
    });
}());

;(function() {
"use strict";

pluginIntropopupBootstrapConfig.$inject = ["$scope", "$rootScope"];
angular.module('lapentor.marketplace.plugins')
    .directive("pluginIntropopupBootstrapConfig", function(){
        return {
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.config.html',
            restrict: "E",
            scope: {
               config: '=',
            },
            controller: pluginIntropopupBootstrapConfig,
            controllerAs :'vm'        

        }
    });
function pluginIntropopupBootstrapConfig($scope, $rootScope){
    var vm = this;
    vm.config = $scope.config;
    vm.config.theme_child_style = vm.config.theme_child_style || 'light';
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupBootstrap', function() {
        return {
            restrict: 'E',
            //templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$sce", "$timeout", "$uibModal", "$ocLazyLoad", function($scope, $rootScope, $sce, $timeout, $uibModal, $ocLazyLoad) {
                ModalInstanceCtrl.$inject = ["$scope", "$uibModalInstance", "config"];
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;

                if (vm.config.start) {
                    openModal();
                }

                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'intropopup-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openModal();
                    }
                });

                function openModal() {
                    $uibModal.open({
                        animation: true,
                        templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/bootstrap/bootstrap.html',
                        controller: ModalInstanceCtrl,
                        controllerAs: 'vmM',
                        resolve: {
                            config: function() {
                                return vm.config;
                            }
                        }
                    });
                }

                function ModalInstanceCtrl($scope, $uibModalInstance, config) {
                    var vmM = this;
                    vmM.config = config;
                    vmM.config.theme_child_style = vmM.config.theme_child_style || 'light';
                    try {
                        vmM.config.content = $sce.trustAsHtml(vmM.config.content);
                    } catch (e) {
                        console.log('INFO:intropopup:content not exist');
                    }
                    vmM.dismiss = $uibModalInstance.dismiss;
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive("pluginIntropopupFullscreenConfig", function(){
        return {
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/fullscreen/fullscreen.config.html',
            restrict: "E",
            scope: {
               config: '=',
            },
            controller: IntropopupFullscreenConfig,
            controllerAs :'vm'        

        }
    });
function pluginIntropopupFullscreenConfig($scope, $rootScope){
    var vm = this;
    vm.config = $scope.config;
}
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupFullscreen', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/fullscreen/fullscreen.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$sce", function($scope, $rootScope, $sce) {
                var vm = this;
                vm.showModal = false;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;

                if (vm.config.start) {
                    openModal();
                }

                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'intropopup-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openModal();
                    }
                });

                function openModal() {
                    vm.showModal = true;
                    vm.config.content = $sce.trustAsHtml(vm.config.content);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginIntropopupCircle', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/intropopup/themes/circle/circle.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$sce", function($scope, $rootScope, $sce) {
                var vm = this;
                vm.showModal = false;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.popupWidth = window.innerWidth > window.innerHeight ? window.innerHeight * 0.9 : window.innerWidth * 0.9;

                if (vm.config.start) {
                    openModal();
                }

                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'intropopup-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openModal();
                    }
                });

                function openModal() {
                    vm.showModal = true;
                    vm.config.content = $sce.trustAsHtml(vm.config.content);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneCircle', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/circle/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneDoubleflip', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/doubleflip/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneOntheline', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/ontheline/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneRoundslide', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/roundslide/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneFillpath', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/fillpath/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneRoyal', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/royal/royal.html',
            controllerAs: 'vm',
            controller: ["$scope", "$document", "$rootScope", "$timeout", "$uibModal", "$ocLazyLoad", function($scope, $document, $rootScope, $timeout, $uibModal, $ocLazyLoad) {
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
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneSlide', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/slide/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginNextsceneSplit', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/nextscene/themes/split/tpl.html',
            controllerAs: 'vm',
            controller: ["$scope", "$rootScope", "$timeout", function($scope, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                var scenes = vm.config.scenes;
                vm.nextScene = {};
                vm.prevScene = {};

                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    vm.nextScene = scenes[$.inArray($scope.scene, scenes) + 1];
                    if (!vm.nextScene) { // Get next scene obj
                        vm.nextScene = scenes[0];
                    }

                    vm.prevScene = scenes[$.inArray($scope.scene, scenes) - 1];
                    if (!vm.prevScene) { // Get prev scene obj
                        vm.prevScene = scenes[scenes.length - 1];
                    }
                });

                // Go to next scene
                vm.goToNextScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.nextScene);
                }

                // Go to prev scene
                vm.goToPrevScene = function() {
                    $rootScope.$emit('evt.livesphere.changescene', vm.prevScene);
                }
            }]
        }
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidgetGooey', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/socialsharewidget/themes/gooey/sswgooey.html',
            controllerAs: 'vm',
            controller: ["$scope", "$filter", "$ocLazyLoad", "LptHelper", function($scope, $filter, $ocLazyLoad, LptHelper) {
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
            }]
        };
    });
}());

;(function() {
"use strict";

angular.module('lapentor.marketplace.plugins')
    .directive('pluginSocialsharewidgetSticky', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/socialsharewidget/themes/sticky/sswsticky.html',
            controllerAs: 'vm',
            controller: ["$scope", "$filter", "LptHelper", function($scope, $filter, LptHelper) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.project = $scope.project;
                vm.config = vm.pluginInterface.config;
                vm.shareUrl = LptHelper.inIframe ? document.referrer : $filter('shareUrl')(vm.project.slug);
                vm.pluginInterface.initDefaultConfig(vm.config, {
                    position: 'right'
                });
            }]
        };
    });
}());
