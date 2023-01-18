/**
 * Events fired in this controller:
 * evt.openMediaLib: fired when open media library
 */
angular.module('lapentor.app')
    .controller('MediaLibraryCtrl', MediaLibraryCtrl)
    .controller('MediaLibraryModalCtrl', MediaLibraryModalCtrl);

function MediaLibraryCtrl($scope, $rootScope, $uibModal, User) {
    var vm = this;
    ////////////////
    // Listen for open media lib event
    $scope.$on('evt.openMediaLib', function _openMediaLib(event, payload) {
        if (payload) {
            if (payload.makePanoCallback) $scope.makePanoCallback = payload.makePanoCallback; // callback function after make pano success
            if (payload.chooseAssetCallback) $scope.chooseAsset = payload.chooseAssetCallback; // callback function after choosed assets
            if (payload.canelMediaLibCallback) $scope.canelMediaLib = payload.canelMediaLibCallback;
            if (payload.tab) $scope.currentFileType = payload.tab; // open pano or asset tab as default
            if (payload.isReplacePano) {
                $scope.isReplacePano = payload.isReplacePano; // replace or make pano
                $scope.sceneId = payload.sceneId; // scene id to replace
            }
            if (angular.isDefined(payload.canChooseMultipleFile)) {
                $scope.canChooseMultipleFile = payload.canChooseMultipleFile; // choose single file or multiple
            } else {
                $scope.canChooseMultipleFile = true;
            }
        }

        var mediaLibraryModal = $uibModal.open({
            size: 'lg',
            animation: false,
            templateUrl: "modules/lapentor.app/views/partials/media_library.html",
            controller: "MediaLibraryModalCtrl",
            controllerAs: "vm",
            scope: $scope,
            resolve: {
                user: function($stateParams, User) {
                    if (!angular.isObject($stateParams.user)) { // check if scenes already passed in $stateParams
                        return User.get();
                    } else {
                        return $stateParams.user;
                    }
                }
            },
            backdrop: 'static'
        });

        mediaLibraryModal.closed.then(function () {
            if(angular.element('.modal-backdrop').length) {
                angular.element('.modal-backdrop').hide();
                angular.element('body').removeClass('modal-open');
            }
        });
    });
}

function MediaLibraryModalCtrl($scope, $timeout, $filter, $state, $rootScope, $uibModalInstance, Media, user, Alertify, Scene) {
    var vm = this;

    vm.user = user;
    vm.selectedMedias = [];
    vm.files = [];
    vm.project = $scope.project;
    vm.uploadProgress = 0;
    vm.makePanoProgress = 0;
    vm.isUploading = false;
    vm.isLoading = true;
    vm.isCreateScene = false;
    vm.filesCreateScene = {};
    vm.rendering = 0;
    vm.renderingComplate = 0;
    vm.renderingTotal = 0;

    var developerKey = 'AIzaSyDFcThFQZ-f70UujAeL4BIdZGcVNszjdDo';

    // The Client ID obtained from the Google API Console. Replace with your own Client ID.
    var clientId = Config.GOOGLE_DRIVE_CLIENT_ID;

    // Scope to use to access user's photos.https://www.googleapis.com/auth/photos---https://www.googleapis.com/auth/drive
    var scope = ['https://www.googleapis.com/auth/photos','https://www.googleapis.com/auth/drive.readonly'];

    var pickerApiLoaded = false;
    var oauthToken;

    if (angular.isDefined($scope.currentFileType)) {
        vm.currentFileType = $scope.currentFileType;
    } else {
        vm.currentFileType = 'pano';
    }

    // functions
    vm.cancel = _cancel;
    vm.upload = _upload;
    vm.selectMedia = _selectMedia;
    vm.selectAll = _selectAll;
    vm.tabSelect = _tabSelect;
    vm.deleteSelected = _deleteSelected;
    vm.makePano = makePano;
    vm.makePanoDriverGoogle = makePanoDriverGoogle;
    vm.chooseAsset = chooseAsset;

    ////////////////

    /**
     * Get all files in Media Library
     * @return {object}
     */
    Media.all(vm.project._id).then(function(files) {
        vm.files = files;
    }).catch(function(res) {
        Alertify.error('Can not fetch files');
        console.log(res);
    }).finally(function() {
        vm.isLoading = false;
    });

    /**
     * Make Sphere image
     */
    function makePano(pano_type) {
        if (vm.selectedMedias.length) { // there are selected files to make pano
            if (vm.selectedMedias.length <= 300) {
                //vm.isLoading = true;
                angular.element('#block-ui').show();

                vm.isCreateScene = true;
                angular.forEach(vm.selectedMedias, function(selectedMedias) {
                    vm.filesCreateScene[selectedMedias] = $filter('filter')(vm.files, { _id: selectedMedias })[0];
                });
                vm.rendering = 0;
                vm.makePanoProgress = 0;
                vm.renderingComplate = 0;

                if ($scope.isReplacePano == true) {
                    vm.rendering = 1;
                    vm.renderingTotal = 1;
                    vm.filesCreateScene[vm.selectedMedias[0]].class = "working";
                    Scene.replace($scope.sceneId, vm.selectedMedias[0],'lapentor',vm.project._id, vm.project.slug, pano_type).then(function(status) {
                        if (status == 0) {
                            Alertify.error('Can not replace scene');
                            vm.filesCreateScene[vm.selectedMedias[0]].class = "fail";
                        } else {
                            //_cancel();
                            vm.filesCreateScene[vm.selectedMedias[0]].class = "success";
                            $scope.makePanoCallback($scope.sceneId);
                        }
                    }, function(res) {
                        Alertify.error("Can not replace scene");
                        vm.filesCreateScene[vm.selectedMedias[0]].class = "fail";
                    }).finally(function() {
                        //vm.isLoading = false;
                        vm.makePanoProgress = 100;
                        $timeout(function(){
                            vm.isCreateScene = false;
                            vm.selectedMedias = [];
                            vm.filesCreateScene = {};
                            angular.element('#block-ui').hide();
                        },2000)
                    });
                } else {
                    vm.renderingTotal = vm.selectedMedias.length;
                    _makePanos(vm.selectedMedias,'lapentor',vm.project._id, vm.project.slug, pano_type,0,vm.renderingTotal);
                    if(vm.selectedMedias.length >=2 && (!angular.isUndefined(vm.user.subscribed) && vm.user.subscribed)){
                        _makePanos(vm.selectedMedias,'lapentor',vm.project._id, vm.project.slug, pano_type,1,vm.renderingTotal);
                    }
                }
            } else {
                Alertify.error("You can only make 300 sphere at a time. Sorry!");
            }
        } else {
            // there are no selected files
            Alertify.error("Can't do that :( You have to select at least 1 pano image");
        }

    }

    function _makePanos(selectedMedias, type, project_id, project_slug, pano_type, sortMedia, totalMedia){
        if(!angular.isUndefined(vm.filesCreateScene[selectedMedias[sortMedia]].class)){
            var newSortMedia = sortMedia+1;
            if(totalMedia > newSortMedia){
                //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
            }
            return false;
        }
        vm.filesCreateScene[selectedMedias[sortMedia]].class = "working";
        if(vm.rendering < vm.renderingTotal) {
            vm.rendering++;    
        }

        var media = [];
        media.push(selectedMedias[sortMedia]);

        Scene.create(media, type, project_id, project_slug, pano_type).then(function(res) {
            try {
                res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                if (res.status == 0) {
                    // make pano failed
                    vm.filesCreateScene[selectedMedias[sortMedia]].class = "fail";
                    Alertify.error(res.errors.message);
                } else {
                    // make pano ok
                    //_cancel();
                    vm.filesCreateScene[selectedMedias[sortMedia]].class = "success";

                    var createdScenes = res.scenes;
                    $scope.makePanoCallback(createdScenes);
                }
            } catch (e) {
                console.error(e);
            }

        }, function(res) {
            Alertify.error("Can not create scene");
            vm.filesCreateScene[selectedMedias[sortMedia]].class = "fail";
            console.log(res);
        }).finally(function() {
            vm.renderingComplate = vm.renderingComplate +1;
            vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
            if(totalMedia - vm.renderingComplate == 0){
                //vm.makePanoProgress = 100;
                $timeout(function(){
                    vm.isCreateScene = false;
                    vm.selectedMedias = [];
                    angular.forEach(vm.filesCreateScene, function(file) {
                        delete file.class;
                    });
                    vm.filesCreateScene = {};
                    angular.element('#block-ui').hide();
                },2000)

                //_cancel();

            }else{
                var newSortMedia = sortMedia+1;
                if(totalMedia > newSortMedia){
                    //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                    _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
                }
            }
        });
    }

    function makePanoDriverGoogle(){
        gapi.load('auth', {'callback': onAuthApiLoad});
        gapi.load('picker', {'callback': onPickerApiLoad});
        angular.element('.picker-dialog-bg,.picker-dialog').remove();
    }

    function _callMakePanoDriverGoogle(files){
        if (files.length) { // there are selected files to make pano
            if (files.length <= 3) {
                vm.isLoading = true;
                angular.element('#block-ui').show();
                if ($scope.isReplacePano == true) {
                    Scene.replace($scope.sceneId, files[0],'google',vm.project._id, vm.project.slug).then(function(status) {
                        if (status == 0) {
                            Alertify.error('Can not replace scene');
                        } else {
                            _cancel();
                            $scope.makePanoCallback($scope.sceneId);
                        }
                    }, function(res) {
                        Alertify.error("Can not replace scene");
                    }).finally(function() {
                        vm.isLoading = false;
                        angular.element('#block-ui').hide();
                    });
                } else {
                    Scene.create(files,'google',vm.project._id, vm.project.slug).then(function(res) {
                        try {
                            res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                            if (res.status == 0) {
                                // make pano failed
                                Alertify.error(res.errors.message);
                            } else {
                                // make pano ok
                                _cancel();

                                var createdScenes = res.scenes;
                                $scope.makePanoCallback(createdScenes);
                            }
                        } catch (e) {
                            console.error(e);
                        }

                    }, function(res) {
                        Alertify.error("Can not create scene");
                        console.log(res);
                    }).finally(function() {
                        vm.isLoading = false;
                        angular.element('#block-ui').hide();
                    });
                }
            } else {
                Alertify.error("You can only make 3 sphere at a time. Sorry!");
            }
        } else {
            // there are no selected files
            Alertify.error("Can't do that :( You have to select at least 1 pano image");
        }
    }
    /**
     * Delete selected files
     */
    function _deleteSelected() {
        if (vm.selectedMedias.length > 0) {
            Alertify.confirm('Are you sure you want to delete these files?').then(function() {
                vm.isLoading = true;
                Media.remove(vm.selectedMedias).then(function(res) {
                    if (res.data.status == 1) {
                        // delete ok
                        vm.files = vm.files.filter(function(file) {
                            return (vm.selectedMedias.indexOf(file._id) == -1);
                        });
                        vm.selectedMedias = [];
                    } else {
                        // delete failed
                        Alertify.error(res.data.errors.message);
                    }
                }, function(res) {
                    Alertify.error('Can not delete files');
                    console.log(res);
                }).finally(function() {
                    vm.isLoading = false;
                });
            });
        } else {
            Alertify.error('You must select a file to delete');
        }
    }

    /**
     * Change Tab type
     * @param  {string} type [pano/asset]
     */
    function _tabSelect(type) {
        vm.currentFileType = type;
        vm.selectedMedias = []; // clear selected media
    }

    /**
     * Close Media Library
     */
    function _cancel() {
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
        $uibModalInstance.dismiss();
        if (typeof $scope.canelMediaLib === "function") {
            $scope.canelMediaLib();
        }
    }

    /**
     * Upload file to Media Library
     * @param  {object} files
     * @param  {object} invalidFiles
     */
    function _upload(files, invalidFiles) {
        angular.forEach(invalidFiles, function(item) {
            if (item.$error == 'dimensions') Alertify.error(item.name + ' width must > 2000px');
            if (item.$error == 'maxTotalSize') Alertify.error('Maximum upload size is ' + item.$errorParam);
        });
        if (files && files.length) {
            vm.isUploading = true;
            Media.upload(files, vm.project._id, vm.currentFileType).then(function(res) {
                if (angular.isDefined(res.data.files)) {
                    vm.files = res.data.files.concat(vm.files);
                }
            }, function(res) {
                Alertify.error('Can not upload file. Please try again');
                console.log(res);
            }, function(evt) {
                // progress
                var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                vm.uploadProgress = progressPercentage;
            }).finally(function() {
                vm.isUploading = false;
                vm.uploadProgress = 0;
            });
        }
    }

    /**
     * Mark single file as selected
     */
    function _selectMedia(id) {
        var idx = vm.selectedMedias.indexOf(id);
        if (idx == -1) {
            if (!$scope.canChooseMultipleFile) {
                // clear selected medias array to prevent choosing multiple file
                vm.selectedMedias.length = 0;
            }

            vm.selectedMedias.push(id);
        } else {
            vm.selectedMedias.splice(idx, 1);
        }
    }

    /**
     * Mark all files as selected
     */
    function _selectAll() {
        if (vm.selectedMedias.length == vm.files.length) {
            vm.selectedMedias = [];
        } else {
            // Select all
            vm.selectedMedias = [];
            for (var i in vm.files) {
                vm.selectedMedias.push(vm.files[i]._id);
            }
        }
    }

    function chooseAsset() {
        if ($scope.canChooseMultipleFile == false) {
            var selectedFileObj = vm.files.filter(function(file) {
                return file._id == vm.selectedMedias[0];
            });

            // Pass file to chooseAsset func
            if (angular.isDefined($scope.chooseAsset)) {
                $scope.chooseAsset(selectedFileObj[0]);
            }

            _cancel();
        } else if ($scope.canChooseMultipleFile == true) {

            var selectedFileObjs = [];
            angular.forEach(vm.selectedMedias, function(value, key) {

                vm.files.filter(function(file) {
                    if (file._id == value) {
                        selectedFileObjs.push(file);
                    }
                });

            });
            if (angular.isDefined($scope.chooseAsset)) {
                $scope.chooseAsset(selectedFileObjs);
            }

            _cancel();
        } else {
            Alertify.error('Please select a file');
        }
    }

    function onAuthApiLoad() {
        window.gapi.auth.authorize(
            {
                'client_id': clientId,
                'scope': scope,
                'immediate': false
            },
            handleAuthResult);
    }

    function onPickerApiLoad() {
        pickerApiLoaded = true;
        createPicker();
    }

    function handleAuthResult(authResult) {
        if (authResult && !authResult.error) {
            oauthToken = authResult.access_token;
            createPicker();
        }
    }

    // Create and render a Picker object for picking user Photos.
    function createPicker() {
        if (pickerApiLoaded && oauthToken) {
            var picker = new google.picker.PickerBuilder().
                addView(google.picker.ViewId.DOCS).
                setOAuthToken(oauthToken).
                setDeveloperKey(developerKey).
                setCallback(pickerCallback).
                build();
            picker.setVisible(true);
        }
    }

    // A simple callback implementation.
    function pickerCallback(data) {
        var url = 'nothing';
        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
            var doc = data[google.picker.Response.DOCUMENTS][0];
            url = doc[google.picker.Document.URL];
            var fileId = doc[google.picker.Document.ID];
            var files = [];

            gapi.client.request({
                'path': '/drive/v2/files/'+fileId,
                'method': 'GET',
                callback: function (responsejs, responsetxt){
                    var downloadUrl = responsejs.downloadUrl;
                    doc['download'] = downloadUrl;
                    doc['oauthToken'] = oauthToken;
                    files.push(doc);
                    _callMakePanoDriverGoogle(files);
                }
            });
        }

    }
}
