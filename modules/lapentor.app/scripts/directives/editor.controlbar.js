angular.module('lapentor.app')
    .directive('editorControlbar', function() {

        return {
            restrict: 'E',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/editor.controlbar.html',
            controller: 'EditorControlBarCtrl',
            controllerAs: 'ebVm'
        };
    });
