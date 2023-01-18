angular.module('lapentor.app')
    .controller('ProjectEditorCtrl', ProjectEditorCtrl)
    .controller('ProjectConfigModalCtrl', ProjectConfigModalCtrl);

function ProjectEditorCtrl($scope, ngMeta, $uibModal, $compile, $state, $rootScope, $timeout, $stateParams, envService, Alertify, project, Scene, lptSphere, Hotspot, LptHelper, user) {
    var vm = this,
        titleChangeTimeoutPromise,
        sceneEditSphereViewerDomId = 'SphereEditable';

    vm.project = $scope.project = project;
    vm.user = user;
    vm.sphereIsLoading = false;
    vm.sceneEditSphereViewerDomId = sceneEditSphereViewerDomId;
    vm.project.shareUrl = envService.read('siteUrl') + '/sphere/' + vm.project.slug;
    vm.groups = vm.project.groups; // all groups
    vm.scene = LptHelper.getObjectBy('_id', $stateParams.scene_id, vm.project.scenes, vm.project.scenes && vm.project.scenes.length ? vm.project.scenes[0] : {}); // current scene
    vm.sceneEditSphere = new lptSphere(vm.scene._id);
    vm.hotspotTypes = Hotspot.getTypes();
    vm.minimizeMarket = true;
    vm.headerSceneTitleIsLoading = false;
    vm.hideAllEditor = true; // use to show/hide all editor element
    vm.fov = 90;

    vm.openLiveView = openLiveView;
    vm.openMediaLib = openMediaLib;

    ngMeta.setTitle([project.title, vm.scene.title].join(' - '));

    ///////////////////

    // Open media library if there are no scenes
    if (vm.project.scenes.length == 0) {
        $timeout(function() {
            vm.openMediaLib();
        }, 1000);
    }

    // Show/Hide crisp live chat
    angular.element('body').addClass('onEditor');
    $scope.$on("$destroy", function() {
        angular.element('body').removeClass('onEditor');
    });

    // Init Sphere viewer
    $timeout(function() {
        if (angular.isDefined(vm.scene.xml)) {
            var defaultSettings = {};

            if (vm.scene.default_view) {
                defaultSettings = {
                    'view.maxpixelzoom': 0,
                    'view.hlookat': vm.scene.default_view.hlookat,
                    'view.vlookat': vm.scene.default_view.vlookat,
                    'view.fov': (vm.scene.default_view.fov != 120) ? vm.scene.default_view.fov : 90
                };

                vm.fov = (vm.scene.default_view.fov != 120) ? vm.scene.default_view.fov : 90;
            }

            vm.sceneEditSphere.init(sceneEditSphereViewerDomId, vm.scene.xml, defaultSettings);
        } else {
            vm.sceneEditSphere.init(sceneEditSphereViewerDomId, envService.read('apiUrl') + '/xml-cube');
        }

        vm.sceneEditSphere.on('onxmlcomplete', function() {
            if (angular.isDefined(vm.scene.hotspots)) {
                vm.hotspots = vm.scene.hotspots ? vm.scene.hotspots : [];
                angular.forEach(vm.hotspots, function(hp) {
                    hp.icon = getHotspotIcon(hp.type);
                });
                $scope.$digest();
            }
        });

        // Show fov (zoom level) real time
        $scope.$on('evt.krpano.onmousewheel', function() {
            vm.fov = vm.sceneEditSphere.getCurrentView('fov');
            $scope.$apply();
        });
    });

    // Listen for hotspot deleting event
    $rootScope.$on('evt.hotspoteditable.hospotDeleted', function(evt, id) {
        try {
            vm.hotspots = vm.hotspots.filter(function(hotspot) {
                return (hotspot._id != id);
            });
        } catch (e) {
            console.error(e);
        }
    });

    // Listen for sphere loading event
    $rootScope.$on('evt.editor.isloading', function(evt, isloading) {
        vm.sphereIsLoading = isloading;
    });

    // Listen for open live view event
    $rootScope.$on('evt.editor.openLiveView', function() {
        openLiveView();
    });

    vm.modalProjectConfigure = function() {
        $uibModal.open({
            templateUrl: 'modules/lapentor.app/views/partials/project.editor/project_configure.html',
            scope: $scope,
            controllerAs: 'pcmVm',
            controller: ProjectConfigModalCtrl,
        });
    }

    /////// function declaration

    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback
        });
    }

    function getHotspotIcon(type) {
        var hotspotType = LptHelper.getObjectBy('name', type, Hotspot.getTypes(vm.project.theme_hotspot ? vm.project.theme_hotspot.slug : ''));
        return hotspotType.icon;
    }

    function openLiveView() {
        window.open(vm.project.shareUrl + '?scene=' + vm.scene._id + '&token=' + localStorage.getItem('satellizer_token'), 'lptLiveView');
    }

}

/**
 * Controller for Project config modal
 * templateUrl: 'modules/lapentor.app/views/partials/project.editor/project_configure.html'
 */
function ProjectConfigModalCtrl($scope, $rootScope, $timeout, $state, $filter, $uibModalInstance, ngMeta, Alertify, CONST, Project) {
    var pcmVm = this; // A.K.A: Project config modal vm

    pcmVm.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };

    var vm = this,
        time,
        titleChangeTimeoutPromise;
    ngMeta.setTitle($scope.project.title);

    pcmVm.deleteProject = deleteProject;
    pcmVm.titleIsLoading = false;
    pcmVm.settingIsLoading = false;
    pcmVm.project = $scope.project;
    pcmVm.project.public = angular.isDefined(pcmVm.project.public) ? pcmVm.project.public : 1;
    pcmVm.project.in_portfolio = angular.isDefined(pcmVm.project.in_portfolio) ? pcmVm.project.in_portfolio : 1;
    pcmVm.project.shareUrl = $filter('shareUrl')(pcmVm.project.slug);

    pcmVm.updateProject = updateProject;
    pcmVm.updateGoogleProject = updateGoogleProject; // Update project's Google Analytic ID
    pcmVm.updatePublicAccess = updatePublicAccess; // Update project's publicity
    pcmVm.updateCanListInPortfolio = updateCanListInPortfolio;
    pcmVm.updatePasswordProject = updatePasswordProject; // Update project's password
    pcmVm.openMediaAssetLib = openMediaAssetLib;
    pcmVm.deleteSnapshot = deleteSnapshot; // Delete snapshot

    // Init project meta
    if (angular.isUndefined(pcmVm.project.meta) || pcmVm.project.meta.length == 0) {
        pcmVm.project.meta = {};
        var rawProject = angular.fromJson(angular.toJson(pcmVm.project));
        pcmVm.project.meta.title = rawProject.title;
        if (rawProject.scenes.length && !pcmVm.project.meta.image) {
            pcmVm.project.meta.image = rawProject.scenes[0].pano_thumb;
        }
    }

    // Get exported versions
    getExportedVersions();

    ///////////////

    pcmVm.isDeletingSnapshot = false;

    function deleteSnapshot(id) {
        pcmVm.isDeletingSnapshot = true;
        Project.deleteSnapshot(id).then(function(res) {
            if (res) {
                // delete success
                jQuery('#snapshot' + id).remove();
            }
        }, function(err) {
            console.log(err);
        }).finally(function() {
            pcmVm.isDeletingSnapshot = false;
        });
    }

    function getExportedVersions() {
        Project.getExportedVersions($scope.project._id).then(function(res) {
            pcmVm.exportedVersions = res;
        }, function(err) {
            console.log(err);
        });
    }

    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            pcmVm.project.scenes = createdScenes.concat(pcmVm.project.scenes);
            $state.go('project.editor', { id: createdScenes[0].project_id, scene_id: createdScenes[0]._id });
        }
    }

    // Watch for changes & Update project title 
    $scope.$watch('pcmVm.project.title', function(newVal, oldVal) {
        if (newVal != oldVal) {
            if (titleChangeTimeoutPromise) $timeout.cancel(titleChangeTimeoutPromise);
            titleChangeTimeoutPromise = $timeout(function() {
                pcmVm.titleIsLoading = true;
                updateTitle();
            }, 1000);
        }
    });

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
            pcmVm.project.meta.image = file.path;
        }
    }

    // Update project info
    function updateProject() {
        pcmVm.isSaving = true;
        Project.update(pcmVm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            pcmVm.titleIsLoading = false;
            pcmVm.isSaving = false;
        });
    }

    function updateGoogleProject() {
        pcmVm.isSavingGoogle = true;
        Project.update(pcmVm.project).then(function(status) {
            if (status != 1) {
                Alertify.error('Can not update project');
            } else {
                Alertify.success('Project updated');
            }
        }).finally(function() {
            pcmVm.isSavingGoogle = false;
        });
    }

    // Update project title
    function updateTitle() {
        Project.updateTitle(pcmVm.project.title, pcmVm.project._id).then(function(newSlug) {
                pcmVm.project.slug = newSlug;
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.titleIsLoading = false;
            });
    }

    // Update project public access
    function updatePublicAccess() {
        pcmVm.projectPublicityIsLoading = true;
        Project.updatePublicAccess(pcmVm.project.public, pcmVm.project._id).then(function(status) {
                Alertify.success('Project publicity updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.projectPublicityIsLoading = false;
            });
    }

    // Update project can list in portfolio
    function updateCanListInPortfolio() {
        pcmVm.projectCanListInPortfolioLoading = true;
        Project.updateCanListInPortfolio(pcmVm.project.in_portfolio, pcmVm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.projectCanListInPortfolioLoading = false;
            });
    }

    // Update project enable password
    function updatePasswordProject(type) {
        if (type == 'input') {
            $timeout.cancel(time)
            time = $timeout(function() {
                if (pcmVm.project.password.string.length > 5) {
                    updatePassword();
                } else {
                    Alertify.error('You have entered less than 6 characters for password');
                }
            }, 1500)
        } else {
            updatePassword();
        }
    }

    function updatePassword() {
        pcmVm.isUpdatingPassword = true;
        Project.updatePasswordProject(pcmVm.project.password, pcmVm.project._id).then(function(status) {
                Alertify.success('Project updated');
            }).catch(function() {
                Alertify.error('Can not update project');
            })
            .finally(function() {
                pcmVm.isUpdatingPassword = false;
            });
    }

    // Delete project by id
    function deleteProject() {
        var id = pcmVm.project._id;
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
        Alertify.confirm('You will be charged $' + CONST.export_price + ' for each download. <br> Do you want to continue?').then(
            function onOk() {
                pcmVm.isGettingProject = true;
                Project.download(id).then(function(res) {
                    switch (res.status) {
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
                }, function(err) {
                    console.log(err)
                    Alertify.error('Can not download project. Please try again');
                }).finally(function() {
                    pcmVm.isGettingProject = false;
                });
            },
            function onCancel() {}
        );
    }
}