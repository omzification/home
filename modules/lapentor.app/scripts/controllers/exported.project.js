angular.module('lapentor.app')
    .controller('ExportedProjectCtrl', ExportedProjectCtrl);

function ExportedProjectCtrl($scope, $rootScope, Alertify, envService, user) {
    var vm = this;
    vm.user = user;
}