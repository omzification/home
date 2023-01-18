<?php 
if ($_SERVER['REQUEST_METHOD'] === 'GET'){
	$url = explode('/',$_SERVER['REQUEST_URI']);
    array_pop($url);
    $url =  implode('/', $url);

	$jsonString = file_get_contents('db.json');

	if($jsonString){

		$jsonString = str_replace('"\/uploads\/vr\/','"'.$url.'\/uploads\/vr\/',$jsonString);
    	$jsonString = str_replace('scene.xml', 'scene.php', $jsonString);

		echo $jsonString;
		return;
	}
}
?>	