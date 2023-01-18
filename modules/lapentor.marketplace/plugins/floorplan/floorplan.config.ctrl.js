angular.module('lapentor.marketplace.plugins')
    .controller('pluginFloorplanConfigCtrl', pluginFloorplanConfigCtrl);

function pluginFloorplanConfigCtrl($scope, $rootScope, $uibModal, Alertify, LptHelper, project, item) {
    var vm = this;
    vm.project = project;
    vm.updateConfig = saveFloorplan;
    vm.config = item.config;

    if (angular.isUndefined(vm.config)) {
        vm.config = {
            position: 'bottom-left'
        };
    };
    vm.config.bg_color = vm.config.bg_color || '#1b1b1b';
    if (angular.isUndefined(vm.config.floorplans)) { vm.config.floorplans = [] };
    vm.config.icon = vm.config.icon ? vm.config.icon : (Config.PLUGIN_PATH + 'floorplan/images/radar.png');
    if (angular.isUndefined(vm.config.radars)) {
        vm.config.radars = {
            active: false,
            radius: 50,
            left: 12.5,
            top: 12.5,
            border: "none",
            background: 'rgba(241, 118, 118, 0.49)'
        }
    }
    vm.config.placemarkWidthHeight = vm.config.placemarkWidthHeight || 25;

    vm.openLiveView = function() {
        $rootScope.$emit('evt.editor.openLiveView');
    }

    vm.openMediaLib = function(type) {
        if (type == 'icon') {
            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: false
            });
        }
        if (type == 'floorplan') {
            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackFloorplan,
                canChooseMultipleFile: true
            });
        }
    }

    function __chooseAssetCallbackIcon(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.config.icon = file.path;
        }
    }

    function __chooseAssetCallbackFloorplan(files) {
        var fileIds = [];
        if (vm.config.floorplans) {
            angular.forEach(vm.config.floorplans, function(value, key) {
                fileIds.push(value._id);
            });
        }

        angular.forEach(files, function(value, key) {
            var file = value;

            file.placemarkers = [];
            if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {
                vm.config.floorplans.push(file);
            }
        });
    }

    vm.showFloorplan = function(id) {
        vm.formMap = true;
        var floorplan = getFloorplan(id);

        vm.mapId = id;
        vm.mapName = floorplan.name;
        vm.map = floorplan.path;
        vm.mapWidth = floorplan.resizeWidth?floorplan.resizeWidth:floorplan.width;
        vm.mapHeight = floorplan.resizeHeight?floorplan.resizeHeight: floorplan.height;
        if(!floorplan.resizeWidth){
            if (floorplan.width > 400 && floorplan.width > floorplan.height) {
                vm.mapWidth = 400;
                vm.mapHeight = parseInt(400 / floorplan.width * floorplan.height);

                floorplan.resizeWidth = vm.mapWidth;
                floorplan.resizeHeight = vm.mapHeight;

            } else if (floorplan.height > 400 && floorplan.height > floorplan.width) {

                vm.mapWidth = parseInt(400 / floorplan.height * floorplan.width);
                vm.mapHeight = 400;

                floorplan.resizeWidth = vm.mapWidth;
                floorplan.resizeHeight = vm.mapHeight;
            } else if (floorplan.width > 400 && floorplan.width == floorplan.height){

                vm.mapWidth = 400;
                vm.mapHeight = 400;

                floorplan.resizeWidth = 400;
                floorplan.resizeHeight = 400;
            }
        }

        vm.placemarkers = floorplan.placemarkers ? floorplan.placemarkers : []
    }

    vm.floorplanUpdate = function(id) {
        var floorplan = getFloorplan(id);
        floorplan.name = vm.mapName;
        vm.mapHeight = parseInt(vm.mapWidth / floorplan.width * floorplan.height);
        floorplan.resizeWidth = vm.mapWidth;
        floorplan.resizeHeight = vm.mapHeight;
    }

    vm.newPlacemarker = function(event, ui) {
        if (!vm.mapId) return;
        var floorplan = getFloorplan(vm.mapId);
        if (angular.isUndefined(floorplan.placemarkers)) { floorplan.placemarkers = []; }

        vm.placemarkers.push({
            type: 'placemarker',
            top: vm.positionTop,
            left: vm.positionLeft - 12.5,
            targetScene: null,
            heading: 0

        });
        //$scope.$parent.updateConfig('plugin', 'floorplan', vm.config);
    }

    vm.markerUpdateWidthHeight = function(){
        if(vm.config.radars.top > vm.config.placemarkWidthHeight){
            vm.config.radars.top = vm.config.placemarkWidthHeight;
        }
        if(vm.config.radars.left > vm.config.placemarkWidthHeight){
            vm.config.radars.left = vm.config.placemarkWidthHeight;
        }
    }

    vm.updatePlacemarker = function(event, ui, id) {

        vm.placemarkers[id].top = vm.positionTop;
        vm.placemarkers[id].left = vm.positionLeft;
    }

    vm.drag = function(event, ui) {

        vm.positionTop = ui.position.top;
        vm.positionLeft = ui.position.left;
    }

    vm.menuOptionsPlacemarker = [
        ['Choose represent scene', function($item) {

            vm.placemarker = $item.placemarker;

            $uibModal.open({
                templateUrl: 'modules/lapentor.marketplace/plugins/floorplan/tpl/marker-config.html',
                controller: ConfigPlacemarkerCtrl,
                controllerAs: "vmPm",
                size: 'sm',
                scope: $scope
            });
        }],
        // null, // Dividier
        ['Delete marker', function($item) {
            vm.placemarkers.splice($item.$index, 1);
        }]
    ];

    vm.menuOptionsFloorplan = [
        ['Delete floor plan', function($item) {

            vm.config.floorplans.splice($item.$index, 1);

            if (vm.mapId && vm.mapId == $item.floorplan._id) {
                vm.formMap = false;
            }

        }],
        // null // Dividier
    ];

    function getFloorplan(id) {
        return vm.config.floorplans.filter(function(floorplan) {
            return floorplan._id == id
        })[0];
    };

    function saveFloorplan() {

        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }

    function ConfigPlacemarkerCtrl($scope, $timeout, $uibModalInstance, Alertify, LptHelper, lptSphere) {
        var vmPm = this;
        var embed = false;
        var krpanoSphere = new lptSphere('embedKrpano');
        vmPm.project = vm.project
        vmPm.placemarker = vm.placemarker;

        if (vmPm.placemarker.targetScene) {

            vmPm.targetScene = vmPm.placemarker.targetScene;
            vmPm.selectedScene = LptHelper.getObjectBy('_id', vmPm.targetScene, vmPm.project.scenes);

            if (vmPm.selectedScene._id) {
                var defaultView = {
                    'view.fov': 90,
                    'view.hlookat': vmPm.placemarker.heading
                };
                $uibModalInstance.opened.then(
                    $timeout(function() {
                        vmPm.shouldShowPreview = true;
                        krpanoSphere.init('krpanoTour', vmPm.selectedScene.xml, defaultView);
                    }));
                embed = true;
            }
        }

        vmPm.select = function() {
            vmPm.selectedScene = LptHelper.getObjectBy('_id', vmPm.targetScene, vmPm.project.scenes);

            var defaultView = {
                'view.fov': 90
            };
            if (embed == false) {
                embed = true;
                vmPm.shouldShowPreview = true;
                krpanoSphere.init('krpanoTour', vmPm.selectedScene.xml, defaultView);
            } else {
                krpanoSphere.loadScene(vmPm.selectedScene.xml);
            }
        }

        vmPm.getHeading = function() {
            if (embed == false) return;

            vmPm.heading = krpanoSphere.screentosphere(angular.element('#krpanoTour').width() / 2, (angular.element('#krpanoTour').height() / 2)).x;

            vm.placemarker.targetScene = vmPm.targetScene;
            vm.placemarker.heading = vmPm.heading;
        }

        vmPm.dismiss = function() {
            vmPm.getHeading();
            vm.updateConfig();
            $uibModalInstance.dismiss();
        }

        vmPm.cancel = function() {
            $uibModalInstance.dismiss();
        }
    };

}
