<?php
    $url = $_SERVER["QUERY_STRING"];
    $handle = fopen($url,"rb");
    $info = getimagesize($url);
    $form = $info['mime'];
    header("Access-Control-Allow-Origin: *");
    header("content-type:$form");
    $hanlde = fopen($url,"rb");
    $content = "";
    while (!feof($handle)) {$content .= fread($handle,10000);}
    fclose($handle);
    echo $content;
?>
