angular.module('lapentor.app')
    .controller('ProjectCtrl', ProjectCtrl);

function ProjectCtrl($scope, $rootScope, $timeout, $state, $filter, ngMeta, Alertify, project, Project, CONST) {
    var vm = this,
        time,
        titleChangeTimeoutPromise;
    ngMeta.setTitle(project.title);

    vm.deleteProject = deleteProject;
    vm.titleIsLoading = false;
    vm.settingIsLoading = false;
    vm.project = project;
    vm.project.public = angular.isDefined(vm.project.public) ? vm.project.public : 1;
    vm.project.in_portfolio = angular.isDefined(vm.project.in_portfolio) ? vm.project.in_portfolio : 1;
    vm.project.shareUrl = $filter('shareUrl')(vm.project.slug);

    vm.updateProject = updateProject;
    vm.updateGoogleProject = updateGoogleProject; // Update project's Google Analytic ID
    vm.updatePublicAccess = updatePublicAccess; // Update project's publicity
    vm.updateCanListInPortfolio = updateCanListInPortfolio;
    vm.updatePasswordProject = updatePasswordProject; // Update project's password
    vm.openMediaLib = openMediaLib;
    vm.openMediaAssetLib = openMediaAssetLib;
    vm.deleteSnapshot = deleteSnapshot; // Delete snapshot

    // Init project meta
    if (angular.isUndefined(vm.project.meta) || vm.project.meta.length == 0) {
        vm.project.meta = {};
        var rawProject = angular.fromJson(angular.toJson(vm.project));
        vm.project.meta.title = rawProject.title;
        if (rawProject.scenes.length && !vm.project.meta.image) {
            vm.project.meta.image = rawProject.scenes[0].pano_thumb;
        }
    }

    // Open media library if there are no scenes
    if (vm.project.scenes.length == 0) {
        $timeout(function() {
            vm.openMediaLib();
        }, 1000);
    }

    // Get exported versions
    getExportedVersions();

    ///////////////

    vm.isDeletingSnapshot = false;
    function deleteSnapshot(id) {
        vm.isDeletingSnapshot = true;
        Project.deleteSnapshot(id).then(function (res) {
            if(res) {
                // delete success
                jQuery('#snapshot'+id).remove();
            }
        }, function (err) {
            console.log(err);
        }).finally(function () {
            vm.isDeletingSnapshot = false;
        });
    }

    function getExportedVersions() {
        Project.getExportedVersions(project._id).then(function(res) {
            vm.exportedVersions = res;
        }, function (err) {
            console.log(err);
        });
    }

    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            vm.project.scenes = createdScenes.concat(vm.project.scenes);
            $state.go('project.editor', { id: createdScenes[0].project_id, scene_id: createdScenes[0]._id });
        }
    }

    // Watch for changes & Update project title 
    $scope.$watch('vm.project.title', function(newVal, oldVal) {
        if (newVal != oldVal) {
            if (titleChangeTimeoutPromise) $timeout.cancel(titleChangeTimeoutPromise);
            titleChangeTimeoutPromise = $timeout(function() {
                vm.titleIsLoading = true;
                updateTitle();
            }, 1000);
        }
    });

    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback
        });
    }

    /**
     * Open media library in Asset tab
     */
    function openMediaAssetLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: __chooseAssetCallback,
            canChooseMultipleFile: false
        });
    }

    /**
     * Callback to receive file choosed from Media Library
     * @param  {object} file [file object contain file info from DB]
     */
    function __chooseAssetCallback(file) {
        if (file.mime_type.indexOf('image') != -1) { // check file type
            vm.project.meta.image = file.path;
        }
    }

    // Update project info
    function updateProject() {
        vm.isSaving = true;
        Project.update(vm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            vm.titleIsLoading = false;
            vm.isSaving = false;
        });
    }
    function updateGoogleProject() {
        vm.isSavingGoogle = true;
        Project.update(vm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            vm.isSavingGoogle = false;
        });
    }

    // Update project title
    function updateTitle() {
        Project.updateTitle(vm.project.title, vm.project._id).then(function(newSlug) {
                vm.project.slug = newSlug;
                vm.project.shareUrl = newSlug;
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.titleIsLoading = false;
            });
    }

    // Update project public access
    function updatePublicAccess() {
        vm.projectPublicityIsLoading = true;
        Project.updatePublicAccess(vm.project.public, vm.project._id).then(function(status) {
                Alertify.success('Project publicity updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.projectPublicityIsLoading = false;
            });
    }

    // Update project can list in portfolio
    function updateCanListInPortfolio() {
        vm.projectCanListInPortfolioLoading = true;
        Project.updateCanListInPortfolio(vm.project.in_portfolio, vm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.projectCanListInPortfolioLoading = false;
            });
    }

    // Update project enable password
    function updatePasswordProject(type) {
        if (type == 'input') {
            $timeout.cancel(time)
            time = $timeout(function() {
                if( vm.project.password.string.length > 5 ){
                    updatePassword();
                }else{
                    Alertify.error('You have entered less than 6 characters for password');
                }
            }, 1500)
        } else {
            updatePassword();
        }
    }

    function updatePassword() {
        vm.isUpdatingPassword = true;
        Project.updatePasswordProject(vm.project.password, vm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                vm.isUpdatingPassword = false;
            });
    }

    // Delete project by id
    function deleteProject() {
        var id = vm.project._id;
        Alertify.confirm('Are you sure? All data will be lost').then(function() {
            // Remove on server
            Project.remove(id).then(function(res) {
                if (res.data.status == 1) {
                    $state.go('index');
                } else {
                    Alertify.error('Can not delete project');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not delete project');
            })
        });
    }

    function downloadProject(id) {
        Alertify.confirm('You will be charged $'+ CONST.export_price +' for each download. <br> Do you want to continue?').then(
            function onOk() {
                vm.isGettingProject = true;
                Project.download(id).then(function (res) {
                    switch(res.status) {
                        case 1:
                            window.open(res.download_link, '_blank');
                            break;
                        case 0: // on trial
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                        case -1: // payment failed
                            // show payment form
                            showDownloadPaymentForm(id);
                            break;
                    }
                }, function (err) {
                    console.log(err)
                    Alertify.error('Can not download project. Please try again');
                }).finally(function () {
                    vm.isGettingProject = false;
                });
            }, 
            function onCancel() {}
        );
    }
}
