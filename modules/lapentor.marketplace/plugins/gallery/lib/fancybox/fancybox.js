angular.module('lapentor.marketplace.plugins')
    .directive('pluginGalleryFancybox', function() {
        return {
            restrict: 'E',
            //templateUrl: Config.PLUGIN_PATH + '/gallery/lib/royalslider/royalslider.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout, $ocLazyLoad) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.gallery = [];
                vm.ShowGallery = false;

                if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }
                if (!vm.config.type) vm.config.type = 'project';

                if (vm.config.gallery.project && vm.config.type == 'project') {

                    vm.gallery = $.map(vm.config.gallery.project, function(value, index) {
                        return [value];
                    });


                }
                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    if (vm.config.type == 'scene') {
                        if (!vm.config.gallery[$scope.scene._id]) vm.gallery = [];

                        vm.gallery = $.map(vm.config.gallery[$scope.scene._id], function(value, index) {
                            return [value];
                        });


                    }
                });

                if(vm.config.show_on_start == 'yes') {
                    $timeout(function () {
                        openFancybox();
                    });
                }


                var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'gallery-';
                $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                    if (eventType == 'click') {
                        openFancybox();
                    }
                });

                function openFancybox(){
                    var arrayFancy = [];
                    vm.gallery = vm.gallery.sort(function (a, b) {
                        return (a.sort - b.sort );
                    });
                    angular.forEach(vm.gallery, function(img, key) {
                        
                        arrayFancy.push({
                            src  :  img.path,
                            opts : {
                                //caption : $(this).attr('title')
                            }
                        })    
                    });
        
                    $.fancybox.open(arrayFancy, {
                        loop : true
                    });
                }
            }
        }
    });
