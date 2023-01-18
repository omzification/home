angular.module('lapentor.app')
    .controller('HotspotEditableTextfCtrl', HotspotEditableTextfCtrl);

function HotspotEditableTextfCtrl($scope, $rootScope) {
    var vm = $scope.vm;

    var MediaLibButton = function (context) {
        var ui = $.summernote.ui;

        // create button
        var button = ui.button({
            contents: '<i class="note-icon-picture"></i>',
            tooltip: 'Image',
            click: function () {
                context.invoke('editor.saveRange');

                $rootScope.$broadcast('evt.openMediaLib', {
                    tab: 'asset',
                    chooseAssetCallback: function(files){
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

        return button.render();   // return button as jquery object
    }

    vm.textfSummernoteOptions = {
        height: 200,
        focus: true,
        dialogsInBody: true,
        buttons: {
            mediaLib: MediaLibButton
        },
        toolbar: [
            ['style', ['bold', 'italic', 'underline', 'strikethrough','fontname','fontsize','color','ul', 'paragraph', 'lineheight','table','link', 'mediaLib', 'video', 'hr','style','fullscreen', 'codeview']],
        ]
    };
}
