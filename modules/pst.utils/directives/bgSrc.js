angular.module('pst.utils')
    .directive('bgSrc', function($rootScope, $timeout) {

        return function(scope, element, attrs) {
            var url = attrs.bgSrc;
            if (url) {
                element.css({
                    'background-image': 'url("' + url + '")'
                });
            }
        }
    });
