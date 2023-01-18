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
