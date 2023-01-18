angular.module('lapentor.app', [
        'oc.lazyLoad',
        'ngCookies',
        'ui.bootstrap',
        'ngResource',
        'ngSanitize',
        'ui.router',
        'satellizer',
        'ngMeta',
        'Alertify',
        'ngFileUpload',
        'angular-nicescroll',
        'ngDragDrop',
        'ui.sortable',
        '720kb.socialshare',
        'pasvaz.bindonce',
        'ngIntercom',
        'LapentorSphere',
        'pst.utils',
        'lapentor.marketplace.themes',
        'lapentor.marketplace.plugins',
        'lapentor.livesphere',
        'toggle-switch',
        'monospaced.qrcode',
        'environment',
        'infinite-scroll',
        'pascalprecht.translate'
    ])
    .constant('CONST', {
        export_price: 10,
        intercom_app_id: 'nszgonve'
    })
    .config(env)
    .config(intercom)
    .config(routes)
    .config(auth)
    .config(meta)
    .config(translation)
    .run(function(ngMeta, $rootScope) {
        $rootScope.changeSceneEffect = 'NOBLEND';
        ngMeta.init();
    });

///////////////

function translation($translateProvider) {
    var translationsEN = {
        ACTIVE_GYRO: "Do you want to allow {{ permissionTitle }} on this device?",
        ALLOW: "Allow",
        CANCEL: "Cancel"
    };

    var translationsIT = {
        ACTIVE_GYRO: 'Vuoi attivare il {{ permissionTitle }} su questo dispositivo?',
        ALLOW: "Attiva",
        CANCEL: "Annulla"
    };

    // add translation table
    $translateProvider
    .translations('en', translationsEN)
    .translations('it', translationsIT)
    .preferredLanguage('en');
}

function meta(ngMetaProvider) {
    ngMetaProvider.setDefaultTitle('Lapentor - 360° VR publishing tool for panoramic photographers & agencies');
}

function env(envServiceProvider) {
    // set the domains and variables for each environment
    envServiceProvider.config({
        domains: {
            development: ['localhost:3000'],
            production: ['app.lapentor.com', '360.goterest.com'],
            staging: ['stagingapp-lapentor-com.herokuapp.com']
        },
        vars: {
            development: {
                apiUrl: 'https://api.lapentor.com/api/v1',
                siteUrl: 'http://localhost:3000',
                planMonthly: 25,
                planYearly: 250
            },
            production: {
                apiUrl: 'https://api.lapentor.com/api/v1',
                siteUrl: 'https://app.lapentor.com',
                planMonthly: 25,
                planYearly: 250
            },
            staging: {
                apiUrl: 'http://apistaging.lapentor.com/api/v1',
                siteUrl: 'http://stagingapp-lapentor-com.herokuapp.com',
                planMonthly: 25,
                planYearly: 250
            }
        }
    });

    // run the environment check, so the comprobation is made
    // before controllers and services are built
    envServiceProvider.check();
}

function intercom($intercomProvider, CONST) {
    // Either include your app_id here or later on boot
    $intercomProvider
        .appID(CONST.intercom_app_id);

    // you can include the Intercom's script yourself or use the built in async loading feature
    $intercomProvider
        .asyncLoading(true);
}

function auth($authProvider, $httpProvider, envServiceProvider) {
    $authProvider.loginUrl = envServiceProvider.read('apiUrl') + '/auth/login';
    $httpProvider.interceptors.push('lptInterceptor');
    //49245343276-l6c6uo54kompfe7co88rqggs9e7n8dld.apps.googleusercontent.com
    $authProvider.facebook({
        clientId: '292750687798001',
        url: envServiceProvider.read('apiUrl') + '/auth/login-facebook',
        scope: ['email', 'public_profile'],
        scopeDelimiter: ','
    });

    $authProvider.google({
        clientId: '49245343276-l6c6uo54kompfe7co88rqggs9e7n8dld.apps.googleusercontent.com',
        name: 'google',
        url: envServiceProvider.read('apiUrl') + '/auth/login-google'
    });
}

function routes($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $stateProvider
        .state('index', {
            url: LPT_OFFLINE_MODE ? 'any' : '/',
            templateUrl: 'modules/lapentor.app/views/pages/dashboard.html',
            controller: 'DashboardCtrl',
            controllerAs: 'vm',
            resolve: {
                requireLogin: requireLogin,
                projects: function(Project) {
                    return Project.all(0, 9);
                },
                user: function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }
            }
        })
        .state('edit-profile', {
            url: '/profile',
            controller: 'ProfileCtrl',
            controllerAs: 'vm',
            templateUrl: 'modules/lapentor.app/views/pages/profile.html',
            params: {
                user: null
            },
            resolve: {
                requireLogin: requireLogin,
                user: function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                },
                // invoices: function($stateParams, User) {
                //     return User.getInvoices();
                // }
            }
        })
        .state('project', {
            abstract: true,
            url: '/project/:id',
            template: '<ui-view></ui-view>',
            resolve: {
                requireLogin: requireLogin,
                project: function($stateParams, $auth, Project) {
                    if ($auth.isAuthenticated()) {
                        return Project.get($stateParams.id);
                    }
                }
            }
        })
        .state('project.editor', {
            url: '/editor/scene/:scene_id',
            templateUrl: 'modules/lapentor.app/views/pages/project.editor.html',
            controller: 'ProjectEditorCtrl',
            controllerAs: 'vm',
            resolve: {
                loadEditorExternalModules: function($ocLazyLoad) {
                    return $ocLazyLoad.load([
                        'bower_components/angularjs-slider/dist/rzslider.min.js',
                        'bower_components/summernote/dist/summernote.min.js',
                        'bower_components/angular-summernote/dist/angular-summernote.min.js',
                        'bower_components/angular-bootstrap-contextmenu/contextMenu.js',
                        'bower_components/angular-bootstrap-colorpicker/js/bootstrap-colorpicker-module.min.js',
                    ]);
                },
                user: function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }
            }
        })
        .state('sphere', {
            // url: '/sphere/:project_slug?scene',
            url: LPT_OFFLINE_MODE ? '/?scene' : '/sphere/:project_slug?scene',
            templateUrl: 'modules/lapentor.livesphere/livesphere.html',
            controller: 'LiveSphereCtrl',
            controllerAs: 'vm',
            reloadOnSearch: false,
            params: {
                scene: null,
                project: null,
                target_view: null
            },
            resolve: {
                project: function($stateParams, LiveSphere) {
                    if (!angular.isObject($stateParams.project)) { // check if scenes already passed in $stateParams
                        return LiveSphere.getProject($stateParams.project_slug);
                    } else {
                        return $stateParams.project;
                    }
                }
            }
        })
        .state('showcase', {
            url: '/u/:username',
            templateUrl: 'modules/lapentor.app/views/pages/showcase.html',
            controller: 'ShowcaseCtrl',
            controllerAs: 'vm',
            resolve: {
                user: function($stateParams, Showcase) {
                    return Showcase.get($stateParams.username);
                }
            }
        })
        .state('login', {
            url: '/auth',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'login'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('register', {
            url: '/auth/register',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'register'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('register-old', {
            url: '/register',
            templateUrl: 'modules/lapentor.app/views/pages/auth/login2.html',
            params: {
                tab: 'register'
            },
            controller: 'LoginCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('forgot-password', {
            url: '/auth/forgot-password',
            templateUrl: 'modules/lapentor.app/views/pages/auth/forgot-password.html',
            controller: 'ForgotPasswordCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('reset-password', {
            url: '/auth/reset-password?token',
            templateUrl: 'modules/lapentor.app/views/pages/auth/reset-password.html',
            controller: 'ResetPasswordCtrl',
            controllerAs: 'vm',
            resolve: {
                redirectIfLoggedIn: redirectIfLoggedIn
            }
        })
        .state('activate', {
            url: '/register/activate-account?token',
            templateUrl: 'modules/lapentor.app/views/pages/auth/activate.html',
            controller: 'ActivateAccountCtrl',
            controllerAs: 'vm'
        })
        .state('resend-activation-code', {
            url: '/register/resend-activation-code',
            templateUrl: 'modules/lapentor.app/views/pages/auth/resend-activation-code.html',
            controller: 'ResendActivateAccountCtrl',
            controllerAs: 'vm'
        })
        .state('logout', {
            url: '/logout',
            template: null,
            controller: function($auth, $state) {
                $auth.logout();
                $state.go('login');
            }
        })
        .state('404', {
            url: '/404',
            templateUrl: '404.html',
        });

    $urlRouterProvider.otherwise('/404');
}

function redirectIfLoggedIn($q, $auth, $state, $timeout) {
    var defer = $q.defer();
    if ($auth.isAuthenticated()) {
        $timeout(function() {
            // This code runs after the authentication promise has been rejected.
            // Go to the log-in page
            $state.go('index');
        });
        defer.reject();
    } else {
        defer.resolve();
    }
    return defer.promise;
}

function requireLogin($q, $auth, $state, $timeout) {
    var defer = $q.defer();
    if (!$auth.isAuthenticated()) {
        // The next bit of code is asynchronously tricky.
        $timeout(function() {
            // This code runs after the authentication promise has been rejected.
            // Go to the log-in page
            $state.go('login');
            // Reject the authentication promise to prevent the state from loading
        });
        defer.reject();
    } else {
        defer.resolve();
    }

    return defer.promise;
}
