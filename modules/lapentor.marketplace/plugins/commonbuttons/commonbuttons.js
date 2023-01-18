angular.module('lapentor.marketplace.plugins')
    .directive('pluginCommonbuttons', function() {
        return {
            restrict: 'E',
            controllerAs: 'vm',
            controller: function($scope, $rootScope) {
                var vm = $scope.pluginVm;

                // Listen for button click on control bar
                var eventPrefix = 'evt.controlbar.' + vm.plugin.slug + 'commonbuttons-';
                $rootScope.$on(eventPrefix+'zoomin', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.zoomIn();
                    }
                });
                $rootScope.$on(eventPrefix+'zoomout', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.zoomOut();
                    }
                });
                $rootScope.$on(eventPrefix+'fullscreen', function(event, eventType) {
                    if (eventType == 'click') {
                        vm.lptsphereinstance.toggleFullScreen();
                    }
                });
                $rootScope.$on(eventPrefix+'up', function(event, eventType) {
                    if (eventType == 'click') {
                        var vlookat = vm.lptsphereinstance.krpano().get('view.vlookat') - 10;
                        vm.lptsphereinstance.tween('view.vlookat',vlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'down', function(event, eventType) {
                    if (eventType == 'click') {
                        var vlookat = vm.lptsphereinstance.krpano().get('view.vlookat') + 10;
                        vm.lptsphereinstance.tween('view.vlookat',vlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'left', function(event, eventType) {
                    if (eventType == 'click') {
                        var hlookat = vm.lptsphereinstance.krpano().get('view.hlookat') - 10;
                        vm.lptsphereinstance.tween('view.hlookat',hlookat);
                    }
                });
                $rootScope.$on(eventPrefix+'right', function(event, eventType) {
                    if (eventType == 'click') {
                        var hlookat = vm.lptsphereinstance.krpano().get('view.hlookat') + 10;
                        vm.lptsphereinstance.tween('view.hlookat',hlookat);
                    }
                });
                var isplay = true;
                $rootScope.$on(eventPrefix+'sound', function(event, eventType) {
                    if (eventType == 'click') {
                        var audios = angular.element('audio');
                        if(isplay) {
                            // angular.element('#commonbuttons-sound span').css('background-image','url('+vm.pluginPath + '/images/soundoff.svg'+')');
                            angular.forEach(audios, function(audio){
                                audio.pause();
                            });
                            isplay = false;
                            localStorage.setItem('sound','off');
                            $rootScope.$emit('evt.commonbuttons.togglesound', 'off');
                        }else{
                            isplay = true;
                            // angular.element('#commonbuttons-sound span').css('background-image','url('+vm.pluginPath + '/images/soundon.svg'+')');
                            angular.forEach(audios, function(audio){
                                audio.play();
                            });
                            localStorage.setItem('sound','on');
                            $rootScope.$emit('evt.commonbuttons.togglesound', 'on');
                        }

                    }
                });
            }
        };
    });
