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
