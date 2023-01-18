angular.module('lapentor.app')
    .controller('HotspotEditableImageCtrl', HotspotEditableImageCtrl);

function HotspotEditableImageCtrl($scope, $rootScope, $sce) {
    var vm = $scope.vm;

    vm.scenes = $scope.scenes;

    vm.openMediaLib = openMediaLib;

    ////////////////

    /**
     * Open Media Library
     */
    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.hotspot.src = file.path;
        }
    }

    $sce.trustAsResourceUrl(vm.hotspot.src);
}
