angular.module('lapentor.marketplace.plugins')
    .controller('pluginScenetitleConfigCtrl', function($scope,$rootScope,$ocLazyLoad,$http, LptHelper, project, item) {
        var vm = this;
        vm.project = project;
        var thisPlugin = LptHelper.getObjectBy('slug', 'patch', vm.project.plugins);

        vm.googlefonts =[];
        
        vm.positionOptions = [{
            value: 'top-center',
            title: 'Top center'
        },{
            value: 'top-left',
            title: 'Top left'
        },{
            value: 'top-right',
            title: 'Top right'
        },{
            value: 'bottom-center',
            title: 'Bottom center'
        },{
            value: 'bottom-left',
            title: 'Bottom left'
        },{
            value: 'bottom-right',
            title: 'Bottom right'
        }];

        // init config
        vm.config = item.config || {};
        vm.config.position = vm.config.position || 'top-center';
        vm.config.offset_top = vm.config.offset_top || 20;
        vm.config.offset_left = vm.config.offset_left || 0;
        vm.config.offset_right = vm.config.offset_right || 0;
        vm.config.offset_bottom = vm.config.offset_bottom || 20;
        vm.config.color = vm.config.color || '#ffffff';
        
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
