// Theme: default
angular.module('lapentor.marketplace.themes')
    .directive('controlbarSlash', function() {
        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.marketplace/themes/controlbar/slash/tpl/template.html',
            controllerAs: 'vm',
            controller: function($scope, $timeout, $window, Marketplace) {
                var vm = this;
                vm.project = $scope.project;
                vm.config = vm.project.theme_controlbar.config;
                vm.availableButtons = Marketplace.getPluginButtons(vm.project.plugins);
                try {
                    vm.themeStyle = {
                        'background-color': vm.config.bg_color
                    }
                    vm.minimize = vm.config.minimize?vm.config.minimize:false;
                }catch(e) {
                    vm.themeStyle = {};
                }

                // initScrollbar();

                /////////

                // function initScrollbar() {
                //     if (isMobile.any || $window.innerWidth <= 640) {
                //         $timeout(function () {
                //             jQuery('#controlbar-slash ul').mCustomScrollbar({
                //                 axis: 'x',
                //                 advanced:{ autoExpandHorizontalScroll: 'x' }
                //             });    
                //         },500);
                //     }
                // }

            }
        };
    });
