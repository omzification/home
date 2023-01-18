angular.module('lapentor.app')
	.filter('shareUrl', function (envService) {
		return function (slug) {
			if(angular.isUndefined(slug)) return "";

        	return envService.read('siteUrl') + '/sphere/' + slug;
		}
	});