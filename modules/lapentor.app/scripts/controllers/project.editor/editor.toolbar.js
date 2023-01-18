angular.module('lapentor.app')
    .controller('EditorToolbarCtrl', EditorToolbarCtrl);

function EditorToolbarCtrl($scope, $rootScope, Alertify, Hotspot, Project, Scene) {
    var vm = $scope.vm;
    vm.isOpenHotspotList = false;
    var currentHotspotThemeSlug = vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : '';
    vm.hotspotTypes = Hotspot.getTypes(currentHotspotThemeSlug);
    try {
        angular.forEach(vm.hotspotTypes, function(hpType) {
            var customIcon = vm.project.theme_hotspot.config[hpType.name + '_icon_custom'];
            if (customIcon) {
                hpType.icon = customIcon;
            }
        });
    } catch (e) {}
    // functions
    vm.updateScene = updateScene;
    vm.saveDefaultView = saveDefaultView;
    vm.confirmMaxMinZoom = confirmMaxMinZoom;
    vm.saveMinZoom = saveMinZoom;
    vm.saveMaxZoom = saveMaxZoom;
    vm.resetZoom = resetZoom;
    vm.saveNewHotspot = saveNewHotspot;
    vm.saveLimitView = saveLimitView;
    vm.applyLimitForAllScenes = applyLimitForAllScenes;
    vm.resetLimitView = resetLimitView;
    vm.toggleHotspotList = toggleHotspotList;
    vm.deleteHotspot = deleteHotspot;

    vm.littleplanet = littleplanet;

    vm.v = 90;
    vm.h = 90;
    vm.scene.project_slug = vm.project.slug;
    vm.scene.all_scenes = false;
    vm.scene.scenes_columns = [];
    ////////

    function deleteHotspot(id, $event) {
        if ($event) $event.stopPropagation();
        $rootScope.$emit('evt.hotspoteditable.deleteHotspot', id);
    }

    /**
     * Save new hotspot to DB
     * then append it to Sphere viewer
     * @param  {jquery ui object} event
     * @param  {jquery ui object} ui
     * @param  {string} hotspotType [e.g: point, article,...]
     */
    function saveNewHotspot(event, ui, hotspotType) {

        var top = ui.offset.top + 45 / 2 - 48;
        var left = ui.offset.left + 45 / 2 - 240;

        var hotspotView = vm.sceneEditSphere.screentosphere(left, top); // calculate sphere postion of hotspot
        vm.sphereIsLoading = true;
        Hotspot.create(hotspotView.x, hotspotView.y, hotspotType.name, vm.scene._id, vm.project.slug).then(function(res) {
            if (res.data.status == 1) {
                var newHotspot = res.data.hotspot;
                if (!vm.hotspots) {
                    vm.hotspots = [];
                }
                newHotspot.icon = getHotspotDefaultIcon(newHotspot.type);
                vm.hotspots.unshift(newHotspot);
                Alertify.success('Hotspot added');
            }
        }, function(res) {
            Alertify.error('Can not add hotspot');
            console.log(res);
        }).finally(function() {
            vm.sphereIsLoading = false;
        });
    }

    function getHotspotDefaultIcon(type) {
        var icon = '';
        angular.forEach(vm.hotspotTypes, function (hpType) {
            if(hpType.name == type) {
                icon = hpType.icon;
                return;
            }
        });

        return icon;
    }

    // Show/hide hotspot list
    function toggleHotspotList(status) {
        if (status == 'close') {
            angular.element('#hotspot-list').removeClass('active');
        }
        switch (status) {
            case 'close':
                angular.element('#hotspot-list').removeClass('active');
                break;
            case 'open':
                angular.element('#hotspot-list').addClass('active');
                break;
            default:
                angular.element('#hotspot-list').toggleClass('active');
                break;
        }
    }

    function saveLimitView(position) {
        var panoViewerHeight = angular.element('#' + vm.sceneEditSphereViewerDomId).height(),
            panoViewerWidth = angular.element('#' + vm.sceneEditSphereViewerDomId).width();

        if (position == 'top') { vm.scene.limit_view.top = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, 0).y; }
        if (position == 'bottom') { vm.scene.limit_view.bottom = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, panoViewerHeight).y; }
        if (position == 'left') { vm.scene.limit_view.left = vm.sceneEditSphere.screentosphere(0, panoViewerHeight / 2).x; }
        if (position == 'right') { vm.scene.limit_view.right = vm.sceneEditSphere.screentosphere(panoViewerWidth, panoViewerHeight / 2).x; }
        // Save to database
        vm.updateScene('Scene limit ' + position + ' saved');
    }

    function applyLimitForAllScenes() {
        var ERROR_MSG = 'Can not apply limit. Please try again or contact our support',
            SUCCESS_MSG = 'Limit applied successfully';

        // Save to database
        Scene.updateLimitViewForAllScene(vm.scene.limit_view, vm.project._id, vm.project.slug).then(function (status) {
            if(status == 1) {
                Alertify.success(SUCCESS_MSG);

                // Apply for local var
                angular.forEach(vm.project.scenes, function (scene) {
                    scene.limit_view.top = vm.scene.limit_view.top;
                    scene.limit_view.bottom = vm.scene.limit_view.bottom;
                    scene.limit_view.left = vm.scene.limit_view.left;
                    scene.limit_view.right = vm.scene.limit_view.right;
                });
            }else{
                Alertify.error(ERROR_MSG);
            }
        }, function (err) {
            Alertify.error(ERROR_MSG);
        });
    }

    function updateProject(message, callback) {
        Project.update(vm.project).then(function(status) {
            if (status && message) {
                Alertify.success(message);
            }
            if (callback) callback();

        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            vm.isUpdating = '';
        });
    }

    function confirmMaxMinZoom(type){
        if(type == 'min') saveMinZoom();
        if(type == 'max') saveMaxZoom();
        if(type == 'resetZoom') resetZoom();
        
        // Alertify.confirm("Save all Scenes ?").then(
        //     function(){
        //         if(type == 'min') saveMinZoom('all');
        //         if(type == 'max') saveMaxZoom('all');
        //         if(type == 'resetZoom') resetZoom('all');
        //     },
        //     function(){
        //         if(type == 'min') saveMinZoom();
        //         if(type == 'max') saveMaxZoom();
        //         if(type == 'resetZoom') resetZoom();
        //     });
    }

    function saveMinZoom(type) {
        vm.scene.min_zoom = vm.sceneEditSphere.getCurrentView('fov');
        if (vm.scene.min_zoom && vm.scene.max_zoom && vm.scene.min_zoom > vm.scene.max_zoom) {
            Alertify.error('Max zoom must be smaller than Min zoom');
            return;
        } else {
            if(type == "all"){
                vm.scene.all_scenes = true;
                vm.scene.scenes_columns = ['min_zoom'];
            }
            // Save to database
            vm.updateScene('Max zoom saved');
        }
    }

    function saveMaxZoom(type) {
        vm.scene.max_zoom = vm.sceneEditSphere.getCurrentView('fov');
        if (vm.scene.min_zoom && vm.scene.max_zoom && vm.scene.max_zoom < vm.scene.min_zoom) {
            Alertify.error('Min zoom must be greater than Max zoom');
            return;
        } else {
            if(type == "all"){
                vm.scene.all_scenes = true;
                vm.scene.scenes_columns = ['max_zoom'];
            }
            // Save to database
            vm.updateScene('Min zoom saved');
        }
    }

    function resetZoom(type) {
        vm.scene.max_zoom = null;
        vm.scene.min_zoom = null;
        if(type == "all"){
            vm.scene.all_scenes = true;
            vm.scene.scenes_columns = ['max_zoom','min_zoom'];
        }
        vm.updateScene('Zoom limit resetted');
    }

    /**
     * Reset limit view for all or one scene
     * @param  {string} type ['all'/'one']
     */
    function resetLimitView(type) {
        switch(type) {
            case 'all':

                break;
            default:
                vm.scene.limit_view.top = null;
                vm.scene.limit_view.bottom = null;
                vm.scene.limit_view.left = null;
                vm.scene.limit_view.right = null;
                break;
        }
        vm.updateScene('Reset limit view successfully.');
    }

    function saveDefaultView() {
        // TODO: prevent multiple click on short time
        _flashScreen();
        if (angular.isUndefined(vm.scene.default_view)) vm.scene.default_view = {}; // init default_view

        var panoViewerHeight = angular.element('#' + vm.sceneEditSphereViewerDomId).height(),
            panoViewerWidth = angular.element('#' + vm.sceneEditSphereViewerDomId).width(),
            hlookat = vm.sceneEditSphere.screentosphere(panoViewerWidth / 2, panoViewerHeight / 2).x;



        vm.scene.default_view.fov = vm.sceneEditSphere.getCurrentView('fov');
        vm.scene.default_view.hlookat = hlookat;
        vm.scene.default_view.vlookat = vm.sceneEditSphere.getCurrentView('vlookat');

        // Save to database
        vm.updateScene('Default view saved');
    }

    function updateScene(successMessage) {
        Scene.update(vm.scene).then(function(status) {
            if (status == 1) {
                Alertify.success(successMessage);
            } else {
                Alertify.error('Can not update Scene');
            }
            vm.scene.all_scenes = false;
            vm.scene.scenes_column = '';
        }).catch(function(e) {
            console.error(e);
            Alertify.error('Can not update Scene: ' + e);
            vm.scene.all_scenes = false;
            vm.scene.scenes_column = [];
        });

    }

    function littleplanet(){

        if(vm.sceneEditSphere.krpano().get('view.fisheye') == 0){
            vm.v = vm.sceneEditSphere.krpano().get('view.vlookat');
            vm.h = vm.sceneEditSphere.krpano().get('view.hlookat');
            vm.sceneEditSphere.tween('view.fov', 150);
            vm.sceneEditSphere.tween('view.fisheye', 1.0);
            vm.sceneEditSphere.tween('view.vlookat', 90);
            vm.sceneEditSphere.tween('view.hlookat', vm.h);
        }else{
            vm.sceneEditSphere.tween('view.vlookat', vm.v, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.hlookat', vm.h, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.fov', 90, 2.5, 'easeInOutQuad');
            vm.sceneEditSphere.tween('view.fisheye', 0, 2.5, 'easeInOutQuad');
        }
    }

    /**
     * Camera flash effect
     */
    function _flashScreen() {
        var whiteSplash = angular.element('#whiteSplash');
        whiteSplash.hide().removeClass('flash');
        whiteSplash.show().addClass('flash');
        setTimeout(function() {
            whiteSplash.hide();
        }, 200);
    }
}
