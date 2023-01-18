// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('controlbarDefault', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/default/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $window, Marketplace) {
                var vm = this;
                vm.project = $scope.project;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                vm.config = vm.project.theme_controlbar.config;

                initScrollbar();

                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                }catch(e) {
                    vm.themeStyle = {};
                }
                function initScrollbar() {
                    if (isMobile.any || $window.innerWidth <= 640) {
                        $timeout(function () {
                            jQuery('#controlbar-default>ul').mCustomScrollbar({
                                axis: 'x',
                                advanced:{ autoExpandHorizontalScroll: 'x' }
                            });    
                        },500);
                    }
                }
            }
        };
    });
