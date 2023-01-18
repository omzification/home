angular.module('lapentor.app')
    .factory('Hotspot', Hotspot);

function Hotspot($q, $http, envService, LptHelper) {
    var service = {
        all: all,
        create: create,
        append: append,
        update: update,
        getTypes: getTypes,
        remove: remove,
        getDemoHotspots: getDemoHotspots
    };

    return service;

    /////////////

    function all(scene_id) {
        var d = $q.defer();
        $http.get(envService.read('apiUrl') + '/hotspots', {
                params: { scene_id: scene_id }
            })
            .then(function(res) {
                d.resolve(res.data);
            }, function(res) {
                console.error('ERR: Get all hotspots', res);
                d.reject(res);
            });

        return d.promise;
    }

    function create(x, y, type, scene_id, project_slug) {
        return $http.post(envService.read('apiUrl') + '/hotspot/create', {
            x: x,
            y: y,
            scene_id: scene_id,
            type: type,
            project_slug: project_slug
        });
    }

    function update(hotspot) {
        return $http.put(envService.read('apiUrl') + '/hotspot/' + hotspot._id, hotspot);
    }

    function append(hotspot, lptSphereInstance) {
        var hotspotName = 'lptHotspot' + hotspot._id;

        lptSphereInstance.addHotspot({
            title: hotspot.title,
            name: hotspotName,
            url: 'assets/images/hotspots/' + hotspot.type + '.png',
            ath: hotspot.position.x,
            atv: hotspot.position.y
        });
    }

    function getTypes(themeSlug) {
        var iconPrefix = 'assets/images/hotspots';
        if (themeSlug) {
            iconPrefix = LptHelper.makeUrl(Config.THEME_PATH, 'hotspot', themeSlug, 'images');
        }

        return [{
            name: "point",
            tooltip: 'Point Hotspot',
            icon: iconPrefix + '/point.png'
        }, {
            name: "sound",
            tooltip: 'Directional sound Hotspot',
            icon: iconPrefix + '/sound.png'
        }, {
            name: "image",
            tooltip: 'Image Hotspot',
            icon: iconPrefix + '/image.png'
        }, {
            name: "video",
            tooltip: 'Video Hotspot',
            icon: iconPrefix + '/video.png'
        }, {
            name: "article",
            tooltip: 'Article Hotspot',
            icon: iconPrefix + '/article.png'
        }, {
            name: "textf",
            tooltip: 'Info Hotspot',
            icon: iconPrefix + '/textf.png'
        }, {
            name: "url",
            tooltip: 'Url Hotspot',
            icon: iconPrefix + '/url.png'
        }];
    }

    function getDemoHotspots() {
        var xStep = -60,
            baseId = 1;

        function _getStep() {
            xStep += 16;
            return xStep;
        }

        function _getId() {
            return baseId++;
        }
        return [{
            "_id": _getId(),
            "title": "Point hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "point"
        }, {
            "_id": _getId(),
            "title": "Image hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "image"
        }, {
            "_id": _getId(),
            "title": "Video hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "video"
        }, {
            "_id": _getId(),
            "title": "Article hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "article"
        }, {
            "_id": _getId(),
            "title": "Text field hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "textf"
        }, {
            "_id": _getId(),
            "title": "Url hotspot",
            "position": {
                "x": _getStep(),
                "y": 0,
            },
            "type": "url"
        }];
    }

    function remove(id, project_slug) {
        return $http.delete(envService.read('apiUrl') + '/hotspot/' + id + '?project_slug=' + project_slug);
    }
}
