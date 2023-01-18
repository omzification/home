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
