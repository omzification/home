angular.module('lapentor.app')
    .controller('EditorControlBarCtrl', EditorControlBarCtrl);

/**
 * Controller for <editor-controlbar>
 * @param {[type]} $scope     [inherited from parent scope]
 */
function EditorControlBarCtrl($scope, $rootScope, $timeout, Alertify, LptHelper, Marketplace, Project) {
    var ebVm = this,
        projectEditorVm = $scope.vm;
    ebVm.isChangingOrder = false;
    ebVm.availableButtons = Marketplace.getPluginButtons(projectEditorVm.project.plugins, true);
    ebVm.btnSortableOptions = {
        appendTo: '#scene-editor-controlbar .tools',
        update: function() {
            // Show "Save order" button
            ebVm.isChangingOrder = true;
        }
    };
  
    //////////// functions register

    ebVm.addDivider = addDivider; // add new divider
    ebVm.deleteDivider = deleteDivider; // delete divider
    ebVm.openMarketplace = openMarketplace; // open control bar theme section on Marketplace
    ebVm.toggleButtonVisibility = toggleButtonVisibility; // toggle button visibility
    ebVm.openMediaLib = openMediaLib; // open Media Library to change button icon
    ebVm.resetDefaultIcon = resetDefaultIcon;
    ebVm.saveOrder = saveOrder;

    $rootScope.$on('evt.marketplace.item.installuninstall', function() {
        ebVm.availableButtons = Marketplace.getPluginButtons(projectEditorVm.project.plugins, true);
    });

    ////////////

    /**
     * Reset button custom icon to default icon
     */
    function resetDefaultIcon(btn) {
        btn.icon_url_custom = null;
        delete btn.icon_url_custom;
        updateProject(btn.name + ' button icon resetted');
    }

    var dividerCount = 0;

    /**
     * Open Media Library
     */
    function openMediaLib(btn) {

        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            chooseAssetCallback: function (file) {
                if(file.mime_type.split("/")[0] == 'image'){
                    btn.icon_url_custom = file.path;
                    updateProject(btn.name + ' button icon udpated');
                }else{
                    Alertify.error('not have to image');
                }

            },
            canChooseMultipleFile: false
        });
    }

    /**
     * Hide button on frontend control bar
     */
    function toggleButtonVisibility(id) {
        var btn = LptHelper.getObjectBy('id', id, ebVm.availableButtons);
        if (btn.hide) {
            btn.hide = false;
        } else {
            btn.hide = true;
        }
        updateProject('Control bar info saved');
    }

    function addDivider() {
        ebVm.availableButtons.push({
            'id': 'divider' + dividerCount++,
            'name': 'Divider',
            'isdivider': true,
            'icon_url': 'assets/images/icons/divider.png'
        });
    }

    function deleteDivider(id) {
        LptHelper.deleteObjectFromArrayBy('id', id, ebVm.availableButtons);
        updateButtonsOrder();
        updateProject('Control bar info saved');
    }

    function updateButtonsOrder() {

        angular.forEach(projectEditorVm.project.plugins, function(plugin) {
            angular.forEach(plugin.buttons, function(btn) {
                angular.forEach(ebVm.availableButtons, function(aBtn, index) {
                    if (aBtn.id == btn.id) {
                        btn.index = index;
                        return;
                    }
                });
            });
        });

    }

    function openMarketplace() {
        $rootScope.$emit('evt.marketplace.toggle', {
            status: 'show',
            filterCategoryName: 'control bar'
        });
    }

    function updateProject(message, callback) {
        if (!message) {
            message = 'Order saved';
        }
        ebVm.isUpdating = true;
        Project.update(projectEditorVm.project).then(function(status) {
            if (status) {
                Alertify.success(message);

                if (callback) callback();
            }
        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            ebVm.isUpdating = false;
            ebVm.isChangingOrder = false; // hide Save order button
        });
    }

    function saveOrder() {
        updateButtonsOrder();
        updateProject();        
    }
}
