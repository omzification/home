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
