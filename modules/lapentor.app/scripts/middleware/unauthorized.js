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