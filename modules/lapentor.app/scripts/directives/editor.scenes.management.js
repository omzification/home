angular.module('lapentor.app')
    .directive('editorScenesManagement', function() {

        return {
            restrict: 'E',
            controller: 'EditorScenesManagementCtrl',
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/scenes.management.html'
        };
    });
