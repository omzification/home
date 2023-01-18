angular.module('lapentor.app')
    .factory('Marketplace', Marketplace);

function Marketplace($q, $http, LptHelper, envService) {
    var service = {
        getItems: getItems,
        getCategories: getCategories,
        getPluginButtons: getPluginButtons,
    };

    return service;

    /////////////

    /**
     * Get marketplace items from API
     * @return {object} all marketplace items object
     */
    function getItems() {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/marketplace/items')
            .then(function(res) {
                var items = res.data;
                angular.forEach(items, function(item) {
                    var controllerName = '';
                    switch (item.type) {
                        case 'plugin':
                            controllerName = item.type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                            break;
                        case 'theme':
                            controllerName = item.theme_type + LptHelper.capitalizeFirstLetter(item.slug) + 'ConfigCtrl';
                            break;
                    }
                    if (LptHelper.isControllerExist(controllerName)) { // check if config controller is defined or not
                        item.has_config = true;
                    } else {
                        item.has_config = false;
                    }
                    switch (item.type) {
                        case 'plugin':
                            if (item.screenshot) {
                                item.screenshot = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, item.screenshot);
                            } else {
                                item.screenshot = LptHelper.makeUrl(Config.PLUGIN_PATH, item.slug, 'screenshot.jpg');
                            }
                            break;
                        case 'theme':
                            if (item.screenshot) {
                                item.screenshot = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, item.screenshot);
                            } else {
                                item.screenshot = LptHelper.makeUrl(Config.THEME_PATH, item.theme_type, item.slug, 'screenshot.jpg');
                            }
                            break;
                    }
                });
                d.resolve(items);
            }, function(res) {
                d.reject(res);
            });

        return d.promise;
    }

    function getCategories() {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/marketplace/categories')
            .then(function(res) {
                var items = res.data;
                d.resolve(items);
            }, function(res) {
                d.reject(res);
            });

        return d.promise;
    }

    /**
     * Get buttons available that plugins registered
     * @param  {Object}  installedPlugins [installed plugins object]
     * @param  {Boolean} isEdit           [decide if is in edit mode]
     * @return {Object}                   [all available buttons]
     */
    function getPluginButtons(installedPlugins, isEdit) {
        var order = 'asc';
        var availableButtons = [];
        if (angular.isDefined(installedPlugins)) {
            angular.forEach(installedPlugins, function(pl) {
                if (angular.isDefined(pl.buttons)) {
                    for (var i in pl.buttons) {
                        pl.buttons[i].plugin_slug = pl.slug;
                        // Apply full asset path to icon_url
                        if (pl.buttons[i].icon_url && pl.buttons[i].icon_url.indexOf('/') == -1) {
                            pl.buttons[i].icon_url = LptHelper.makeUrl(Config.PLUGIN_PATH, pl.buttons[i].plugin_slug, 'images', pl.buttons[i].icon_url);
                        }
                    }
                    availableButtons = availableButtons.concat(pl.buttons);
                }
            });
        }
        // Sort buttons
        availableButtons = availableButtons.sort(function(a, b) {
            if (order == 'asc') {
                if (a.index == 0) return -1;
                return a.index > b.index;
            } else {
                return a.index < b.index;
            }
        });
        if (!isEdit) {
            // Hide some buttons on mobile
            var tempBtns = [];
            angular.forEach(availableButtons, function(btn) {
                if (btn.id == 'commonbuttons-fullscreen' && isMobile.apple.device) {
                    return;
                }
                if (btn.id === 'webvr-start' && !isMobile.any) return // hide WebVR btn on desktop
                tempBtns.push(btn);
            });
            availableButtons = tempBtns;

            // Remove hidden buttons from result if this is outside tour
            var availableButtonsResult = [];
            angular.forEach(availableButtons, function(btn, idx) {
                if (!btn.hide) availableButtonsResult.push(btn);
            });


            return availableButtonsResult;
        } else {
            return availableButtons;
        }

    }

}
