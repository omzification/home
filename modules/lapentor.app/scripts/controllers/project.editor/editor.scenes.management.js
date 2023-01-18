angular.module('lapentor.app')
    .controller('EditorScenesManagementCtrl', EditorScenesManagementCtrl)
    .controller('RenderingModalCtrl', RenderingModalCtrl);
function EditorScenesManagementCtrl($scope, $uibModal, $timeout, $state, $rootScope, Alertify, LptHelper, Scene, SceneGroup) {
    var vm = $scope.vm;

    vm.collapsedGroup = []; // store collapsed group id
    vm.thumbCacheVersion = 0;

    // functions declaration
    vm.openMediaLib = openMediaLib; // open media library
    vm.openReplacePanoMediaLib = openReplacePanoMediaLib;
    vm.deleteScene = deleteScene; // delete scene func
    vm.makePanoDropBox = makePanoDropBox;
    vm.newGroup = newGroup; // new group
    vm.updateGroup = updateGroup; // update group info
    vm.deleteGroup = deleteGroup; // delete group
    vm.updateSceneInGroup = updateSceneInGroup;
    $scope.filesDropbox = [];
    $scope.pano_type = "";
    $scope.makePanoCallback = makePanoCallback;

    $timeout(function(){
        if(localStorage.getItem('scroll-scenes')){
            angular.element('[ui-sortable="vm.groupSortableOptions"]').scrollTop(localStorage.getItem('scroll-scenes'));
        }
    })
    angular.element('[ui-sortable="vm.groupSortableOptions"]').scroll(function(){
        localStorage.setItem('scroll-scenes', angular.element(this).scrollTop());
    });

    var uncategorizedGroup = {
        _id: 'uncategorized',
        title: 'Uncategorized',
        scenes: [],
        readonly: true
    };
    uncategorizedGroup.scenes = vm.project.scenes.filter(function(scene) {
        return LptHelper.isEmpty(scene.group_id);
    });
    uncategorizedGroup.scenes.sort(function(a, b) {
        if(a.order_in_group != b.order_in_group) {
            return a.order_in_group - b.order_in_group;
        }else{
            return a._id > a._id;
        }
    });

    vm.sceneSortableOptions = {
        handle: '.scene-drag-trigger',
        connectWith: '.scenes',
        appendTo: '#scene-management',
        stop: function(e, ui) {
            // Update scene / group order of js object
            angular.forEach(vm.groups, function(group) {
                for (var i = 0; i < group.scenes.length; i++) {
                    if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                        group.scenes[i].group_id = group._id;
                    } else {
                        group.scenes[i].group_id = null;
                    }
                    group.scenes[i].order_in_group = i;
                }
            });

            updateGroups(); // update database
        }
    }
    vm.groupSortableOptions = {
        appendTo: '#scene-management',
        handle: '.group-drag-trigger',
        stop: function() {
            angular.forEach(vm.groups, function(group, index) {
                group.order = index;
            });

            updateGroups();
        },
        items: '.scene-group:not(.not-sortable)'
    };

    if (vm.groups.length == 0 || !vm.groups[0].readonly) {
        vm.groups.unshift(uncategorizedGroup);
    }
    if (vm.groups.length && vm.groups[0].readonly) {
        vm.groups.splice(0, 1);
        vm.groups.unshift(uncategorizedGroup);
    }

    ////////////////

    function makePanoDropBox(pano_type){

        var options = {

            // Required. Called when a user selects an item in the Chooser.
            success: function(files) {
                //alert("Here's the file link: " + files[0].link)
                if (files.length) { // there are selected files to make pano
                    if (files.length <= 100) {
                        // if ($scope.isReplacePano == true) {
                        //     Scene.replace($scope.sceneId, files[0],'dropbox',vm.project._id,pano_type).then(function(status) {
                        //         if (status == 0) {
                        //             Alertify.error('Can not replace scene');
                        //         } else {
                        //             // replace scene success
                        //             makePanoCallback($scope.sceneId);
                        //         }
                        //     }, function(res) {
                        //         Alertify.error("Can not replace scene");
                        //     }).finally(function() {
                        //         vm.isLoading = false;
                        //         angular.element('#block-ui').hide();
                        //     });
                        // } else {
                            //vm.sceneManagementLoading = true;

                        $scope.filesDropbox = files;
                        $scope.pano_type = pano_type;
                        $scope.project_id = vm.project._id;
                        $scope.project_slug = vm.project.slug;

                        var mediaLibraryModal = $uibModal.open({
                            size: 'lg',
                            animation: false,
                            templateUrl: "modules/lapentor.app/views/partials/rendering_dropbox.html",
                            controller: "RenderingModalCtrl",
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

                    } else {
                        Alertify.error("You can only make 100 sphere at a time. Sorry!");
                    }
                } else {
                    // there are no selected files
                    Alertify.error("Can't do that :( You have to select at least 1 pano image");
                }
            },

            // Optional. Called when the user closes the dialog without selecting a file
            // and does not include any parameters.
            cancel: function() {
               // mediaLibraryModal.dismiss();
            },

            // Optional. "preview" (default) is a preview link to the document for sharing,
            // "direct" is an expiring link to download the contents of the file. For more
            // information about link types, see Link types below.
            linkType: "direct", // or "direct"

            // Optional. A value of false (default) limits selection to a single file, while
            // true enables multiple file selection.
            multiselect: true, // or true

            // Optional. This is a list of file extensions. If specified, the user will
            // only be able to select files with these extensions. You may also specify
            // file types, such as "video" or "images" in the list. For more information,
            // see File types below. By default, all extensions are allowed.
            extensions: ['.jpg','.png']
        };

        Dropbox.choose(options);
    }
    // Handle event when make pano success
    function makePanoCallback(createdScenes) {
        if (createdScenes && createdScenes.length) {
            Alertify.success('Sphere created successfully');
            vm.project.scenes = createdScenes.concat(vm.project.scenes);
            vm.groups[0].scenes = createdScenes.concat(vm.groups[0].scenes);
            angular.forEach(vm.groups, function(group) {
                for (var i = 0; i < group.scenes.length; i++) {
                    if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                        group.scenes[i].group_id = group._id;
                    } else {
                        group.scenes[i].group_id = null;
                    }
                    group.scenes[i].order_in_group = i;
                }
            });
            updateGroups();
        }
    }

    // Handle event when make pano success
    function replacePanoCallback(sceneId) {
        // TODO: reload scene
        if(sceneId == vm.scene._id) {// is current scene
            // reload scene pano
            window.location.reload();
        }else{
            vm.thumbCacheVersion++;
        }
    }

    // Open media library
    function openMediaLib() {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: makePanoCallback,
            tab: 'pano'
        });
    }

    function openReplacePanoMediaLib(sceneId) {
        $rootScope.$broadcast('evt.openMediaLib', {
            makePanoCallback: replacePanoCallback,
            canChooseMultipleFile: false,
            isReplacePano: true,
            sceneId: sceneId
        });
    }

    // New group
    function newGroup() {
        Alertify.prompt('Enter group title')
            .then(function(title) {
                SceneGroup.create(title, vm.project).then(function(res) {
                    if (res.status == 1) {
                        res.sceneGroup.scenes = [];
                        res.sceneGroup.order = vm.groups.length;
                        // vm.groups.splice(0, 1); // remove uncategorized group
                        vm.groups.push(res.sceneGroup); // re-append uncategorized group so it alway is the first group
                        updateGroups();
                    }
                });
            });
    }

    var groupTitleChangeTimeoutPromise;

    function updateGroup(group) {
        if (groupTitleChangeTimeoutPromise) $timeout.cancel(groupTitleChangeTimeoutPromise);
        groupTitleChangeTimeoutPromise = $timeout(function() {
            vm.groupLoading = group._id;
            group.project_slug = vm.project.slug;

            SceneGroup.update(group).then(function(status) {
                if (status == 1) {
                    Alertify.success('Group title saved');
                } else {
                    Alertify.error('Can not update group title');
                }
            }).finally(function() {
                vm.groupLoading = null;
            });
        }, 1200);
    }

    function updateGroups() {
        SceneGroup.updateAll(vm.groups, vm.project.slug).then(function(status) {
            if (status == 1) {
                Alertify.success('Order saved');
            } else {
                Alertify.error('Can not save');
            }
        });
    }

    var sceneTitleChangeTimeoutPromise;

    $scope.$watch('vm.scene.title', function(newTitle, oldTitle) {
        if (newTitle != oldTitle) {
            updateSceneInGroup(vm.scene);
        }
    });

    function updateSceneInGroup(scene) {
        if (sceneTitleChangeTimeoutPromise) $timeout.cancel(sceneTitleChangeTimeoutPromise);
        sceneTitleChangeTimeoutPromise = $timeout(function() {
            if (scene.group_id) {
                vm.groupLoading = scene.group_id;
            } else {
                vm.groupLoading = 'uncategorized';
            }
            vm.headerSceneTitleIsLoading = true;
            scene.project_slug = vm.project.slug;

            Scene.update(scene).then(function(status) {
                if (status == 1) {
                    Alertify.success('Scene title saved');
                } else {
                    Alertify.error('Can not update Scene title');
                }
            }).finally(function() {
                vm.groupLoading = null;
                vm.headerSceneTitleIsLoading = false;
            });
        }, 1000);
    }

    // Delete group
    function deleteGroup(deletedGroup) {
        Alertify.confirm('Are you sure? All data will be lost forever').then(function() {
            vm.groupLoading = deletedGroup._id;
            SceneGroup.remove(deletedGroup._id, vm.project.slug).then(function(status) {
                // delete ok, delete group from vm.groups
                vm.groups = LptHelper.deleteObjectFromArray(deletedGroup, vm.groups);

                // Move all scene of deleted group to uncategorized
                angular.forEach(deletedGroup.scenes, function(scene) {
                    scene.group_id = null;
                    uncategorizedGroup.scenes.push(scene);
                    angular.forEach(uncategorizedGroup.scenes, function (scene, index) {
                        scene.order_in_group = index;
                    });
                    updateGroups();
                });
                angular.forEach(vm.groups, function(group, index) {
                    group.order = index;
                });
            }).finally(function() {
                vm.groupLoading = null;

            });
        });
    }
    // Delete scene from DB
    function deleteScene(id) {
        Alertify.confirm('Are you sure? All data will be lost forever').then(function() {
            var shouldDeleteScene = LptHelper.getObjectBy('_id', id, vm.project.scenes);
            if(shouldDeleteScene) {
                vm.groupLoading = shouldDeleteScene.group_id?shouldDeleteScene.group_id:'uncategorized';
            }
            Scene.remove(id, vm.project.slug).then(function(res) {
                if (res.data.status == 1) {
                    // delete ok
                    // - if deleted scene is the last scene on earth -> go back to project page
                    deleteSceneObject(id); // delete scene from js object
                    if (vm.project.scenes.length == 0) {
                        $state.go('project.info', { id: vm.project._id });
                    } else { // - else we still have some scene left, load it
                        if (id == vm.scene._id) { // if deleted scene is current scene -> load remaining scene
                            angular.forEach(vm.project.scenes, function(scene) {
                                if (scene._id != id) {
                                    $state.go('project.editor', { id: vm.project._id, scene_id: scene._id, scene: scene });
                                }
                            });
                        }
                    }
                } else {
                    Alertify.error(res.data.errors.message);
                }
            }, function(res) {
                Alertify.error("Can not delete scene");
                console.log(res);
            }).finally(function () {
                vm.groupLoading = null;
            });
        });
    }

    // Delete scene object in vm.scenes & vm.groups, prevent cached data
    function deleteSceneObject(id) {
        vm.project.scenes = LptHelper.deleteObjectFromArrayBy('_id', id, vm.project.scenes);

        angular.forEach(vm.groups, function(group) {
            if (!LptHelper.isEmpty(group.scenes)) {
                group.scenes = LptHelper.deleteObjectFromArrayBy('_id', id, group.scenes);
            }
        });
        angular.forEach(vm.groups, function(group) {
            for (var i = 0; i < group.scenes.length; i++) {
                if (!LptHelper.isEmpty(group._id) && group._id != 'uncategorized') {
                    group.scenes[i].group_id = group._id;
                } else {
                    group.scenes[i].group_id = null;
                }
                group.scenes[i].order_in_group = i;
            }
        });
        updateGroups();
    }
}
function RenderingModalCtrl($scope, $timeout, $uibModalInstance, user, Alertify, Scene){
    var vm = this;
    vm.user = user;
    vm.filesDropbox = $scope.filesDropbox;
    vm.makePanoProgress = 0;
    vm.filesCreateScene = {};
    vm.rendering = 0;
    vm.renderingComplate = 0;
    vm.renderingTotal = 0;

    angular.forEach(vm.filesDropbox, function(file) {
        file.id = file.id.replace(':','');
        vm.filesCreateScene[file.id] = file;
    });

    vm.renderingTotal = vm.filesDropbox.length;
    _makePanos(vm.filesDropbox,'dropbox',$scope.project_id, $scope.project_slug, $scope.pano_type,0,vm.renderingTotal);
    if(vm.filesDropbox.length >=2 && (!angular.isUndefined(vm.user.subscribed) && vm.user.subscribed)){
        _makePanos(vm.filesDropbox,'dropbox',$scope.project_id, $scope.project_slug, $scope.pano_type,1,vm.renderingTotal);
    }

    function _makePanos(selectedMedias, type, project_id, project_slug, pano_type, sortMedia, totalMedia){
        if(!angular.isUndefined(vm.filesCreateScene[selectedMedias[sortMedia].id].class)){
            var newSortMedia = sortMedia+1;
            if(totalMedia > newSortMedia){
                //vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
                _makePanos(selectedMedias,type,project_id, project_slug, pano_type,newSortMedia,totalMedia);
            }
            return false;
        }
        vm.filesCreateScene[selectedMedias[sortMedia].id].class = "working";
        vm.rendering = vm.rendering + 1;

        var media = [];
        media.push(selectedMedias[sortMedia]);

        Scene.create(media, type, project_id, project_slug, pano_type).then(function(res) {
            try {
                res = JSON.parse('{"status' + res.data.split('{"status')[1]);
                if (res.status == 0) {
                    // make pano failed
                    vm.filesCreateScene[selectedMedias[sortMedia].id].class = "fail";
                    Alertify.error(res.errors.message);
                } else {
                    // make pano ok
                    //_cancel();
                    vm.filesCreateScene[selectedMedias[sortMedia].id].class = "success";

                    var createdScenes = res.scenes;
                    $scope.makePanoCallback(createdScenes);
                }
            } catch (e) {
                console.error(e);
            }

        }, function(res) {
            Alertify.error("Can not create scene");
            vm.filesCreateScene[selectedMedias[sortMedia].id].class = "fail";
            console.log(res);
        }).finally(function() {
            vm.renderingComplate = vm.renderingComplate +1;
            vm.makePanoProgress = (100/totalMedia) * vm.renderingComplate;
            if(totalMedia - vm.renderingComplate == 0){
                //vm.makePanoProgress = 100;
                $timeout(function(){
                    $uibModalInstance.dismiss();
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

}
