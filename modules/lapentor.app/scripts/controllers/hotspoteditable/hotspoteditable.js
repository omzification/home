angular.module('lapentor.app')
    .controller('HotspotEditableCtrl', HotspotEditableCtrl);

function HotspotEditableCtrl($scope, $sce, $rootScope, $element, $timeout, LptHelper, Alertify, Hotspot) {
    var vm = this;

    vm.project = $scope.project; // project data object
    vm.sceneEditSphere = $scope.scenesphereinstance; // instance of lptKrpano of current scene
    vm.hotspot = $scope.hotspot; // hotspot data object
    vm.hotspot.project_slug = vm.project.slug;
    vm.hpIcon = vm.hotspot.icon_custom;


    if (angular.isUndefined(vm.hotspot.width)) { vm.hotspot.width = 45; }
    // if (angular.isUndefined(vm.hotspot.height)) { vm.hotspot.height = 45; }

    vm.currentscene = $scope.currentscene;
    vm.scenes = $scope.scenes;

    vm.currentOpenForm = null;
    vm.formSaving = false; // to toggle form saving loading icon
    vm.isDeleting = false; // to toggle hotspot form delete loading icon

    vm.getTemplateUrl = getTemplateUrl; // get each child directive template url
    vm.openCustomIconMediaLib = openCustomIconMediaLib; // open media library to choose custom hotspot icon
    vm.closeForm = closeForm; // close hotspot form
    vm.saveForm = saveForm; // send form data to API
    vm.deleteHotspot = deleteHotspot; // delete hotspot
    vm.hotspot.name = 'lptHotspot' + vm.hotspot._id;

    // Add hotspots to viewer
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


    vm.hotspot.theme_slug = currentHotspotThemeSlug;

    vm.hotspotCustomSize = {
        floor: 5,
        ceil: 500,
        showSelectionBar: true,
        step: 1
    };
    vm.sceneEditSphere.addHotspot({
        title: vm.hotspot.title,
        name: vm.hotspot.name,
        url: vm.hpIcon?vm.hpIcon+'?'+Date.now():vm._icon_custom?vm._icon_custom+'?'+Date.now():LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + vm.hotspot.position.x)+'?'+Date.now(),
        ath: vm.hotspot.position.x,
        atv: vm.hotspot.position.y,
        width: vm.hotspot.width,
        height: vm.hotspot.width,
        ondown: 'draghotspot()'
    });

    addOnHoverTextstyleEdit(vm.hotspot);
    // Showtext onhover
    function addOnHoverTextstyleEdit(hotspot) {
        vm.sceneEditSphere.set('textstyle', {
            "name": "default_tooltip_style",
            "font": "Arial",
            "fontsize": "13",
            "bold": "true",
            "roundedge": "4",
            "background": "false",
            "border": "false",
            "textcolor": "0xFFFFFF",
            "textalign": "center",
            "vcenter": "true",
            "edge": "bottom",
            "xoffset": "0",
            "yoffset": "0",
            "padding": "10",
            "textshadow": "1.0",
            "textshadowrange": "10.0",
            "textshadowangle": "0",
            "textshadowcolor": "0x000000",
            "textshadowalpha": "1.0",
        });
        vm.sceneEditSphere.addHotspotEventCallback(hotspot.name, 'onhover', 'showtext(' + hotspot.title + ', "default_tooltip_style")');
    }

    // Add event listener when hotspot drag end
    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onDragEnd', ondragend);

    // Add event listener when hotspot is dragging
    vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onDrag', ondrag);

    // Delete hospot event listener
    $rootScope.$on('evt.hotspoteditable.deleteHotspot', function(event, id) {
        deleteHotspot(id);
    });

    ////////////////////

    /**
     * Open Media Library
     */
    function openCustomIconMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: __chooseCustomIconCallback
        });
    }

    function __chooseCustomIconCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.hotspot.icon_custom = file.path;
            vm.hpIcon = file.path;
        } else {
            Alertify.error('Only support png, jpeg, svg, gif format');
        }
    }

    function ondrag() {
        localStorage.setItem('checkmove', true);
        var newX = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'ath'),
            newY = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'atv');
        var Sphere = vm.sceneEditSphere.spheretoscreen(newX, newY);
    }
    /**
     * Event listener when dragend:
     * - update new position
     * - or show form (onclick)
     */
    function ondragend() {
        $timeout(function() {
            localStorage.setItem('checkmove', false);
        }, 100);
        var newX = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'ath'),
            newY = vm.sceneEditSphere.getHotspotParam(vm.hotspot.name, 'atv');

        var SphereOld = vm.sceneEditSphere.spheretoscreen(vm.hotspot.position.x, vm.hotspot.position.y);
        var SphereNew = vm.sceneEditSphere.spheretoscreen(newX, newY);

        vm.hotspot.position.x = newX;
        vm.hotspot.position.y = newY;

        if ((Math.abs(SphereOld.x - SphereNew.x) >= 2) && (Math.abs(SphereOld.y - SphereNew.y) >= 2)) {
            // it really a drag event
            saveForm();
        } else {
            // it just a click event
            showForm();
        }
    }

    /**
     * Update hotspot info to DB
     * @param  {boolean} validateForm [decide wheather to validate the form]
     */
    function saveForm(validateForm) {
        if (!validateForm || (vm.hotspotForm && vm.hotspotForm.$valid)) {
            if (vm.hotspot.content && vm.hotspot.content.indexOf('data:image') !== -1) {
                Alertify.error('Please upload all photos to Media Library instead of pasting it directly');
            } else {
                vm.formSaving = true;

                Hotspot.update(vm.hotspot).then(function(res) {
                    if (res.data.status == 1) {
                        Alertify.success('Hotspot Saved');
                        var now = new Date().getTime();
                        var customIcon = vm.hpIcon?(vm.hpIcon+'?'+ now):vm._icon_custom?vm._icon_custom+'?'+ now:LptHelper.makeUrl(iconPrefix, vm.hotspot.type + '.png?' + now);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'url', customIcon);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'width',vm.hotspot.width);
                        vm.sceneEditSphere.setHotspotParam(vm.hotspot.name,'height',vm.hotspot.width);
                        vm.sceneEditSphere.addHotspotEventCallback(vm.hotspot.name, 'onhover', 'showtext(' + vm.hotspot.title + ', "default_tooltip_style")');
                    } else {
                        console.log(res);
                        Alertify.error('Can not update hotspot');
                    }
                }, function(res) {
                    Alertify.error('Can not update hotspot');
                }).finally(function() {
                    vm.formSaving = false;
                });
            }
        }
    }

    function getTemplateUrl() {
        return 'modules/lapentor.app/views/partials/hotspots/' + vm.hotspot.type + '.html';
    }

    /**
     * Show Hotspot form
     */
    function showForm() {
        angular.element('.hotspot-form-wrapper').hide();
        vm.currentOpenForm = vm.hotspot.name;
        angular.element('#' + vm.hotspot.name).show();
        $rootScope.$broadcast('evt.hotspoteditable.formShowed', vm.hotspot._id);
        $timeout(function () {
            $scope.$broadcast('rzSliderForceRender');
        },1000);
    }

    /**
     * Close Hotspot form
     */
    function closeForm() {
        vm.currentOpenForm = null;
        if (vm.hotspot.type == 'point' || vm.hotspot.type == 'article') {
            // prevent point hotspot form to reinit each time the form show, it impact too much on performance
            angular.element('#' + vm.hotspot.name).hide();
        }
    }

    function deleteHotspot(id) {
        if (vm.hotspot._id == id) {
            vm.isDeleting = true;

            Alertify.confirm('Are you sure?').then(function() {
                $rootScope.$emit('evt.editor.isloading', true);
                // Remove hotspot from DB
                Hotspot.remove(vm.hotspot._id, vm.hotspot.project_slug).then(function(res) {
                    Alertify.success('Hotspot deleted');
                    vm.sceneEditSphere.deleteHotspot(vm.hotspot.name); // delete hotspot from viewer
                    $rootScope.$emit('evt.hotspoteditable.hospotDeleted', vm.hotspot._id); // fire event to delete hotspot in js object
                }).finally(function() {
                    vm.isDeleting = false;
                    $rootScope.$emit('evt.editor.isloading', false);
                });
            }).finally(function() {
                vm.isDeleting = false;
            });
        }

    }
}
