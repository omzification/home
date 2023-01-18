angular.module('lapentor.marketplace.plugins')
    .directive('pluginBackgroundsound', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            template: '<audio ng-if="!vm.pluginInterface.config.version" muted="muted" id="background-sound" autoplay><source id="background-source" src="{{ getAudioUrl() }}" type="audio/mpeg"></audio>' +
            '<audio ng-if="vm.pluginInterface.config.version" ng-repeat="audio in vm.pluginInterface.config.audios" muted="muted" id="background-sound-{{ audio._id }}"><source id="background-source-{{ audio._id }}"  type="audio/mpeg"></audio>',
            controller: function($scope, $sce, $rootScope, $timeout) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                if(!vm.pluginInterface.config.version){
                    try {
                        $timeout(function() {
                            document.getElementById("background-sound").onplay = function() {
                                //document.getElementById("background-sound").volume = vm.pluginInterface.config.volume / 100;
                                if (vm.pluginInterface.config.is_loop == 1) {
                                    document.getElementById("background-sound").loop = true;
                                }
                            };
                        });
                    } catch (e) {
                        console.error(e);
                    }
                    try {
                        if (isMobile.any) {
                            $rootScope.$on('evt.allowMusicMobile', function() {
                                if (localStorage.getItem('sound') != "off" && document.getElementById('background-sound')) {
                                    document.getElementById('background-sound').play();
                                }
                            });
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }


                $scope.$on('evt.krpano.onxmlcomplete', onxmlcomplete);

                function onxmlcomplete() {
                    vm.sceneId = $scope.scene._id;

                    if (!angular.isUndefined(vm.pluginInterface.config.audios) && vm.pluginInterface.config.version == 1){
                        angular.forEach(vm.pluginInterface.config.audios, function(audio, key) {

                            var $audio = document.getElementById('background-sound-'+audio._id);
                            var $source = document.getElementById('background-source-'+audio._id);

                            if (!angular.isUndefined(audio['scenes']) && !angular.isUndefined(audio['scenes'][vm.sceneId]) && audio['scenes'][vm.sceneId]){

                                if(angular.isUndefined(audio.run)){

                                    $source.src = audio.path;
                                    $audio.load();
                                    $audio.muted = false;

                                    $rootScope.$on('evt.allowAutoplayAudio', function() {
                                        $audio.play();
                                    });
                                    
                                    var playPromise =  $audio.play();

                                    try {
                                        if (playPromise !== undefined) {
                                            playPromise.catch(function() {
                                                $rootScope.$broadcast('evt.showConfirmPermission');
                                            });
                                        }
                                    } catch (error) {
                                        console.error(error);
                                    }

                                    if(audio.is_loop == "1"){
                                        $audio.loop = true;
                                    }else{
                                        $audio.loop = false;
                                    }
                                    audio.run = true;
                                    try {
                                        if (isMobile.any) {
                                            $rootScope.$on('evt.allowMusicMobile', function() {
                                                if (localStorage.getItem('sound') != "off") {
                                                    $audio.load();
                                                    $audio.play();
                                                    $audio.volume = audio.volume / 100;
                                                }
                                            });
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    }

                                }
                                if(audio.run){
                                    $audio.volume = audio.volume / 100;
                                }
                            }else{
                                if(audio.run){
                                    $audio.volume = 0;
                                }

                            }
                        });
                    }else{
                        try{
                            if (vm.pluginInterface.config.scenes[$scope.scene._id] && vm.pluginInterface.config.scenes[$scope.scene._id] == true) {
                                document.getElementById("background-sound").volume = vm.pluginInterface.config.volume / 100;
                            }else{
                                document.getElementById("background-sound").volume = 0;
                            }
                        }catch(e){
                            // console.error(e);
                        }
                    }
                }
                $scope.getAudioUrl = function() {
                    return $sce.trustAsResourceUrl(vm.pluginInterface.config.src);
                };
            }
        };
    });
