angular.module('lapentor.app')
    .controller('ShowcaseCtrl', ShowcaseCtrl);

function ShowcaseCtrl($scope, $stateParams, ngMeta, $filter, user, Showcase) {
    var vm = this;
    vm.user = user;
    vm.user.sceneCount = 0;
    angular.forEach(vm.user.projects, function(p) {
        vm.user.sceneCount += p.scenes.length;
    });

    vm.openProject = function(slug) {
        window.open($filter('shareUrl')(slug));
    }

    try {
        if (angular.isDefined(user.first_name) && angular.isDefined(user.last_name)) {
            if (user.first_name != '' || user.last_name != '') {
                ngMeta.setTitle(user.first_name + ' ' + user.last_name);
            }
        }else{
            ngMeta.setTitle(user.username);
        }

        if (user.bio != '') ngMeta.setTag('description', user.bio);
        if (angular.isDefined(user.avatar) && user.avatar != '') {
            var ogImage = user.avatar.replace(/^https:\/\//i, 'http://');
            ngMeta.setTag('image', ogImage);
        } else {
            if (angular.isDefined(user.cover) && user.cover != '') {
                var ogImage = user.cover.replace(/^https:\/\//i, 'http://');
                ngMeta.setTag('image', ogImage);
            }
        }
    } catch (e) {
        ngMeta.setTitle(user.username);
        console.error(e);
    }

}
