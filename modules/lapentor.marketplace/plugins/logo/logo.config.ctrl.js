angular.module('lapentor.marketplace.plugins')
    .controller('pluginLogoConfigCtrl', function($scope, $timeout, $rootScope, $ocLazyLoad, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        vm.scenes = project.scenes;
        vm.config = angular.isDefined(item.config) ? item.config : {};
        vm.config.icon = angular.isDefined(vm.config.icon) ? vm.config.icon : '';
        vm.config.width = angular.isDefined(vm.config.width) ? vm.config.width : 100;
        vm.config.height = angular.isDefined(vm.config.height) ? vm.config.height : 100;
        vm.config.oldWidth = angular.isDefined(vm.config.oldWidth) ? vm.config.oldWidth : 100;
        vm.config.oldHeight = angular.isDefined(vm.config.oldHeight) ? vm.config.oldHeight : 100;
        vm.config.margin_top = angular.isDefined(vm.config.margin_top) ? vm.config.margin_top : 10;
        vm.config.margin_left = angular.isDefined(vm.config.margin_left) ? vm.config.margin_left : 10;
        vm.config.margin_bottom = angular.isDefined(vm.config.margin_bottom) ? vm.config.margin_bottom : 10;
        vm.config.margin_right = angular.isDefined(vm.config.margin_right) ? vm.config.margin_right : 10;
        vm.config.autoSize = angular.isDefined(vm.config.autoSize) ? vm.config.autoSize : true;

        vm.config.logos = angular.isDefined(vm.config.logos) ? vm.config.logos : {};
        if(vm.config.logos.length == 0 ){
            vm.config.logos = {};
        }
        vm.changeWidth = changeWidth;
        vm.updateConfig = updateConfig;
        vm.arrayTargetLogos = arrayTargetLogos;

        vm.sortableOptions = {
            update: function(e, ui) {
                sortLogos();
            }
        };

        vm.openMediaLib = function() {

            $rootScope.$broadcast('evt.openMediaLib', {
                tab: 'asset',
                chooseAssetCallback: __chooseAssetCallbackIcon,
                canChooseMultipleFile: true
            });
        }

        vm.showOptionLogo = function(id){
            vm.targetLogo = id;
            vm.config.logos[vm.targetLogo]['scenes'] = vm.config.logos[vm.targetLogo]['scenes'] || {};
            angular.forEach(vm.scenes, function(scene, key) {
                //vm.config.logos[vm.targetLogo]['scenes'][scene._id] = vm.config.logos[vm.targetLogo]['scenes'][scene._id] || true;
                if (angular.isUndefined(vm.config.logos[vm.targetLogo]['scenes'][scene._id])){
                    vm.config.logos[vm.targetLogo]['scenes'][scene._id] = true;
                    vm.config.logos[vm.targetLogo].margin_top = 10;
                    vm.config.logos[vm.targetLogo].margin_bottom = 10;
                    vm.config.logos[vm.targetLogo].margin_left = 10;
                    vm.config.logos[vm.targetLogo].margin_right = 10;
                }
            });
            vm.selectScene();
        }

        vm.deleteLogo = function(id){
            delete vm.config.logos[id];
        }

        vm.toggleAll = function() {
            var toggleStatus = vm.select_all;
            angular.forEach(vm.config.logos[vm.targetLogo]['scenes'], function(itm,key){ vm.config.logos[vm.targetLogo]['scenes'][key] = toggleStatus;});
        }

        vm.selectScene = function() {
            vm.select_all = true;
            angular.forEach(vm.config.logos[vm.targetLogo]['scenes'], function(itm,key){ if(!itm)vm.select_all = false; });

        }

        function arrayTargetLogos() {
            return $.map(vm.config.logos, function(value, index) {
                return [value];
            });
        }

        function sortLogos() {

            angular.element('.list-logos').children('.item-logo').each(function($index) {
                var logoId = $(this).attr('logo-id');
                vm.config.logos[logoId].sort =  $index;

            });
        }

        function __chooseAssetCallbackIcon(files) {

                var fileIds = [];
                if (vm.config.logos) {
                    angular.forEach(vm.config.logos, function(value, key) {
                        fileIds.push(value._id);
                    });
                }

                angular.forEach(files, function(value, key) {
                    var file = value;

                    file.oldWidth = file.width;
                    file.oldHeight = file.height;
                    if (file.mime_type.indexOf('image') != -1 && fileIds.indexOf(file._id) < 0) {

                        vm.config.logos[file._id] = file;
                        //vm.config.logos[file._id].sort = key;
                    }
                });
                sortLogos();
            //}
        }

        function changeWidth() {
            vm.config.logos[vm.targetLogo].height = parseInt(vm.config.logos[vm.targetLogo].width / vm.config.logos[vm.targetLogo].oldWidth * vm.config.logos[vm.targetLogo].oldHeight);
        }


        function updateConfig() {
            vm.isUpdating = true;
            vm.config.version = 1;

            vm.config.width = vm.config.width > 0 ? vm.config.width : 0;
            vm.config.height = vm.config.height > 0 ? vm.config.height : 0;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    });
