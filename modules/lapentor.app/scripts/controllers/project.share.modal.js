angular.module('lapentor.app')
    .controller('ProjectShareModalCtrl', ProjectShareModalCtrl);

function ProjectShareModalCtrl($scope, $rootScope, $uibModal, envService) {
    // Listen for open media lib event
    $rootScope.$on('evt.openProjectShareModal', function(event, project) {
        $scope.project = project;

        $uibModal.open({
            templateUrl: "modules/lapentor.app/views/partials/project.share.modal.html",
            scope: $scope,
            controllerAs: "projectShareVm",
            controller: function($scope, $uibModalInstance, Alertify, Project) {
                var projectShareVm = this;
                projectShareVm.project = $scope.project;

                projectShareVm.shareUrl = envService.read('siteUrl') + '/sphere/' + projectShareVm.project.slug;

                projectShareVm.dismiss = dismiss;

                // Close Modal
                function dismiss() {
                    $uibModalInstance.dismiss();
                    angular.element('body').removeClass('modal-open');
                    angular.element('.modal-backdrop').remove();
                }
            },
        });
    });
}
