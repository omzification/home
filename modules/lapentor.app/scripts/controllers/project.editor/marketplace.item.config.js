angular.module('lapentor.app')
    .controller('MarketplaceItemConfigCtrl', MarketplaceItemConfigCtrl);

function MarketplaceItemConfigCtrl($scope, $rootScope, $timeout, Alertify, Project, LptHelper, $uibModal, Hotspot) {
    var vm = this;
    $scope.updateConfig = updateConfig;
    $scope.isUpdating = false;

    ////////////////

    $rootScope.$on('evt.marketplace.openConfigPage', function(event, item) {
        var templateUrl = '';
        var controllerName = ''; // dynamic controller name for config modal

        if (item) {
            var originalItem = item;
            switch (item.type) {
                case 'plugin':
                    templateUrl = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, 'tpl/config.html');
                    controllerName = item.type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                    item = LptHelper.getObjectBy('slug', item.slug, $scope.project.plugins);
                    break;
                case 'theme':
                    switch(item.theme_type) {
                        case 'hotspot':
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, 'hotspot.config.html');
                            break;
                        case 'scenelist':
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, 'scenelist.config.html');
                            break;
                        default:
                            templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, 'tpl/config.html');
                    }
                    
                    controllerName = item.theme_type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                    item = $scope.project['theme_' + item.theme_type];
                    item.theme_type = originalItem.theme_type;
                    // init config
                    if (angular.isUndefined($scope.project['theme_' + item.theme_type].config)) {
                        $scope.project['theme_' + item.theme_type].config = {};
                    }
                    break;
            }
            item.type = originalItem.type;
            item.name = originalItem.name;
            $scope.templateUrl = templateUrl;
            $scope.item = item;
            vm.item = item;
            $scope.openCustomIconMediaLib = openCustomIconMediaLib; // delare global function to show custom icon media library
            $scope.resetCustomHotspotIcon = resetCustomHotspotIcon;
            $scope.hotspotTypes = Hotspot.getTypes(item.slug);
            $scope.project.theme_hotspot.config = $scope.project.theme_hotspot.config || {};
            
            try {
                // Apply custom icons
                angular.forEach($scope.hotspotTypes, function(hpType) {
                    var customIcon = $scope.project.theme_hotspot.config[hpType.name + '_icon_custom'];
                    hpType.icon_default = hpType.icon;
                    if (customIcon) {
                        hpType.icon = customIcon;
                    }
                });
            } catch (e) {
                console.error(e);
            }

            if (LptHelper.isControllerExist(controllerName)) { // check if config controller is defined or not
                var configPage = $uibModal.open({
                    templateUrl: 'modules/lapentor.app/views/partials/marketplace.item.config.html',
                    size: 'lg',
                    scope: $scope,
                    controller: controllerName, // this controller is defined in each theme/plugin
                    controllerAs: 'vm',
                    windowClass: 'marketplace-item-detail',
                    resolve: {
                        project: function() {
                            return $scope.project;
                        },
                        item: function() {
                            return item;
                        }
                    }
                });

                $scope.dismissConfigModal = configPage.dismiss;

                configPage.closed.then(function() {
                    angular.element('.modal-backdrop').remove();
                    angular.element('body').removeClass('modal-open');
                });
            }
        }
    });

    function openCustomIconMediaLib(name) {
        $rootScope.$broadcast('evt.openMediaLib', {
            tab: 'asset',
            canChooseMultipleFile: false,
            chooseAssetCallback: function(file) {
                if (file.mime_type.indexOf('image') != -1) { // check file type
                    angular.forEach($scope.hotspotTypes, function(hpType) {
                        if (hpType.name == name) {
                            hpType.icon = file.path;
                            if ($scope.project.theme_hotspot.config) {
                                $scope.project.theme_hotspot.config[name + '_icon_custom'] = file.path;
                            }
                            return;
                        }
                    });
                } else {
                    Alertify.error('Only support png format');
                }
            }
        });
    }

    function resetCustomHotspotIcon(name) {
        angular.forEach($scope.hotspotTypes, function(hpType) {
            if (hpType.name == name) {
                hpType.icon = hpType.icon_default;
                if ($scope.project.theme_hotspot.config) {
                    delete $scope.project.theme_hotspot.config[name + '_icon_custom'];
                }
                return;
            }
        });
    }

    function updateConfig(item, _config, callback) {
        $scope.isUpdating = true;
        switch (item.type) {
            case 'plugin':
                
                Project.updatePluginConfig({ slug: item.slug, config: _config }, $scope.project._id).then(function(status) {
                    if (status) {
                        // Add config to "project" object
                        $scope.project.plugins[item.slug] = _config;
                        if (!item.config) item.config = _config;

                        Alertify.success(item.name + ' config updated');
                    } else {
                        Alertify.error('Can not update config');
                    }
                }).finally(function() {
                    callback();
                    $scope.isUpdating = false;
                });
                break;
            default:
                Project.updateThemeConfig(item.theme_type, $scope.project._id, _config).then(function(status) {
                    if (status) {
                        Alertify.success(item.name + ' config updated');
                    } else {
                        Alertify.error('Can not update config');
                    }
                }).finally(function() {
                    callback();
                    $scope.isUpdating = false;
                });
                break;
        }
    }
}
