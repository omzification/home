/**
 * Define <hotspot> directive that generate hotspot base on theme and add it into scene
 * $scope here will pass down to all hotspot theme child directive
 */
angular.module('lapentor.marketplace.themes')
    .directive('hotspot', function($compile, $sce, $timeout, $window, $uibModal, $rootScope, LptHelper, $filter) {
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
                                controller: function($scope, $uibModalInstance, $filter) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                    $scope.config = scope.project.theme_hotspot.config ? scope.project.theme_hotspot.config : {};
        
                                    if ($filter('parseEmbed')(thisHotspot.src)) {
                                        $scope.hotspotSrc = $filter('parseEmbed')(thisHotspot.src);
                                        $scope.hotspotSrc = $sce.trustAsHtml($scope.hotspotSrc);
                                    }
                                }
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
                                controller: function($scope, $uibModalInstance) {
                                    $scope.cancel = function() {
                                        $uibModalInstance.dismiss('cancel');
                                    };
                                }
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
    });