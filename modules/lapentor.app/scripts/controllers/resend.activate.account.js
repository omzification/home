angular.module('lapentor.app')
    .controller('ResendActivateAccountCtrl', ResendActivateAccountCtrl);

function ResendActivateAccountCtrl($scope, $state, AuthSrv, $timeout) {
    var vm = this;

    vm.submit = function() {
        vm.isLoading = true;
        if (vm.resendForm.$valid) {
            AuthSrv.resendActivation(vm.email).then(function(res) {
                vm.message = 'Your activation link was send. Please check your email (both Inbox and Spam).';
            }).catch(function(message) {
                vm.message = message;
                vm.messageClass = 'danger';

                $timeout(function() {
                    vm.message = null;
                    vm.messageClass = '';
                }, 10000);
            }).finally(function() {
                vm.isLoading = false;
                vm.errorClass = '';
            });
        } else {
            vm.isLoading = false;
            vm.errorClass = '';
            $timeout(function() {
                vm.errorClass = 'pulse';
            }, 100);
        }
    }
}
