angular.module('lapentor.app')
    .controller('ProjectSettingModalCtrl', ProjectSettingModalCtrl);

function ProjectSettingModalCtrl($scope, $rootScope, $uibModal) {
    // Listen for open media lib event
    $rootScope.$on('evt.openProjectSettingModal', function(event, project) {
        $scope.project = project;

        $uibModal.open({
            templateUrl: "modules/lapentor.app/views/partials/project.setting.modal.html",
            scope: $scope,
            controllerAs: "projectSettingVm",
            controller: function($scope, $uibModalInstance, Alertify, Project) {
                var projectSettingVm = this;

                projectSettingVm.dismiss = dismiss;
                projectSettingVm.project = $scope.project;
                projectSettingVm.updateProject = updateProject;

                // Close Media Library
                function dismiss() {
                    $uibModalInstance.dismiss();
                    angular.element('body').removeClass('modal-open');
                    angular.element('.modal-backdrop').remove();
                }

                function updateProject() {
                    projectSettingVm.isLoading = true;
                    Project.update(projectSettingVm.project).then(function(status) {
                        if (status != 1) {
                            Alertify.error('Can not update project');
                        }else{
                            Alertify.success('Project saved');
                        }
                    }).finally(function() {
                        projectSettingVm.isLoading = false;
                    });
                }
            },
        });
    });
}
