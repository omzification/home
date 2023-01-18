angular.module('lapentor.app')
    .controller('DashboardCtrl', DashboardCtrl);

function DashboardCtrl($scope, $rootScope, $state, $intercom, $timeout, Project, user, Alertify, projects, $ocLazyLoad, CONST) {
    var vm = this;
    var searchChangeTimeoutPromise;
    vm.user = {};
    vm.export = {
        completed: false
    };
    vm.showExportLoading = false;
    vm.newProject = {};
    vm.projects = projects;
    vm.new_projects = projects;
    vm.isLoading = false;
    vm.isSearch = false;
    vm.notFound = false;
    vm.showFluidLoading = false;

    vm.createProject = createProject;
    vm.deleteProject = deleteProject;
    vm.duplicateProject = duplicateProject;
    vm.downloadProject = downloadProject;
    vm.openProjectSettingModal = openProjectSettingModal;
    vm.openProjectShareModal = openProjectShareModal;
    vm.exportProject = exportProject;

    ///////////////////
    var cur = 1;
    var run = true;
    var end = false;
    vm.isLoadMore = false;
    vm.loadMore = function() {
        if(run == true && end == false){
            run = false;
            vm.isLoadMore = true;
            Project.all((9*cur), 9, vm.searchText).then(function(res) {
                if(res.length == 0) {
                    end = true;
                }
                if(res.length > 0){
                    vm.new_projects = vm.new_projects.concat(res);
                    cur++;
                }
                vm.projects = vm.new_projects;
                vm.notFound = false;
                if(vm.projects.length == 0 && vm.isSearch == true){
                    vm.notFound = true;
                }
            }, function(res) {

            }).finally(function() {
                run = true;
                vm.isLoadMore = false;
                vm.isSearch = false;
            });
        }
    };

    $scope.$watch('vm.searchText', function(newVal, oldVal) {
        if (newVal != oldVal) {
            vm.isSearch = true;
            if (searchChangeTimeoutPromise) $timeout.cancel(searchChangeTimeoutPromise);
            searchChangeTimeoutPromise = $timeout(function() {
                cur = 0;
                end = false;
                vm.new_projects = [];
                vm.loadMore();
            }, 1000);
        }
    });

    // User.get().then(function(user) {
        // vm.user = {};
        vm.user = user;
        var intercomUser = {
            email: user.email,
            name: user.username,
            user_id: user._id,
            created_at: user.created_at
        };
        $intercom.update(intercomUser);
    // });

    $scope.$on('user.update', function (event, user) {
        vm.user = user;
    });

    /////////// Functions declaration

    function resetExportLoading() {
        vm.export = {
            completed: false,
        };
    }

    function downloadProject(project) {
        if(project.downloadable) {
            resetExportLoading();
            vm.export.project = project;
            vm.showExportLoading = true;

            doExportProject(project._id);
        }else {
            Alertify.confirm('You will be charged $' + CONST.export_price + ' to download this project. <br> Do you want to continue?').then(
                function onOk() {
                    resetExportLoading();
                    vm.export.project = project;
                    vm.showExportLoading = true;

                    if (user.subscribed) {
                        doExportProject(project._id);
                    } else {
                        showDownloadPaymentForm(project._id);
                    }
                },
                function onCancel() { }
            );
        }
    }

    function doExportProject(id) {
        Project.download(id).then(function (res) {
            if(res.download_link) {
                vm.export.download_link = res.download_link;
                vm.export.completed = true;
                vm.export.size = res.size;
                // window.open(res.download_link, '_blank');
            }else{
                Alertify.error('Failed to export project. Please try again or contact our support');
            }
            switch(res.status) {
                case 1:
                    vm.export.download_link = res.download_link;
                    vm.export.completed = true;
                    break;
                case 0: // on trial
                    // show payment form
                    showDownloadPaymentForm(id);
                    break;
                case -1: // payment failed
                    // show payment form
                    showDownloadPaymentForm(id);
                    break;
                default: // project or user doesn't exist
                    Alertify.error(res.msg);
                    break;
            }
        }, function (err) {
            console.log(err);
            vm.showExportLoading = false;
            Alertify.error('Can not download project. Please try again');
        }).finally(function () {
            vm.showFluidLoading = false;
        });
    }

    function showDownloadPaymentForm(project_id) {
        $ocLazyLoad.load('https://checkout.stripe.com/checkout.js').then(function() {
            var handler = StripeCheckout.configure({
                key: STRIPE_KEY,
                image: 'assets/images/logo-circle.png',
                locale: 'auto',
                token: function(token) {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.

                    vm.showFluidLoading = true;
                    Project.download(project_id, token.id, token.email).then(function (res) {
                        if(res.status == 1) {
                            window.open(res.download_link,'_blank');
                        }else{
                            Alertify.error('Can not export project. Please try again or contact us');
                        }
                    }, function (err) {
                        console.log(err);
                    }).finally(function () {
                        vm.showFluidLoading = false;
                    });
                }
            });

            handler.open({
                name: 'Lapentor',
                description: 'one time export',
                amount: CONST.export_price * 100
            });
            // Close Checkout on page navigation:
            window.addEventListener('popstate', function() {
                handler.close();
            });
        });
    }

    function duplicateProject(id) {
        vm.showFluidLoading = true;
        Project.duplicate(id).then(function (res) {
            vm.projects.unshift(res);
        }, function () {
            Alertify.error('Can not duplicate project. Please try again');
        }).finally(function () {
            vm.showFluidLoading = false;
        });
    }

    function exportProject(id) {
    }

    function openProjectSettingModal(project) {
        $rootScope.$emit('evt.openProjectSettingModal', project);
    }

    function openProjectShareModal(project) {
        $rootScope.$emit('evt.openProjectShareModal', project);
    }

    function createProject() {
        Alertify.prompt('Create new project', 'Untitled').then(
            function(title) {
                vm.newProject.title = title;
                Project.create(vm.newProject).then(function(res) {
                    // Go to project edit page
                    $timeout(function() {
                        $state.go('project.editor', { id: res.data.project._id });
                    });
                }, function(res) {
                    Alertify.error('You account is exceeded limit for create new project. Please subscribe to unlock.');
                }).finally(function() {
                    vm.isLoading = false;
                });
            }
        );
    }

    // Delete project by id
    function deleteProject(id, indexInArray) {
        Alertify.confirm('Are you sure? All data will be LOST.').then(function() {
            vm.showFluidLoading = true;
            // Remove on server
            Project.remove(id).then(function(res) {
                if (res.data.status == 1) {
                    vm.projects.splice(indexInArray, 1);
                } else {
                    Alertify.error('Can not delete project');
                }
            }, function(res) {
                console.log(res);
                Alertify.error('Can not delete project');
            }).finally(function() {
                vm.showFluidLoading = false;
            });
        });
    }
}
