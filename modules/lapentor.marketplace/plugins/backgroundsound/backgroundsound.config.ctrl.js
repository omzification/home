// $scope inherited from marketplace.item.config.js
angular
  .module("lapentor.marketplace.plugins")
  .controller(
    "pluginBackgroundsoundConfigCtrl",
    pluginBackgroundsoundConfigCtrl
  );

/**
 * Controller for Google map plugin config modal
 * @param  {object} project   [project resolved]
 * @param  {object} item      [it can be theme or plugin]
 */
function pluginBackgroundsoundConfigCtrl(
  $scope,
  $sce,
  $rootScope,
  $timeout,
  project,
  item
) {
  var vm = this;
  vm.project = project;
  vm.scenes = project.scenes;
  vm.updateConfig = updateConfig;
  vm.openMediaLib = openMediaLib;
  vm.trustAsResourceUrl = trustAsResourceUrl;
  vm.config = item.config ? item.config : {};
  vm.config.audios = angular.isDefined(vm.config.audios)
    ? vm.config.audios
    : {};

  vm.toggleAll = function () {
    var toggleStatus = vm.select_all;
    angular.forEach(
      vm.config.audios[vm.targetAudio].scenes,
      function (itm, key) {
        vm.config.audios[vm.targetAudio].scenes[key] = toggleStatus;
      }
    );
  };

  vm.selectScene = function () {
    vm.select_all = true;
    angular.forEach(
      vm.config.audios[vm.targetAudio].scenes,
      function (itm, key) {
        if (!itm) vm.select_all = false;
      }
    );
  };

  vm.showOptionAudio = function (id) {
    vm.targetAudio = id;
    vm.config.audios[vm.targetAudio]["scenes"] =
      vm.config.audios[vm.targetAudio]["scenes"] || {};
    angular.forEach(vm.scenes, function (scene, key) {
      //vm.config.logos[vm.targetLogo]['scenes'][scene._id] = vm.config.logos[vm.targetLogo]['scenes'][scene._id] || true;
      if (
        angular.isUndefined(
          vm.config.audios[vm.targetAudio]["scenes"][scene._id]
        )
      ) {
        vm.config.audios[vm.targetAudio]["scenes"][scene._id] = false;
      }
    });
    vm.selectScene();
  };

  vm.deleteAudio = function (id) {
    delete vm.config.audios[id];
  };

  // Init
  chooseFirstAudio();

  ////// Internal functions

  function updateConfig() {
    vm.isUpdating = true;
    vm.config.version = 1;

    // Validate before submit
    var errorAudios = [];
    angular.forEach(vm.config.audios, function (au) {
        var allIsFalse = true;

        angular.forEach(au.scenes, function (scene) {
            if (scene) allIsFalse = false;
        })

        if (allIsFalse) {
            errorAudios.push(au.name);
        }
    })

    if (errorAudios.length) {
        vm.isUpdating = false;
        vm.errorMsg = 'Please choose at least one Scene to play for these sounds: ' + errorAudios.join(', ');

        $timeout(function () {
            vm.errorMsg = '';
        }, 4000);
    } else {
        $scope.updateConfig(item, vm.config, function () {
            vm.isUpdating = false;
        });
    }
  }

  /**
   * Open Media Library
   */
  function openMediaLib() {
    $rootScope.$broadcast("evt.openMediaLib", {
      tab: "asset",
      chooseAssetCallback: __chooseAssetCallback,
      canChooseMultipleFile: true,
    });
  }

  /**
   * Callback to receive file choosed from Media Library
   * @param  {object} file [file object contain file info from DB]
   */
  function __chooseAssetCallback(files) {
    var fileIds = [];
    if (vm.config.audios) {
      angular.forEach(vm.config.audios, function (value, key) {
        fileIds.push(value._id);
      });
    }

    angular.forEach(files, function (value, key) {
      var file = value;

      if (
        file.mime_type.indexOf("audio") != -1 &&
        fileIds.indexOf(file._id) < 0
      ) {
        file.volume = 80;
        file.is_loop = "1";
        vm.config.audios[file._id] = file;
      }
    });

    chooseFirstAudio();
  }

  function chooseFirstAudio() {
    try {
      if (vm.config.audios && Object.keys(vm.config.audios).length)
        vm.showOptionAudio(Object.values(vm.config.audios)[0]._id);
    } catch (error) {
      console.error(error);
    }
  }

  function trustAsResourceUrl(url) {
    return $sce.trustAsResourceUrl(url);
  }
}
