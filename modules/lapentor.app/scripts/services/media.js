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