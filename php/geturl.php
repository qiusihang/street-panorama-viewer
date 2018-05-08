<?php
    $url = $_SERVER["QUERY_STRING"];
    $handle = fopen($url,"rb");
    $callback = $_GET['callback'];
    $content = $callback.'(';
    while (!feof($handle)) {$content .= fread($handle,10000);}
    fclose($handle);
    $content .= ')';
    echo $content;
?>
