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
