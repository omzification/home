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
