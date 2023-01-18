angular.module('lapentor.app')
    .controller('ForgotPasswordCtrl', ForgotPasswordCtrl);

function ForgotPasswordCtrl($scope, $state, $timeout, AuthSrv, Alertify) {
    var vm = this;
    vm.email = null;
    vm.submit = submit;
    vm.forgotForm = $scope.forgotForm;
    vm.isLoading = false;

    function submit() {
        if (vm.forgotForm.$valid) {
            if(vm.isLoading) return; // prevent repeated click
            vm.isLoading = true;
            
            AuthSrv.sendResetLink(vm.email).then(function (res) {
                vm.email = null;
                vm.message = 'Please check your email and click on the link to reset your password';
            }).finally(function () {
                vm.isLoading = false;
            });
        }
    }
}
