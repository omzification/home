angular.module('lapentor.app')
    .controller('ActivateAccountCtrl', ActivateAccountCtrl);

function ActivateAccountCtrl($scope, $stateParams, $state, AuthSrv, $interval) {
    var vm = this;
    var countdownInterval = null;
    vm.message = 'Activating your account now';
    vm.isLoading = true;

    AuthSrv.activate($stateParams.token).then(function(res) {
        vm.activated = true;
        vm.countdown = 10;
        countdownInterval = $interval(function() {
            if (vm.countdown > 0) {
                vm.countdown -= 1;
            } else {
                $interval.cancel(countdownInterval);
                $state.go('login');
            }
        }, 1000);
    }).catch(function (message) {
    	vm.message = message;
    }).finally(function () {
    	vm.isLoading = false;
    });
}
