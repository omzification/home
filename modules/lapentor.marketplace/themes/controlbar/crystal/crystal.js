// Theme: crystal
angular.module('lapentor.marketplace.themes')
    .directive('controlbarCrystal', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/crystal/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, Marketplace, $rootScope, $window) {
                var vm = this;
                vm.project = $scope.project;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                vm.config = vm.project.theme_controlbar.config;

                // init config
                vm.config.position = vm.config.position || 'top';

                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                } catch (e) {
                    vm.themeStyle = {};
                }
                $rootScope.$on('evt.onsphereclick', function() {
                    if ($('#controlbar-crystal').hasClass('off')) {
                        $rootScope.isScenelistOff = false;

                        $('#controlbar-crystal').removeClass('off');
                    } else {
                        $('#controlbar-crystal').addClass('off');
                        $rootScope.isScenelistOff = true;
                    }
                });

                // Apply scroll for mobile or small screen devices
                if (isMobile.any || $window.innerWidth <= 640) {
                    $timeout(function () {
                        jQuery('#controlbar-crystal>ul').mCustomScrollbar({
                            axis: (vm.config.position == 'top' || vm.config.position == 'bottom') ? 'x':'y',
                            advanced:{ autoExpandHorizontalScroll: 'x' }
                        });    
                    },500);
                }
            }
        };
    });