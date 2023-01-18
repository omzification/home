angular.module('lapentor.app')
    .directive('resolveLoader', function($rootScope, $timeout, $interval) {

        return {
            restrict: 'E',
            replace: true,
            templateUrl: 'modules/loading.html',
            link: function(scope, element) {

                $rootScope.$on('$stateChangeStart', function(event, currentRoute, previousRoute) {
                    // if (previousRoute) return;

                    $timeout(function() {
                        element.removeClass('ng-hide');
                    });
                });

                $rootScope.$on('$stateChangeSuccess', function() {
                    $timeout(function() {
                        element.addClass('ng-hide');
                    });
                });
            },
            controller: function() {
                var vm = this,
                    idx = 0,
                    loadingMsg1 = [
                        "Loading your experiences...",
                        "Getting things ready...",
                        "This take quite long huh...but don't leave us :(",
                        "Wow, this is really slow, would you like a joke",
                        "Knock knock...",
                        "Who's there?",
                        "Hi, this is Lapentor",
                        "That's all :P"
                    ],
                    availableLoadingIcon = [
                        'audio',
                        'ball-triangle',
                        'bars',
                        'circles',
                        'grid',
                        'hearts',
                        'oval',
                        'puff-dark',
                        'puff',
                        'rings',
                        'spinning-circles',
                        'tail-spin',
                        'three-dots',
                    ],
                    intervalPromise;

                vm.isDead = false;
                vm.selectedText = loadingMsg1[0];
                vm.isLoading = true;
                vm.loadingIcon = availableLoadingIcon[6];

                $rootScope.$on('$stateChangeSuccess', function() {
                    // $interval.cancel(intervalPromise);
                });

                $rootScope.$on('$stateChangeError', function() {
                    // $interval.cancel(intervalPromise);
                    vm.isDead = true;
                    vm.selectedText = 'Hmm...Please refresh your browser to try again...';
                    vm.isLoading = false;
                });
            },
            controllerAs: 'vm'
        };
    });