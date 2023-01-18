/**
 * Author: Pham Sy Tung
 * http://krpano.com/docu/js/#top
 */
(function() {
    angular.module('LapentorSphere', [])
        .factory('lptSphere', function($rootScope, $timeout) {
            var lptSphere = function(lapentorPanoId) {
                var _zoomLevel = 90;
                var _time = 0;
                return {
                    init: init,
                    destroy: destroy,
                    selectViewer: selectViewer,
                    loadScene: loadScene,
                    moveViewerTo: moveViewerTo,
                    addHotspot: addHotspot,
                    deleteHotspot: deleteHotspot,
                    addHotspotEventCallback: addHotspotEventCallback,
                    getHotspotParam: getHotspotParam,
                    setHotspotParam: setHotspotParam,
                    moveHotspot: moveHotspot,
                    addPlugin: addPlugin,
                    zoomIn: zoomIn,
                    zoomOut: zoomOut,
                    toggleFullScreen: toggleFullScreen,
                    getMousePosition: getMousePosition,
                    updateHotspotPosition: updateHotspotPosition,
                    updateHotspotsPosition: updateHotspotsPosition,
                    getCurrentView: getCurrentView,
                    on: on,
                    set: set,
                    tween: tween,
                    screentosphere: screentosphere,
                    spheretoscreen: spheretoscreen,
                    krpano: _krpano,
                    getPanoId: getPanoId
                };

                //////////////////

                /**
                 * Init krpano sphere viewer
                 * http://krpano.com/docu/html/#syntax
                 * @param  {string} targetElementId [DOM element contain krpano sphere elements]
                 * @param  {string} tourId          [Sphere id]
                 * @param  {string} xmlPath         [path to krpano xml]
                 */
                function init(targetElementId, xmlPath, defaultSettings) {
                    removepano(lapentorPanoId);
                    _time = Date.now();
                    var settings = {};
                    if (angular.isDefined(defaultSettings)) settings = defaultSettings;
                    settings['image.prealign'] = '';
                    
                    try {
                        embedpano({
                            target: targetElementId,
                            html5: 'auto',
                            xml: xmlPath,
                            id: lapentorPanoId,
                            vars: settings
                        });
                    } catch (e) {
                        console.log(e);
                    }

                    on('onxmlcomplete', function() {
                        $rootScope.$broadcast('evt.krpano.onxmlcomplete');
                    });

                    on('onpreviewcomplete', function() {
                        $rootScope.$broadcast('evt.krpano.onpreviewcomplete');
                    });

                    on('onloadcomplete', function() {
                        $rootScope.$broadcast('evt.krpano.onloadcomplete');
                    });

                    on('onviewchange', function() {
                        $rootScope.$emit('evt.krpano.onviewchange');
                    });

                    on('onmousewheel', function() {
                        $rootScope.$broadcast('evt.krpano.onmousewheel');
                    });

                    isMobile.any?_krpano().set('stagescale',1):'';

                    window.krpano = _krpano();
                }

                function getPanoId() {
                    return lapentorPanoId;
                }

                function destroy() {
                    if (_krpano() != null) {
                        removepano(lapentorPanoId);
                    }
                }

                /**
                 * Full docs: http://krpano.com/docu/actions/#tween
                 * @param  {string} variable   [The variable that should be changed]
                 * @param  {string} value      [The destination value for this variable.]
                 * @param  {number} time     [The time in seconds for the change from the current value to the destination value (0.5 seconds by default).]
                 * @param  {string} tweentype
                 *         The tweening / interpolation type (easeOutQuad by default).
                 *         http://krpano.com/docu/actions/#tweentypes
                 * @param  {[type]} donecall  [The action commands that should be executed when the tween is done and the destination value has been reached.]
                 * @param  {[type]} updatecall [These action will be called every time (=every frame!) when the value will be updated / changed!]
                 */
                function tween(variable, value, time, tweentype, donecall, updatecall) {
                    var params = Array.prototype.slice.call(arguments);
                    _krpano().call('tween(' + params.join() + ')');
                }

                function selectViewer(sphereId) {
                    lapentorPanoId = sphereId;
                }

                /**
                 * Get krpano object
                 * @return {krpano}
                 */
                function _krpano() {
                    return document.getElementById(lapentorPanoId);
                }

                /**
                 * Load new pano to viewer
                 * @param  {string} xml [xml path to generate scene info]
                 */
                function loadScene(xml, vars,pano_type) {
                    var varsString = '';
                    if (vars == undefined) {
                        vars = null;
                    } else {
                        angular.forEach(vars, function(val, key) {
                            varsString += key + '=' + val + '&';
                        });
                    }

                    var urlScene = xml.replace("scene.xml", "");
                    urlScene = urlScene.replace("scene.php", "");

                    var krpano6String = '<krpano logkey="false" version="1.19"><skin_settings maps="false" maps_type="bing" maps_bing_api_key="" maps_zoombuttons="false" gyro="true" title="true" thumbs="true" thumbs_width="120" thumbs_height="80" thumbs_padding="10" thumbs_crop="0|40|240|160" thumbs_opened="false" thumbs_text="false" thumbs_dragging="true" thumbs_onhoverscrolling="false" thumbs_scrollbuttons="false" thumbs_scrollindicator="false" thumbs_loop="false" tooltips_thumbs="false" tooltips_hotspots="false" tooltips_mapspots="false" loadscene_flags="MERGE" loadscene_blend="BLEND(0.5)" controlbar_offset="20"/> <control mousetype="drag2d" mouseaccelerate="0.2"/> <view fovtype="MFOV" fov="90" maxpixelzoom="2.0" fovmin="10" fovmax="150" /><preview url="'+urlScene+'preview.jpg" /> <image if="webvr.isenabled"> <cube url="'+urlScene+'vr/vr_%s.jpg" /> </image> <image if="!webvr.isenabled"> <cube url="'+urlScene+'pc/pc_%s.jpg"/> <mobile> <cube url="'+urlScene+'mobile/mobile_%s.jpg"/> </mobile> </image></krpano>';
                    var krpanoMulString = '<krpano logkey="false" version="1.19"><skin_settings maps="false" maps_type="bing" maps_bing_api_key="" maps_zoombuttons="false" gyro="true" title="true" thumbs="true" thumbs_width="120" thumbs_height="80" thumbs_padding="10" thumbs_crop="0|40|240|160" thumbs_opened="false" thumbs_text="false" thumbs_dragging="true" thumbs_onhoverscrolling="false" thumbs_scrollbuttons="false" thumbs_scrollindicator="false" thumbs_loop="false" tooltips_thumbs="false" tooltips_hotspots="false" tooltips_mapspots="false" loadscene_flags="MERGE" loadscene_blend="BLEND(0.5)" controlbar_offset="20"/><view fovtype="MFOV" fov="90" maxpixelzoom="0" fovmin="10" fovmax="150"/><preview url="'+urlScene+'preview.jpg"/>'+'<image if="webvr.isenabled"> <cube url="'+urlScene+'vr/vr_%s.jpg"/> </image> <image if="!webvr.isenabled" type="CUBE" multires="true" tilesize="1024"> <level tiledimagewidth="2560" tiledimageheight="2560"> <cube url="'+urlScene+'pc/%s/l3/%v/l3_%s_%v_%h.jpg"/> </level> <level tiledimagewidth="1280" tiledimageheight="1280"> <cube url="'+urlScene+'pc/%s/l2/%v/l2_%s_%v_%h.jpg"/> </level> <level tiledimagewidth="640" tiledimageheight="640"> <cube url="'+urlScene+'pc/%s/l1/%v/l1_%s_%v_%h.jpg"/> </level> <mobile> <cube url="'+urlScene+'mobile/mobile_%s.jpg"/> </mobile> </image></krpano>';

                    if(pano_type == 'normal'){
                        $timeout(function () {
                            _krpano().call("loadxml("+krpano6String+"," + varsString + ",KEEPHOTSPOTS ,"+$rootScope.changeSceneEffect+");");
                        });
                    }else{
                        $timeout(function () {
                            _krpano().call("loadxml("+krpanoMulString+"," + varsString + ",KEEPHOTSPOTS ,"+$rootScope.changeSceneEffect+");");
                        });
                    }



                    // angular.element("<img/>")

                    // .on('load', function() { 
                    //     _krpano().call("loadxml("+krpano6String+"," + varsString + ",KEEPHOTSPOTS ,"+$rootScope.changeSceneEffect+");");

                    // })
                    // .on('error', function() { 
                    //     _krpano().call("loadxml("+krpanoMulString+"," + varsString + ",KEEPHOTSPOTS ,"+$rootScope.changeSceneEffect+");");

                    // })
                    // .attr("src", urlScene+'pc/pc_b.jpg');
                    //_krpano().call("loadpano('" + xml + "?" + Date.now() + "'," + varsString + ",REMOVESCENES,OPENBLEND(0.0, -0.0, 0.0, 0.0, linear);");
                }

                /**
                 * Move tour viewer to specific point
                 * @param  {float} x
                 * @param  {float} y
                 */
                function moveViewerTo(x, y) {
                    _krpano().call("moveto(" + x + "," + y + ")");
                }

                /**
                 * Add new hotspot with params
                 * @param {obj} params [http://krpano.com/docu/xml/#hotspot]
                 */
                function addHotspot(params) {
                    var paramList = [
                        "title",
                        "name",
                        "type",
                        "hptype",
                        "lpttype",
                        "sceneId",
                        "renderer",
                        "ishtml", //html or image
                        "url",
                        "alturl",
                        "keep",
                        "devices",
                        "visible",
                        "enabled",
                        "handcursor",
                        "maskchildren",
                        "zorder",
                        "style",
                        "ath",
                        "atv",
                        "edge",
                        "zoom",
                        "distorted",
                        "rx",
                        "ry",
                        "rz",
                        "width",
                        "height",
                        "scale",
                        "rotate",
                        "alpha",
                        "onover",
                        "onhover",
                        "onout",
                        "ondown",
                        "onup",
                        "onclick",
                        "onloaded",
                    ];
                    if (angular.isUndefined(params.name)) {
                        console.log('Hotspot name not defined');
                        return false;
                    }
                    _krpano().call('addhotspot(' + params.name + ')');

                    if (angular.isUndefined(params.width)) {
                        params.width = 50;
                    }
                    if (angular.isUndefined(params.height)) {
                        params.height = 50;
                    }

                    for (var i = paramList.length - 1; i >= 0; i--) {
                        var paramName = paramList[i];
                        if (!angular.isUndefined(params[paramName])) {
                            _krpano().set('hotspot[' + params.name + '].' + paramName, params[paramName]);
                            //if(paramName == "ishtml" && params[paramName] == true){
                            //$timeout(function(){
                            //    console.log(1);
                            //    _krpano().set('hotspot[' + params.name + '].' + "sprite.id", "sprite-"+ params.name);
                            //})
                            //}
                        }
                    }
                    // Set ondown action, 
                    // "draghotspot()" is a function written in xml.blade.php on server
                    // _krpano().set('hotspot[' + params.name + '].ondown', 'draghotspot()');
                }

                /**
                 * http://krpano.com/docu/actions/#addplugin
                 * http://krpano.com/plugins/
                 * @param {string} name   [plugin name]
                 * @param {object} params
                 */
                function addPlugin(name, params) {
                    try {
                        _krpano().call('addplugin(' + name + ')');

                        for (var paramName in params) {
                            var paramValue = params[paramName];
                            _krpano().set('plugin[' + name + '].' + paramName, paramValue);
                        }
                    } catch (e) {
                        console.log(e);
                    }

                }

                /**
                 * Set some element to xml
                 * @param {object} params
                 */
                function set(element, params) {
                    if (angular.isObject(params)) {
                        angular.forEach(params, function(val, key) {
                            _krpano().set(element + '[' + params.name + '].' + key, val);
                        });
                    } else {
                        // params is single value
                        _krpano().set(element, params);
                    }
                }

                function deleteHotspot(name) {
                    if (name) {
                        _krpano().call('removehotspot(' + name + ')');
                    } else {
                        // remove all hotspot
                        for (var i = 0; i < _krpano().get('hotspot.count'); i++) {
                            var hotspotName = _krpano().get('hotspot[' + i + '].name');
                            _krpano().call('removehotspot("' + hotspotName + '")');
                        }
                    }
                }

                /**
                 * Add event callback to hotspot
                 * @param {string}   hotspotName
                 * @param {string}   eventName   [ondrag / ondragend / onclick / onhover]
                 * @param {Function} callback    [callback function]
                 */
                function addHotspotEventCallback(hotspotName, eventName, callback, sphereId) {
                    try {
                        if (sphereId != undefined) {
                            selectViewer(sphereId);
                        }
                        _krpano().set('hotspot[' + hotspotName + '].' + eventName, callback);
                    } catch (e) {
                        console.log('addHotspotEventCallback', e);
                    }
                }

                function getHotspotParam(hotspotName, paramName) {
                    return _krpano().get('hotspot[' + hotspotName + '].' + paramName);
                }

                function setHotspotParam(hotspotName, paramName, paramValue) {
                    return _krpano().set('hotspot[' + hotspotName + '].' + paramName, paramValue);
                }

                /**
                 * Move hotspot with "name" to "newX", "newY" position
                 * @param  {string} name [hot spot name]
                 * @param  {int} newX [new x position]
                 * @param  {int} newY [new y position]
                 */
                function moveHotspot(name, newX, newY) {
                    _krpano().set('hotspot[' + name + '].atv', newY);
                    _krpano().set('hotspot[' + name + '].ath', newX);
                }

                /**
                 * Zoom in tour viewer
                 */
                function zoomIn() {
                    _zoomLevel = _krpano().get('view.fov') - 20;
                    _krpano().call('zoomto(' + _zoomLevel + ',smooth())');
                    _krpano().set('view.fov', _zoomLevel);
                }

                /**
                 * Zoom out tour viewer
                 */
                function zoomOut() {
                    _zoomLevel = _krpano().get('view.fov') + 20;
                    _krpano().call('zoomto(' + _zoomLevel + ',smooth())');
                    _krpano().set('view.fov', _zoomLevel);
                }

                /**
                 * Toggle tour fullscreen
                 */
                function toggleFullScreen() {
                    if (!document.fullscreenElement && // alternative standard method
                        !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { // current working methods
                        if (document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen();
                        } else if (document.documentElement.msRequestFullscreen) {
                            document.documentElement.msRequestFullscreen();
                        } else if (document.documentElement.mozRequestFullScreen) {
                            document.documentElement.mozRequestFullScreen();
                        } else if (document.documentElement.webkitRequestFullscreen) {
                            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                        }
                    } else {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        }
                    }
                }

                function getMousePosition() {
                    return _krpano().screentosphere(_krpano().get('mouse.x'), _krpano().get('mouse.y'));
                }

                function screentosphere(x, y) {
                    return _krpano().screentosphere(x, y);
                }

                function spheretoscreen(x, y) {
                    if (_krpano() != null) {
                        return _krpano().spheretoscreen(x, y);
                    }

                    return false;
                }

                /**
                 * Get current view fov, hlookat or vlookat
                 * @param  {string} param [fov / hlookat / vlookat]
                 * @return {int}
                 */
                function getCurrentView(param) {
                    switch (param) {
                        case 'fov':
                            return _krpano().get('view.fov');
                            break;
                        case 'hlookat':
                            return _krpano().get('view.hlookat');
                            break;
                        case 'vlookat':
                            return _krpano().get('view.vlookat');
                            break;
                    }
                }

                function updateHotspotPosition(hotspot, hotspotSize) {
                    if (angular.isUndefined(hotspotSize)) hotspotSize = 50;
                    hotspotSize /= 2;
                    var x = hotspot.position.x,
                        y = hotspot.position.y;
                    var Sphere = _krpano().spheretoscreen(x, y);
                    jQuery('#' + hotspot.name).css({ "transform": "translate(" + transX + "px," + transY + "px)" });
                    jQuery('#' + hotspot.name).css({ "-webkit-transform": "translate(" + transX + "px," + transY + "px)" });
                    jQuery('#' + hotspot.name).css({ "-moz-transform": "translate(" + transX + "px," + transY + "px)" });
                }

                function updateHotspotsPosition() {
                    jQuery('.hotspot-move-trigger').each(function(index, el) {
                        var x = jQuery(this).attr('px'),
                            y = jQuery(this).attr('py'),
                            hotspotSize = jQuery(this).attr('size');
                        if(isNaN(hotspotSize)) hotspotSize = 80;
                        hotspotSize /= 2;

                        var Sphere = _krpano().spheretoscreen(x, y, window.innerWidth, window.innerHeight),
                            transX = Sphere.x - hotspotSize,
                            transY = Sphere.y - hotspotSize,
                            transZ = Sphere.z;

                        jQuery(this).css({ "transform": "translate3d(" + transX + "px," + transY + "px," + transZ + "px)" });
                        if (isNaN(Sphere.x)) {
                            jQuery(this).hide();
                        } else {
                            jQuery(this).show();
                        }
                    });
                }

                /*--------------------------------
                 *  Events
                 --------------------------------*/

                /**
                 * Handle krpano events
                 * http://krpano.com/docu/xml/#events
                 * @param  {string}   eventName
                 * @param  {Function} callback
                 */
                function on(eventName, callback, eventId) {
                    if (typeof callback === 'function' && _krpano() != null) {
                        if (eventId) {
                            try {
                                _krpano().set("events['" + eventId + "']." + eventName, callback);
                            } catch (e) {
                                console.log(e);
                            }
                        } else {
                            // Register to global event                            
                            try {
                                _krpano().set("events." + eventName, callback);
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    }
                }
            };

            return lptSphere;
        });
})();
