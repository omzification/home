angular.module('lapentor.app')
    .controller('ResetPasswordCtrl', ResetPasswordCtrl);

function ResetPasswordCtrl($scope, $state, $timeout, $stateParams, Alertify, AuthSrv) {
    var vm = this;
    vm.submit = function() {
        if (vm.isLoading) return;
        if (vm.password == vm.passwordConfirmation) {

            if (vm.resetForm.$valid) {
                vm.isLoading = true;

                AuthSrv.resetPassword({
                    token: $stateParams.token,
                    password: vm.password,
                    password_confirmation: vm.passwordConfirmation
                }).then(function(res) {
                    vm.message = 'Your new password is saved. You will be redirect to sign in page in 5 seconds';
                    $timeout(function() {
                        $state.go('login');
                    }, 5000);
                }).finally(function() {
                    vm.isLoading = false;
                });
            } else {
                Alertify.error('Password field is required');
                vm.isLoading = false;
            }
        } else {
            Alertify.error('Password is not match');
            vm.isLoading = false;
        }
    }
}
