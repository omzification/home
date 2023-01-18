angular.module('lapentor.marketplace.plugins')
    .directive('pluginArrows', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            template: '<style>.hotspot-{{project.theme_hotspot.slug}}-point{display: none!important;}</style>',
            controller: function($scope, $ocLazyLoad, $timeout, $rootScope, LptHelper) {

                var vm = $scope.pluginVm,
                    loop = 0,
                    krpano = vm.lptsphereinstance.krpano();
                $scope.$on('evt.krpano.onxmlcomplete', function() {
                    krpano.set('krpano.arrows',true);
                    var webvrIsEnable = krpano.get('webvr.isenabled');
                    try {
                        if (!webvrIsEnable &&  krpano.get('view.fisheye') == 0) {
                            addchevrons();

                        }
                    } catch (e) {
                        console.error(e);
                        addchevrons();
                    }
                    angular.element('.hotspot-' + $scope.project.theme_hotspot.slug + '-point').css('display', 'none');
                });

                function addchevrons() {
                    var y = 0;

                    for (var i = 0; i < krpano.get('hotspot.count'); i++) {

                        if(krpano.get('hotspot['+i+'].lpttype') && krpano.get('hotspot['+i+'].sceneId') == krpano.get('krpano.sceneId') && krpano.get('hotspot['+i+'].hptype') !='clone' ){
                            if(krpano.get('hotspot['+i+'].lpttype') == 'point' ){
                                if(krpano.get('hotspot['+i+'].onclick') != null){
                                    y++;
                                }
                            }else{
                                y++;
                            }
                        }            
                    }

                    if( y == $scope.scene.hotspots.length ){
                        krpano.call("removechevrons()");
                        krpano.call("addchevrons()");
                    }else{
                        if(loop < 50 ){
                            loop++;
                            $timeout(function() {
                               addchevrons();     
                            }, 100);
                        } 
                    }
                }
            }
        }
    });
