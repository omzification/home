angular.module('lapentor.app')
    .controller('LoginCtrl', LoginCtrl);

function LoginCtrl($scope, $resource, $rootScope, $stateParams, $state, $timeout, $auth, AuthSrv, Alertify, ngMeta) {
    ngMeta.setTitle('Lapentor.com - The first and only CMS for Sphere photo you ever need');
    var vm = this;
    $scope.auth = {};
    vm.user = {};
    vm.tab = $stateParams.tab?$stateParams.tab:'login';

    vm.submitLogin = submitLogin;
    vm.submitLoginSocial = submitLoginSocial;
    vm.submitRegister = submitRegister;

    vm.loginForm = $scope.loginForm;
    vm.registerForm = $scope.registerForm;

    vm.isLoading = false;

    /////////

    function submitLoginSocial(provider) {
        if (vm.isFullLoading) return;
        vm.isFullLoading = true;
        $auth.authenticate(provider)
            .then(function(res) {
                    $timeout(function() {
                        $state.go('index');
                    });
            }, function(res) {
                // Handle errors here, such as displaying a notification
                if (res.status == 400) {
                    // Alertify.error('Your account is not activated yet. Check your email to activate your account first');
                    vm.accountNotActivated = true;

                    $timeout(function() {
                        vm.accountNotActivated = false;
                    }, 10000);
                }
            }).finally(function() {
                vm.isFullLoading = false;
            });
    };

    function submitLogin() {
        if (vm.loginForm.$valid) {
            if (vm.isLoading) return;
            vm.isLoading = true;
            $auth.login(vm.user)
                .then(function(res) {
                    if (!res.data.status) {
                        Alertify.error('Wrong username / password');
                    } else {
                        $timeout(function() {
                            $state.go('index');
                        });
                    }
                }, function(res) {
                    // Handle errors here, such as displaying a notification
                    if (res.status == 400) {
                        // Alertify.error('Your account is not activated yet. Check your email to activate your account first');
                        vm.accountNotActivated = true;

                        $timeout(function() {
                            vm.accountNotActivated = false;
                        }, 10000);
                    }
                }).finally(function() {
                    vm.isLoading = false;
                });
        }
    }

    function submitRegister() {
        if (vm.registerForm.$valid) {
            vm.isLoading = true;

            AuthSrv.register(vm.user).then(function(res) {
                    vm.shouldShowWelcome = true;
                    vm.user = {};
                }).catch(function(res) {
                    if (res.status == 400) {
                        // validation error, display error message
                        var errors = res.data.errors.message;
                        angular.forEach(errors, function(msg) {
                            Alertify.error(msg[0]);
                        });
                    }
                })
                .finally(function() {
                    vm.isLoading = false;
                });
        }
    }
}
