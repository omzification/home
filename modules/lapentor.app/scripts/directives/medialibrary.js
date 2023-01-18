angular.module('lapentor.app')
    .directive('mediaLibrary', function() {

        return {
            restrict: 'E',
            controller: 'MediaLibraryCtrl',
            controllerAs: 'vm',
            scope: {
            	project: '=',
                chooseAsset: '&'
            }
        };
    });
