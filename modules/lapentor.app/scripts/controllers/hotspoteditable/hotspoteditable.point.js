angular.module('lapentor.app')
    .controller('HotspotEditablePointCtrl', HotspotEditablePointCtrl);

function HotspotEditablePointCtrl($scope, $rootScope, $timeout, lptSphere, Alertify, Hotspot, LptHelper) {
    var vm = $scope.vm;

    if (!vm.scenes.length) return;
    vm.selectedScene = null;
    vm.isSpherePreviewInited = false;
    var pointHotspotSphere = new lptSphere(vm.hotspot._id);
    vm.sceneEditSphere = $scope.scenesphereinstance;

    vm.setTargetView = setTargetView;
    vm.loadPointHotspotScene = loadPointHotspotScene;

    vm.project = $scope.project;
    var iconPrefix = 'assets/images/hotspots';
    var currentHotspotThemeSlug = vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : '';
    
    if (currentHotspotThemeSlug) {
        iconPrefix = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', currentHotspotThemeSlug, 'images');
    }

    try{
        if(vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom']){
            vm._icon_custom = vm.project.theme_hotspot.config[vm.hotspot.type + '_icon_custom'];
        }
    } catch(e){}

    vm.optionFov = {
        floor: 70,
        ceil: 120,
        showSelectionBar: true,
        step: 1,
        onChange : function(value){
            if(pointHotspotSphere.krpano() != null){
                pointHotspotSphere.set('view.fov',vm.hotspot_fov);
            }
        }
    }
    $rootScope.$on('evt.hotspoteditable.formShowed', function(event, hotspotId) {
        if (hotspotId == vm.hotspot._id) {
            vm.selectedScene = null;
            if (vm.hotspot.target_scene_id) {
                vm.selectedScene = LptHelper.getObjectBy('_id', vm.hotspot.target_scene_id, vm.scenes);
                $timeout(function () {
                    initPointHotspotSpherePreview();
                },0);
            }
        }
    });

    // Grab group info, merge into scenes object
    if(vm.project.groups) {
        angular.forEach(vm.scenes, function(s) {
            var g = LptHelper.getObjectBy('_id', s.group_id, vm.project.groups);
            s.group_title = g.title;
        });    
    }

    ////////////////
    /**
     * Init sphere preview if this is point hotspot
     */
    function initPointHotspotSpherePreview() {
        if (!vm.isSpherePreviewInited) {
            // Init Sphere viewer
            var defaultView = {};
            var embedingTarget = 'PointHotspot' + vm.hotspot._id;

            if (angular.isDefined(vm.hotspot.target_view) && angular.isDefined(vm.hotspot.target_view.fov)) {
                defaultView = {
                    'view.hlookat': vm.hotspot.target_view.hlookat,
                    'view.vlookat': vm.hotspot.target_view.vlookat,
                    'view.fov': vm.hotspot.target_view.fov,
                    'control.fovspeed':0,

                }
                vm.hotspot_fov = vm.hotspot.target_view.fov;
            } else {
                vm.hotspot_fov = 90;
                defaultView = {
                    'view.fov': 90,
                    'control.fovspeed':0
                };
            }


            if (vm.selectedScene != null 
                && embedingTarget && angular.element('#'+embedingTarget).html()=="") {
                pointHotspotSphere.init(embedingTarget, vm.selectedScene.xml, defaultView);
            }
            vm.isSpherePreviewInited = true;
        }
    }

    function loadPointHotspotScene(target_scene_id) {

        var statusText = false;
        if( !vm.hotspot.title || vm.hotspot.title == "point"){
            statusText = true;
        }

        angular.forEach(vm.scenes, function(s) {

            if(vm.hotspot.title == s.title){
                statusText = true;
            }

            if (s._id == target_scene_id) {
                vm.selectedScene = s;
                return false;
            }
        });
        // check if sphere viewer is inited
        if (vm.isSpherePreviewInited == false) {
            initPointHotspotSpherePreview();
        } else {
            pointHotspotSphere.loadScene(vm.selectedScene.xml,[],vm.selectedScene.pano_type);
        }

        if(statusText){
            vm.hotspot.title = vm.selectedScene.title;
        }
    }

    function setTargetView() {
        if (angular.isUndefined(vm.hotspot.target_view)) {
            vm.hotspot.target_view = {
                hlookat: null,
                vlookat: null,
                fov: null
            }
        }
        vm.hotspot.target_view.hlookat = pointHotspotSphere.getCurrentView('hlookat');
        vm.hotspot.target_view.vlookat = pointHotspotSphere.getCurrentView('vlookat');
        vm.hotspot.target_view.fov = vm.hotspot_fov;
    }

    /**
     * Update hotspot info to DB
     */
    vm.saveForm = function() {
        if (vm.hotspotForm.$valid) {
            vm.formSaving = true;
            if(vm.isSpherePreviewInited) vm.setTargetView();

            Hotspot.update(vm.hotspot).then(function(res) {
                if (res.data.status == 1) {
                    Alertify.success('Hotspot Saved');
                    var now = new Date().getTime();
                    var customIcon = vm.hpIcon?(vm.hpIcon+'?'+ now):vm._icon_custom?vm._icon_custom+'?'+ now:LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + now);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'url',customIcon);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'width',vm.hotspot.width);
                    vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'height',vm.hotspot.width);
                    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onhover', 'showtext(' + vm.hotspot.title + ', "default_tooltip_style")');
                } else {
                    console.log(res);
                    Alertify.error('Can not update hotspot');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not update hotspot');
            }).finally(function() {
                vm.formSaving = false;
            });
        }
    }
}
