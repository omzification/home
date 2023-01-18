angular.module('pst.utils')
    .directive("loadingSrc", function() {
        return {
            link: function(scope, element, attrs) {
                var img, loadImage;
                img = null;
                loadImage = function() {
                    element[0].src = "bower_components/SVG-Loaders/svg-loaders/puff-dark.svg";

                    img = new Image();
                    img.src = attrs.loadingSrc;

                    img.onload = function() {
                        element[0].src = attrs.loadingSrc;
                    };
                };

                scope.$watch(function() {
                    return attrs.loadingSrc;
                }, function(newVal, oldVal) {
                    loadImage();
                });
            }
        };
    });
