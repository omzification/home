angular.module('lapentor.app')
    .controller('EditorMarketCtrl', EditorMarketCtrl);

function EditorMarketCtrl($scope, $rootScope, $uibModal, $timeout, $state, Alertify, LptHelper, Project, Marketplace) {
    var vm = $scope.vm;

    vm.items = [];
    vm.categories = [];
    vm.isUpdating = '';
    vm.showInstalled = true;
    vm.installedItemsCount = 0;

    vm.install = install; // install item
    vm.uninstall = uninstall; // uninstall item
    vm.openDetailPage = openDetailPage; // open item detail page
    vm.openConfigPage = openConfigPage; // open item config page
    vm.updateProject = updateProject; // update project info via API
    vm.toggleMarketplace = toggleMarketplace; // show/hide marketplace
    vm.showTab = showTab; // show tab: all,theme,plugins...

    /**
     * Declare a shortcut variable for installed plugins
     * @type {object}
     */
    vm.installedPlugins = angular.isDefined(vm.project.plugins) ? vm.project.plugins : [];

    /**
     * Get marketplace items
     */
    Marketplace.getItems().then(function(items) {
        vm.items = items;
        markInstalledPlugins();
    });

    /**
     * Get marketplace categories
     */
    Marketplace.getCategories().then(function(categories) {
        vm.categories = categories;
    });

    /**
     * Listen to "evt.marketplace.toggle" event and open up the Market
     */
    $rootScope.$on('evt.marketplace.toggle', function(e, payload) {
        toggleMarketplace(payload.status);
        if (payload.filterCategoryName) vm.filterCategoryName = payload.filterCategoryName;
    });

    //////////////

    vm.marketIsOpened = false;
    // toggleMarketplace();
    function toggleMarketplace(status) {
        switch (status) {
            case 'show':
                vm.marketIsOpened = true;
                // Init horizontal scroll on Installed items
                break;
            case 'hide':
                vm.marketIsOpened = false;
                break;
            default:
                vm.marketIsOpened = !vm.marketIsOpened;
                if(vm.marketIsOpened) {
                    // Init horizontal scroll on Installed items
                }
                break;
        }
    }

    /**
     * Install marketplace item: theme or plugin
     * @param  {object} item [item object]
     */
    function install(item) {
        switch (item.type) {
            case 'theme': // theme
                vm.project['theme_' + item.theme_type] = {
                    slug: item.slug
                };
                break;
            case 'plugin': // plugin
                if (!LptHelper.getObjectBy('slug', item.slug, vm.project.plugins).slug) { // check if plugin is existed
                    var plugin = {
                        slug: item.slug,
                        name: item.name
                    };
                    if (item.buttons) {
                        plugin.buttons = item.buttons;
                    }
                    vm.project.plugins.push(plugin);
                }
                break;
        }
        vm.isUpdating = item._id;
        vm.updateProject(item.name + ' installed', function() {
            $rootScope.$emit('evt.marketplace.item.installuninstall');
            if (item.theme_type == 'hotspot') $state.reload();
        });
    }

    /**
     * Uninstall marketplace item: theme or plugin
     * @param  {string} slug [item slug]
     */
    function uninstall(item) {
        try {
            switch (item.type) {
                case 'plugin':
                    angular.forEach(vm.project.plugins, function(plugin, index) {
                        if (plugin.slug == item.slug) {
                            vm.project.plugins.splice(index, 1);
                        }
                    });
                    break;
                case 'theme':
                    vm.project['theme_' + item.theme_type] = null;
                    break;
            }

            vm.isUpdating = item._id;
            vm.updateProject(item.name + ' uninstalled', function() {
                $rootScope.$emit('evt.marketplace.item.installuninstall');
                if (item.theme_type == 'hotspot') $state.reload();
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Open marketplace item detail page
     * @param  {string} slug [item slug]
     */
    function openDetailPage(slug) {
        var templateUrl = '';

        var item = LptHelper.getObjectBy('slug', slug, vm.items);
        if (item) {
            switch (item.type) {
                case 'plugin':
                    templateUrl = LptHelper.makeUrl(Config.PLUGIN_PATH, slug, 'tpl/detail.html');
                    break;
                case 'theme':
                    templateUrl = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, slug, 'tpl/detail.html');
                    break;
            }
            try {
                var detailPage = $uibModal.open({
                    templateUrl: templateUrl,
                    size: 'lg',
                    windowClass: 'marketplace-item-detail'
                });

            } catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * Open marketplace item config page
     * @param  {string} slug [item slug]
     */
    function openConfigPage(item) {
        $rootScope.$emit('evt.marketplace.openConfigPage', item);
    }

    function updateProject(message, callback) {
        Project.update(vm.project).then(function(status) {
            if (status && message) {
                Alertify.success(message);
                markInstalledPlugins();

                if (callback) callback();
            }
        }).catch(function() {
            Alertify.error('Can not update project');
        }).finally(function() {
            vm.isUpdating = '';
        });
    }

    function markInstalledPlugins() {
        var installedItemsCount = 0;
        angular.forEach(vm.items, function(item) {
            if (item.type == 'plugin') {
                if (LptHelper.getObjectBy('slug', item.slug, vm.installedPlugins).slug) {
                    item.installed = true;
                } else {
                    item.installed = false;
                }
            } else {
                if (vm.project['theme_' + item.theme_type] && vm.project['theme_' + item.theme_type].slug == item.slug) {
                    item.installed = true;
                } else {
                    item.installed = false;
                }
            }
            if(item.installed) installedItemsCount++;
            vm.installedItemsCount = installedItemsCount;
        });
    }

    function showTab(tab, themeType) {
        vm.filterCategoryName = '';
        switch (tab) {
            case 'all':
                vm.filterCategoryType = '';
                vm.filterInstalled = undefined;
                vm.filterThemeType = undefined;
                break;
            case 'plugin':
                vm.filterCategoryType = 'plugin';
                vm.filterThemeType = undefined;
                break;
            case 'theme':
                vm.filterCategoryType = 'theme';
                if(themeType) {
                    vm.filterThemeType = themeType;
                }
                break;
            case 'installed':
                vm.filterCategoryType = '';
                if(angular.isUndefined(vm.filterInstalled)) {
                    vm.filterInstalled = true;
                }else{
                    vm.filterInstalled = undefined;
                }
                break;
        }
    }
}
