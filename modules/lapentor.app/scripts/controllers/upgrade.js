angular.module('lapentor.app')
    .controller('UpgradeCtrl', UpgradeCtrl);

function UpgradeCtrl($scope, $http, Alertify, envService, $rootScope) {
    var uVm = this;

    uVm.openUpgradeForm = openUpgradeForm;
    uVm.switchMethod = switchMethod;
    uVm.closeUpgradeForm = closeUpgradeForm;
    uVm.submit = submit;
    uVm.showPaymentForm = false;
    uVm.isLoading = false;
    uVm.card = {};

    uVm.switchMethod('yearly');

    /////// functions

    function submit() {
        // Prevent repeated click
        if (uVm.isLoading) return;
        // Request a token from Stripe:
        uVm.isLoading = true;
        Stripe.card.createToken(uVm.card, stripeResponseHandler);
    }

    function stripeResponseHandler(status, response) {
        if (response.error) { // Problem!
            // Show the errors on the form:
            Alertify.error(response.error.message);
            uVm.isLoading = false;
        } else { // Token was created!
            // Get the token ID:
            var token = response.id;

            // Insert the token ID into the form so it gets submitted to the server:
            // Submit the form:
            $http.post(envService.read('apiUrl') + '/user/upgrade', {
                stripeToken: token,
                type: uVm.method,
                coupon: uVm.coupon
            }).then(function(res) {
                // Upgrade is success
                if (res.data.status == 1) {
                    uVm.card = {}; // clear form
                    // Display success message
                    uVm.showCongrat = true;
                    $rootScope.$broadcast('user.update', res.data.user);
                }
            }, function(res) {
                Alertify.error('Sorry. Please try again');
            }).finally(function() {
                uVm.isLoading = false;
            });
        }
    };

    function openUpgradeForm(user) {
        jQuery('#upgradeModal').show();

        // Hide payment form if user is already subscribed
        if (user.subscribed) {
            uVm.showCongrat = true;
            uVm.showPaymentForm = false;
        }
    }

    function closeUpgradeForm() {
        jQuery('#upgradeModal').hide();
    }

    function switchMethod(method) {
        uVm.method = method;
        switch (method) {
            case 'monthly':
                uVm.price = envService.read('planMonthly');
                break;
            case 'yearly':
                uVm.price = envService.read('planYearly');
                break;
        }
    }
}
