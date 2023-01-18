angular.module('lapentor.marketplace.plugins')
    .controller('pluginGalleryConfigCtrl', pluginGalleryConfigCtrl);

function pluginGalleryConfigCtrl($scope, $rootScope,$timeout, $uibModal, lptSphere, LptHelper, project, item) {
    var vm = this,
        enabledSave = true;
    vm.project = project;
    vm.updateConfig = saveGallery;
    vm.openMediaLib = openMediaLib;
    vm.arrayTargetSceneGallery = arrayTargetSceneGallery;
    vm.deletePhoto = deletePhoto;
    vm.config = item.config || {};
    vm.galleryType = {
        'clipped':'Clipped SVG',
        'fancybox': "Fancy"
    }
    // Default config
    vm.config.theme_type = vm.config.theme_type || Object.keys(vm.galleryType)[0];

    vm.sortableOptions = {
        update: function(e, ui) {
            sortGallery();
        }
    };

    if (angular.isUndefined(vm.config)) { vm.config = {}; }
    if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }

    function sortGallery() {
        enabledSave = false;

        angular.element('#gallery').children('.photo').each(function($index) {
                
            var photoId = $(this).attr('photo-id');

            if(vm.config.type == "scene"){
                vm.config.gallery[vm.targetScene][photoId].sort =  $index;
            } 
            if(vm.config.type == "project"){
                vm.config.gallery.project[photoId].sort =  $index;
            }
            
        });

        enabledSave = true;
    }

    function arrayTargetSceneGallery() {

        if(vm.config.type == "scene"){
             return $.map(vm.config.gallery[vm.targetScene], function(value, index) {
                return [value];
            });
        }
        if(vm.config.type == "project"){
             return $.map(vm.config.gallery.project, function(value, index) {
                return [value];
            });
        }
       
    }

    function openMediaLib() {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: true
        });
    }

    function __chooseAssetCallback(files) {
        var fileIds = [];
        if (vm.config.gallery[vm.targetScene]) {
            angular.forEach(vm.config.gallery[vm.targetScene], function(value, key) {
                fileIds.push(value._id);
            });
        }

        angular.forEach(files, function(value, key) {
            var file = value;

            if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {

                if(vm.config.type == "project"){
                    if(!vm.config.gallery.project) vm.config.gallery.project = {};

                    vm.config.gallery.project[file._id] = file;
                }
                if(vm.config.type == "scene"){
                    if(!vm.config.gallery[vm.targetScene]) vm.config.gallery[vm.targetScene] = {};

                    vm.config.gallery[vm.targetScene][file._id] = file;
                }
            }
        });
    }

    function deletePhoto(id){

        if(vm.config.type == "project"){
            delete vm.config.gallery.project[id];
        }
        if(vm.config.type == "scene"){
            delete vm.config.gallery[vm.targetScene][id];
        }

        $timeout(function() {
            sortGallery();
        })
    }

    function saveGallery(){
    
        if(enabledSave == false) return; 

        vm.isUpdating = true;
        $scope.updateConfig(item, vm.config, function() {
            vm.isUpdating = false;
        });
    }

}