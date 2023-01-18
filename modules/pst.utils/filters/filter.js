angular.module('pst.utils')
    .filter('formatNumber', function() {
        return function(input) {
            if (angular.isUndefined(input)) return "00";
            if (input >= 10) return input;

            return "0" + input;
        }
    })
    .filter('parseEmbed', function() {
        return function(input) {
            function convertMedia(html) {
                try {
                    var pattern1 = /(?:http?s?:\/\/)?(?:www\.)?(?:vimeo\.com)\/?(.+)/g;
                    var pattern2 = /(?:http?s?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
                    var pattern3 = /([-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?(?:jpg|jpeg|gif|png))/gi;

                    if (pattern1.test(html)) {
                        var replacement = '<iframe width="100%" height="345" src="//player.vimeo.com/video/$1" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';

                        var html = html.replace(pattern1, replacement);
                    }


                    if (pattern2.test(html)) {
                        var replacement = '<iframe width="100%" height="345" src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>';
                        var html = html.replace(pattern2, replacement);
                    }


                    if (pattern3.test(html)) {
                        var replacement = '<a href="$1" target="_blank"><img class="sml" src="$1" /></a><br />';
                        var html = html.replace(pattern3, replacement);
                    }
                }catch(e){
                    return false;
                }
                return html;
            }

            return convertMedia(input);
        }
    });
