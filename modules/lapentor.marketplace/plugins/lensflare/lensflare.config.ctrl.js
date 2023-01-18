angular.module('lapentor.marketplace.plugins')
    .controller('pluginLensflareConfigCtrl', pluginLensflareConfigCtrl);

function pluginLensflareConfigCtrl($scope, $rootScope, $uibModal, lptSphere, LptHelper, project, item) {
    var vm = this;
    vm.project = project;
    vm.updateConfig = saveLensflare;
    vm.selectScene = selectScene;
    vm.config = item.config;
    vm.removeLensflare = removeLensflare;

    var embed = false;
    var krpanoSphere = new lptSphere('lensflareKrpano');

    if (angular.isUndefined(vm.config)) { vm.config = {}; }
    if (angular.isUndefined(vm.config.lensflare)) { vm.config.lensflare = {}; }

    function selectScene() {
        vm.selectedScene = LptHelper.getObjectBy('_id', vm.targetScene, vm.project.scenes);

        var defaultView = {
            'view.fov': 90
        };
        if (vm.config.lensflare[vm.selectedScene._id]) {

            defaultView['view.hlookat'] = vm.config.lensflare[vm.selectedScene._id].x;
            defaultView['view.vlookat'] = vm.config.lensflare[vm.selectedScene._id].y;
        }
        if (embed == false) {
            embed = true;
            vm.shouldShowPreview = true;

            krpanoSphere.init('lensTour', vm.selectedScene.xml, defaultView);
            krpanoSphere.on('onxmlcomplete', function() {

                krpanoSphere.set('layer', {
                    name: 'h',
                    type: 'container',
                    width: '100',
                    height: '2',
                    align: 'center',
                    bgcolor: '0xef5041',
                    bgalpha: '1',
                    keep: true

                });
                krpanoSphere.set('layer', {
                    name: 'v',
                    type: 'container',
                    width: '2',
                    height: '100',
                    align: 'center',
                    bgcolor: '0xef5041',
                    bgalpha: '1',
                    keep: true
                });
                krpanoSphere.deleteHotspot('lensflare');
                if(vm.config.lensflare[vm.targetScene]) {
                    addHotspotLensFlare(vm.config.lensflare[vm.targetScene].x,vm.config.lensflare[vm.targetScene].y);
                }    
            });
        } else {
            krpanoSphere.loadScene(vm.selectedScene.xml, defaultView);
        }
    }

    function saveLensflare() {

        if (embed == true) {
            vm.config.lensflare[vm.targetScene] = {
                x: krpanoSphere.getCurrentView('hlookat'),
                y: krpanoSphere.getCurrentView('vlookat')
            }
        }
        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
            addHotspotLensFlare(vm.config.lensflare[vm.targetScene].x,vm.config.lensflare[vm.targetScene].y);
        });
    }

    function addHotspotLensFlare(x, y) {

        krpanoSphere.addHotspot({
            name: 'lensflare',
            url: 'modules/lapentor.marketplace/plugins/lensflare/images/flare1.png',
            width: 400,
            height: 400,
            ath: x,
            atv: y,
            enabled: false
        });
    }

    function removeLensflare() {
        if (embed == true) {
            if (vm.config.lensflare[vm.targetScene]) {
                delete vm.config.lensflare[vm.targetScene];
                krpanoSphere.deleteHotspot('lensflare');
                vm.isUpdating = true;
                $scope.updateConfig(item, vm.config, function() {
                    vm.isUpdating = false;
                });
            }
        }

    }

}
