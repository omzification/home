angular.module('lapentor.marketplace.plugins')
    .controller('pluginIntropopupConfigCtrl', pluginIntropopupConfigCtrl);


function pluginIntropopupConfigCtrl($scope, $http, $rootScope, $ocLazyLoad, Alertify, project, item) {
    var vm = this;

    vm.project = project;
    vm.config = item.config;
    vm.updateConfig = saveIntroPopup;
    vm.introTheme = {
        'fullscreen': 'Full screen',
        'circle': 'Circle',
        'bootstrap': 'Popup'
    };
    vm.googlefonts = [];

    vm.config = vm.config || {};
    vm.config.theme_type = vm.config.theme_type || 'fullscreen';
    vm.fontFamilyChange = fontFamilyChange;

    vm.summernoteOptions = {
        height: 300,
        focus: true,
        dialogsInBody: true,
        toolbar: [
            ['headline', ['style']],
            ['style', ['bold', 'italic', 'underline', 'strikethrough', 'clear']],
            ['fontface', ['fontname']],
            ['textsize', ['fontsize']],
            ['fontclr', ['color']],
            ['alignment', ['ul', 'ol', 'paragraph', 'lineheight']],
            ['height', ['height']],
            ['table', ['table']],
            ['insert', ['link', 'image', 'video', 'hr']],
            ['view', ['fullscreen', 'codeview']]
        ],
        buttons: {
            image: imageButton
        }
    };

    if(vm.config.fontfamily){
        $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
    }

    //////////

    $http.get('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDY31rAJVkfb6GoONiVs03LB87ThdbHZj0')
    .then(function(res) {
        if(res.data) {
            vm.googlefonts = res.data.items;
        }
    }, function(res) {
        console.log(res);
    });

    //////////

    function fontFamilyChange(){
        if(!angular.isDefined(vm.config.fontfamily) ||  vm.config.fontfamily !=""){
            $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
        }
    }

    function imageButton(context) {
        var ui = $.summernote.ui;

        // create button
        var button = ui.button({
            contents: '<i class="note-icon-picture"/>',
            tooltip: 'Image',
            click: function() {
                // invoke insertText method with 'hello' on editor module.
                context.invoke('editor.saveRange');
                $rootScope.$broadcast('evt.openMediaLib', {
                    tab: 'asset',
                    chooseAssetCallback: function(files) {
                        context.invoke('editor.restoreRange');

                        angular.forEach(files, function(file, key) {
                            if (file.mime_type.indexOf('image') != -1) {
                                context.invoke('editor.insertImage',file.path );
                            }
                        });
                    },
                    canelMediaLibCallback: function(){
                        context.invoke('editor.restoreRange');
                    },
                    canChooseMultipleFile: true
                });
            }
        });

        return button.render();
    }

    function saveIntroPopup() {
        if (vm.config.content && vm.config.content.indexOf('data:image') !== -1) {
            Alertify.error('Please upload all photos to Media Library instead of pasting it directly');
        } else {
            vm.isUpdating = true;
    
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }
    }
}
