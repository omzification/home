
<!doctype html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!-->
<html class="no-js" ng-app="lapentor.app">
<!--<![endif]-->
<?php
    $url = explode('/',$_SERVER['REQUEST_URI']);
    array_pop($url);
    $url =  implode('/', $url);
    $jsonString = file_get_contents('db.json');
    $project = json_decode($jsonString);
    $metaImage = !empty($project->meta->image)?$project->meta->image:$project->scenes[0]->pano_thumb;
    if(!strpos($metaImage,'http',0)) {
        $currentUrl = get_the_current_url();
        if(substr($currentUrl,-1) == '/' && substr($metaImage,0,1) == '/') {
            $metaImage = substr($currentUrl, 0, strlen($currentUrl) - 1) . $metaImage;
        }else{
            $metaImage = $currentUrl . $metaImage;
        }
    }

    function get_the_current_url() {
    
        $protocol = ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] == "on") ? "https" : "http");
        $base_url = $protocol . "://" . $_SERVER['HTTP_HOST'];
        $complete_url =   $base_url . $_SERVER["REQUEST_URI"];
        
        return $complete_url;
    }
?>
<head>
    <base href="<?php echo $_SERVER['REQUEST_URI'] ?>">
    <title><?php echo !empty($project->meta->title)?$project->meta->title:$project->title ?></title>
    <!-- Social meta -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="<?php echo !empty($project->meta->title)?$project->meta->title:$project->title ?>" />
    <meta property="og:description" content="<?php echo !empty($project->meta->description)?$project->meta->description:'' ?>" />
    <meta property="og:image" content="<?php echo $metaImage; ?>" />
    <meta name="fragment" content="!">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="google-signin-client_id" content="<154362449771-cnveshrlrbn36aq94meu9ie254uc9gku.apps.googleusercontent.com>">
    <meta name="google-signin-scope" content="https://www.googleapis.com/auth/analytics.readonly">
    <!-- <script type="text/javascript" src="newrelic.browser.js"></script> -->
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000">
    <meta name="msapplication-TileColor" content="#da532c">
    <meta name="theme-color" content="#ffffff">
    <!-- Place favicon.ico and apple-touch-icon.png in the root directory -->
    <link rel="stylesheet" href="bower_components/bootstrap/dist/css/bootstrap.css">
    <link rel="stylesheet" href="bower_components/bootstrap/dist/css/bootstrap-theme.min.css">
    <!-- <link rel="stylesheet" href="bower_components/ng-alertify/dist/ng-alertify.css">
    <link rel="stylesheet" href="bower_components/angularjs-slider/dist/rzslider.min.css"> -->
    <!-- <link rel="stylesheet" href="bower_components/angular-bootstrap-colorpicker/css/colorpicker.min.css"> -->
    <link rel="stylesheet" href="bower_components/components-font-awesome/css/font-awesome.min.css">
    <!-- <link rel="stylesheet" href="bower_components/angular-toggle-switch/angular-toggle-switch.css"> -->
    <!-- <link rel="stylesheet" href="bower_components/emojione.min.css" /> -->
    <link rel="stylesheet" href="bower_components/jquery.mCustomScrollbar/jquery.mCustomScrollbar.css" />
    <!-- <link rel="stylesheet" href="assets/styles/buttonstyles.css"> -->
    <!-- <link rel="stylesheet" href="bower_components/summernote/dist/summernote.css"> -->
    <!-- <link rel="stylesheet" href="assets/styles/app.css?v=3"> -->
    <link rel="stylesheet" href="assets/styles/lptfont.css">
    <link rel="stylesheet" href="bower_components/fancybox3/jquery.fancybox.min.css">
    <link rel="stylesheet" href="modules/lapentor.livesphere/livesphere.css">
    <link rel="stylesheet" href="modules/lapentor.marketplace/bundle-mkp.css?v6">
    <script>
    var LPT_VER = '10';
    </script>
</head>

<body>
    <!--[if lt IE 7]>
      <p class="browsehappy">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>
    <![endif]-->
    <!--[if lt IE 9]>
      <script src="bower_components/es5-shim/es5-shim.js"></script>
      <script src="bower_components/json3/lib/json3.min.js"></script>
    <![endif]-->
    <div ui-view=""></div>
    <div id="block-ui"></div>
    <div style="color: transparent; background: transparent; pointer-events: none; z-index: -99; position: fixed;">Powered by <a style="color:inherit;" href="https://lapentor.com/">Lapentor - the best Virtual Tour Software</a></div>
    <resolve-loader></resolve-loader>
    <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/emojione/2.2.6/lib/js/emojione.min.js"></script>
    <script src="dist/vendors1.min.js?v=12"></script>
    <!-- app scripts -->
    <script src="offline.js"></script>
    <script src="dist/scripts.min.js?v=132"></script>
    <!-- Load the JavaScript API client and Sign-in library. -->
    <script src="https://apis.google.com/js/client:platform.js"></script>
</body>

</html>