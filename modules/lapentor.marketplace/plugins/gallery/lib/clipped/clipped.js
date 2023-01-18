angular.module('lapentor.marketplace.plugins')
    .directive('pluginGalleryClipped', function() {
        return {
            restrict: 'E',
            templateUrl: Config.PLUGIN_PATH + '/gallery/lib/clipped/clipped.html',
            controllerAs: 'vm',
            controller: function($scope, $rootScope, $timeout, $ocLazyLoad) {
                var vm = this;
                vm.pluginInterface = $scope.pluginVm;
                vm.config = vm.pluginInterface.config;
                vm.gallery = [];
                vm.ShowGallery = false;

                if (vm.config.show_on_start == 'yes') {
                    $timeout(function() {
                        vm.ShowGallery = true;
                    });
                }

                $ocLazyLoad.load('bower_components/snap.svg-min.js').then(function() {
                    if (angular.isUndefined(vm.config.gallery)) { vm.config.gallery = {}; }
                    if (!vm.config.type) vm.config.type = 'project';

                    if (vm.config.gallery.project && vm.config.type == 'project') {

                        vm.gallery = $.map(vm.config.gallery.project, function(value, index) {
                            return [value];
                        });

                        $timeout(function() {
                            duration = ($('.no-csstransitions').length > 0) ? 0 : 300;
                            $('.cd-svg-clipped-slider').each(function() {
                                //create a svgClippedSlider object for each .cd-svg-clipped-slider
                                new svgClippedSlider($(this));
                            });
                        }, 200)
                    }

                    $scope.$on('evt.krpano.onxmlcomplete', function() {
                        if (vm.config.type == 'scene') {
                            if (!vm.config.gallery[$scope.scene._id]) vm.gallery = [];

                            vm.gallery = $.map(vm.config.gallery[$scope.scene._id], function(value, index) {
                                return [value];
                            });

                            $timeout(function() {
                                duration = ($('.no-csstransitions').length > 0) ? 0 : 300;
                                $('.cd-svg-clipped-slider').each(function() {
                                    //create a svgClippedSlider object for each .cd-svg-clipped-slider
                                    new svgClippedSlider($(this));
                                });
                            }, 200)
                        }
                    });

                    var duration;
                    var eventPrefix = 'evt.controlbar.' + vm.pluginInterface.plugin.slug + 'gallery-';
                    $rootScope.$on(eventPrefix + 'toggle', function(event, eventType) {
                        if (eventType == 'click') {
                            vm.ShowGallery = !vm.ShowGallery;
                        }
                    });

                    //define a svgClippedSlider object
                    function svgClippedSlider(element) {
                        this.element = element;
                        this.slidesGallery = this.element.find('.gallery').children('li');
                        this.slidesCaption = this.element.find('.caption').children('li');
                        this.slidesNumber = this.slidesGallery.length;
                        this.selectedSlide = this.slidesGallery.filter('.selected').index();
                        this.arrowNext = this.element.find('.navigation').find('.next');
                        this.arrowPrev = this.element.find('.navigation').find('.prev');

                        this.visibleSlidePath = this.element.data('selected');
                        this.lateralSlidePath = this.element.data('lateral');

                        this.bindEvents();
                    }

                    svgClippedSlider.prototype.bindEvents = function() {
                        var self = this;
                        //detect click on one of the slides
                        this.slidesGallery.on('click', function(event) {
                            if (!$(this).hasClass('selected')) {
                                //determine new slide index and show it
                                var newSlideIndex = ($(this).hasClass('left')) ? self.showPrevSlide(self.selectedSlide - 1) : self.showNextSlide(self.selectedSlide + 1);
                            }
                        });
                    }

                    svgClippedSlider.prototype.showPrevSlide = function(index) {
                        var self = this;
                        this.selectedSlide = index;
                        this.slidesGallery.eq(index + 1).add(this.slidesCaption.eq(index + 1)).removeClass('selected').addClass('right');
                        this.slidesGallery.eq(index).add(this.slidesCaption.eq(index)).removeClass('left').addClass('selected');

                        //morph the svg cliph path to reveal a different region of the image
                        Snap("#cd-morphing-path-" + (index + 1)).animate({ 'd': self.visibleSlidePath }, duration, mina.easeinout);
                        Snap("#cd-morphing-path-" + (index + 2)).animate({ 'd': self.lateralSlidePath }, duration, mina.easeinout);

                        if (index - 1 >= 0) this.slidesGallery.eq(index - 1).add(this.slidesCaption.eq(index - 1)).removeClass('left-hide').addClass('left');
                        if (index + 2 < this.slidesNumber) this.slidesGallery.eq(index + 2).add(this.slidesCaption.eq(index + 2)).removeClass('right');

                        (index <= 0) && this.element.addClass('prev-hidden');
                        this.element.removeClass('next-hidden');

                        //animate prev arrow on click
                        this.arrowPrev.addClass('active').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
                            self.arrowPrev.removeClass('active');
                        });
                    }

                    svgClippedSlider.prototype.showNextSlide = function(index) {
                        var self = this;
                        this.selectedSlide = index;
                        this.slidesGallery.eq(index - 1).add(this.slidesCaption.eq(index - 1)).removeClass('selected').addClass('left');
                        this.slidesGallery.eq(index).add(this.slidesCaption.eq(index)).removeClass('right').addClass('selected');

                        //morph the svg cliph path to reveal a different region of the image
                        Snap("#cd-morphing-path-" + (index + 1)).animate({ 'd': self.visibleSlidePath }, duration, mina.easeinout);
                        Snap("#cd-morphing-path-" + (index)).animate({ 'd': self.lateralSlidePath }, duration, mina.easeinout);

                        if (index - 2 >= 0) this.slidesGallery.eq(index - 2).add(this.slidesCaption.eq(index - 2)).removeClass('left').addClass('left-hide');
                        if (index + 1 < this.slidesNumber) this.slidesGallery.eq(index + 1).add(this.slidesCaption.eq(index + 1)).addClass('right');

                        (index + 1 >= this.slidesNumber) && this.element.addClass('next-hidden');
                        this.element.removeClass('prev-hidden');

                        //animate next arrow on click
                        this.arrowNext.addClass('active').on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function() {
                            self.arrowNext.removeClass('active');
                        });
                    }
                });
            }
        }
    });