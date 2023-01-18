angular.module('lapentor.app')
    .controller('HotspotEditableVideoCtrl', HotspotEditableVideoCtrl);

function HotspotEditableVideoCtrl($scope, $sce) {
    var vm = $scope.vm;
    // TODO: embed video iframe preview
    
    $sce.trustAsResourceUrl(vm.hotspot.src);
}
