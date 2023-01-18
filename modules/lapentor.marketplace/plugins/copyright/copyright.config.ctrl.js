angular.module('lapentor.marketplace.plugins')
    .controller('pluginCopyrightConfigCtrl', function($scope,$rootScope,$ocLazyLoad,$http, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);
        vm.textSummernoteOptions = {
            height: 200,
            focus: true,
            dialogsInBody: true,
            toolbar: [
                ['style', ['bold', 'italic', 'underline','link', 'picture']],
            ]
        };

        vm.googlefonts = [];
        
        vm.positionOptions = [{
            value: 'top-left',
            title: 'Top left'
        },{
            value: 'top-right',
            title: 'Top right'
        },{
            value: 'bottom-left',
            title: 'Bottom left'
        },{
            value: 'bottom-right',
            title: 'Bottom right'
        }];

        // init config
        vm.config = item.config || {};
        vm.config.position = vm.config.position || 'bottom-right';
        vm.config.offest_top = vm.config.offest_top || 20;
        vm.config.offest_left = vm.config.offest_left || 0;
        vm.config.offest_right = vm.config.offest_right || 0;
        vm.config.offest_bottom = vm.config.offest_bottom || 20;
        vm.config.color = vm.config.color || '#ffffff';
        vm.config.text = vm.config.text || 'text here';
        
        // functions
        vm.updateConfig = updateConfig;
        vm.fontFamilyChange = fontFamilyChange;

        if(vm.config.fontfamily){
            $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
        }

        $http.get('https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyDY31rAJVkfb6GoONiVs03LB87ThdbHZj0')
            .then(function(res) {
                if(res.data) {
                    vm.googlefonts = res.data.items;
                }
            }, function(res) {
                console.log(res);
            });

        /////////
        
        function fontFamilyChange(){
            if(!angular.isDefined(vm.config.fontfamily) ||  vm.config.fontfamily !=""){
                $ocLazyLoad.load('css!https://fonts.googleapis.com/css?family='+vm.config.fontfamily);
            }
        }

        function updateConfig() {
            vm.isUpdating = true;
            $scope.updateConfig(item, vm.config, function() {
                vm.isUpdating = false;
            });
        }

    });
