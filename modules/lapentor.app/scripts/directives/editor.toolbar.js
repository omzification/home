angular.module('lapentor.app')
    .directive('editorToolbar', function() {

        return {
            restrict: 'E',
            controller: 'EditorToolbarCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/toolbar.html'
        };
    });
