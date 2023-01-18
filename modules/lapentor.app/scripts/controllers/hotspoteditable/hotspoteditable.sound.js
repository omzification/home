angular.module('lapentor.app')
    .controller('HotspotEditableSoundCtrl', HotspotEditableSoundCtrl);

function HotspotEditableSoundCtrl($scope, $rootScope, $sce) {
    var vm = $scope.vm;

    vm.reachRangeSliderOptions = {
        floor: 10,
        ceil: 180,
        showSelectionBar: true,
        step: 10,
        translate: function(value) {
            return value + '&deg;';
        }
    };

    vm.openMediaLib = openMediaLib;

    ////////////////

    // Init default value for hotspot config
    //------- Sound hotspot only ---------------
    if (vm.hotspot.type == 'sound') {
        if (angular.isUndefined(vm.hotspot.reach)) {
            vm.hotspot.reach = 40;
        }
        if (angular.isUndefined(vm.hotspot.volume)) {
            vm.hotspot.volume = 80;
        }
    }

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
        if (file.mime_type.indexOf('audio') != -1) { // check file type
            vm.hotspot.src = file.path;
            vm.hotspot.title = file.name;
        }
    }

    $sce.trustAsResourceUrl(vm.hotspot.src);
}
