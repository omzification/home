angular.module('lapentor.app')
    .factory('Project', Project);

function Project($q, $http, $auth, $state, envService) {
    var projects = null;

    var service = {
        all: all,
        get: get,
        create: create,
        duplicate: duplicate,
        update: update,
        updateTitle: updateTitle,
        updatePublicAccess: updatePublicAccess,
        updateCanListInPortfolio: updateCanListInPortfolio,
        updatePluginConfig: updatePluginConfig,
        updateThemeConfig: updateThemeConfig,
        updatePasswordProject: updatePasswordProject,
        checkPasswordProject: checkPasswordProject,
        remove: remove,
        download: download,
        getExportedVersions: getExportedVersions,
        deleteSnapshot: deleteSnapshot
    };

    return service;

    ///////// API calls

    function all(offset, limit, search) {
        var d = $q.defer();
        if (projects) {
            d.resolve(projects);
        } else {
            $http.get(envService.read('apiUrl') + '/projects',{params: { offset: offset, limit: limit, search: search }})
                .then(function(res) {
                    d.resolve(res.data);
                }, function(res) {
                    console.error('ERR: Get all projects', res);
                    d.reject(res);
                });
        }

        return d.promise;
    }

    function get(id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/project/' + id)
            .then(function(res) {
                var project = res.data;
                if (project) {
                    d.resolve(project);
                } else {
                    $auth.logout();
                    $state.go('login');
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Get project', res);
                d.reject(res);
            });

        return d.promise;
    }

    function getExportedVersions(project_id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/projects/exported/'+project_id)
            .then(function(res) {
                var res = res.data;
                if (res.status == 1) {
                    d.resolve(res.exportedVersions);
                } else {
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Get project', res);
                d.reject(res);
            });

        return d.promise;
    }

    function deleteSnapshot(id) {
        var d = $q.defer();
        $http.delete(envService.read('apiUrl') + '/projects/exported/'+id)
            .then(function(res) {
                var res = res.data;
                if (res.status == 1) {
                    d.resolve(true);
                } else {
                    d.reject();
                }
            }, function(res) {
                console.error('ERR: Delete snapshot', res);
                d.reject(res);
            });

        return d.promise;
    }

    function create(project) {
        return $http.post(envService.read('apiUrl') + '/project/create', project);
    }

    function duplicate(id) {
        var d = $q.defer();
        $http.post(envService.read('apiUrl') + '/project/duplicate/' + id).then(function(res) {
            if (res.data.status == 1) {
                d.resolve(res.data.duplicatedProject);
            } else {
                d.reject();
            }
        }, function(res) {
            console.error('ERR: Can not duplicate project');
            console.log(res);
            d.reject(false);
        });

        return d.promise;
    }

    function download(id, token, email) {
        var d = $q.defer();
        var url = envService.read('apiUrl') + '/export-project/' + id;
        var params = {
            token: token,
            email: email
        };

        $http.post(url, params).then(function(res) {
            d.resolve(res.data);
        }, function(res) {
            console.error('ERR: Can not download project');
            console.log(res);
            d.reject(false);
        });

        return d.promise;
    }

    function update(project) {
        var d = $q.defer();

        if (project.google) {
            project.google = Object.assign({}, project.google);
        }

        $http.put(envService.read('apiUrl') + '/project/' + project._id, project)
            .then(function(res) {
                d.resolve(res.data.status);
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.resolve(false);
            });

        return d.promise;
    }

    function updateTitle(title, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/title/' + project_id, { title: title })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.slug);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updatePublicAccess(is_public, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/public-access/' + project_id, { public: is_public })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updateCanListInPortfolio(in_portfolio, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/can-list-in-portfolio/' + project_id, { in_portfolio: in_portfolio })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updatePasswordProject(password, project_id) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/password/' + project_id, { password: password })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data.status);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function checkPasswordProject(password, project_id) {
        var result = false;
        $http.patch(envService.read('apiUrl') + '/sphere/active-password/' + project_id, { password: password })
            .then(function(res) {
                if (res.data.status) {
                    result = true;
                }
                return result;
            }, function(res) {

            });
        return result;

    }

    function updatePluginConfig(plugin, project_id) {
        var d = $q.defer();
        $http.patch(envService.read('apiUrl') + '/project/plugin/' + project_id, plugin)
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function updateThemeConfig(theme_type, project_id, config) {
        var d = $q.defer();

        $http.patch(envService.read('apiUrl') + '/project/theme/' + project_id, {
                theme_type: theme_type,
                config: config
            })
            .then(function(res) {
                if (res.data.status) {
                    d.resolve(res.data);
                } else {
                    d.reject(res);
                }
            }, function(res) {
                console.error('ERR: Update project ', res);
                d.reject(res);
            });

        return d.promise;
    }

    function remove(id) {
        return $http.delete(envService.read('apiUrl') + '/project/' + id);
    }
}
