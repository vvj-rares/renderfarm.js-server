<?php

//Enable error reporting.
error_reporting(E_ALL);
ini_set("display_errors", 1);

$target_dir = "/var/www/html/rfarm/projects/";
$dst_filename = basename($_FILES["fileToUpload"]["name"]);
$target_file = $target_dir . $dst_filename;
$uploadOk = 1;
$imageFileType = strtolower(pathinfo($target_file,PATHINFO_EXTENSION));
// Check if image file is a actual image or fake image
if(isset($_POST["submit"])) {
    $check = getimagesize($_FILES["fileToUpload"]["tmp_name"]);
    if($check !== false) {
        echo "File is an image - " . $check["mime"] . ".";
        $uploadOk = 1;
    } else {
        echo "File is not an image.";
        $uploadOk = 0;
    }
}
// Check if file already exists
if (file_exists($target_file)) {
    echo "Sorry, file already exists.";
    $uploadOk = 0;
}
// Check file size
if ($_FILES["fileToUpload"]["size"] > 500000) {
    echo "Sorry, your file is too large.";
    $uploadOk = 0;
}
// Allow certain file formats
if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg"
&& $imageFileType != "gif" ) {
    echo "Sorry, only JPG, JPEG, PNG & GIF files are allowed.";
    $uploadOk = 0;
}
// Check if $uploadOk is set to 0 by an error
if ($uploadOk == 0) {
    echo "Sorry, your file was not uploaded.";
// if everything is ok, try to upload file
} else {

    $tmp_path = $_FILES["fileToUpload"]["tmp_name"];
    echo "<br>tmp_path: " . $tmp_path . "<br>";

    $tmp_filename = basename( $tmp_path );
    echo "<br>tmp_filename: " . $tmp_filename . "<br>";

    echo "<br>target_file: " . $target_file . "<br>";
    echo "<br>dst_filename: " . $dst_filename . "<br>";

    if (move_uploaded_file($tmp_path, $target_file)) {
        echo "The file ". basename( $_FILES["fileToUpload"]["name"]). " has been uploaded.";

        //TODO: register this tmp file with real name in REST API, so that file is moved into correct project directory

    } else {
        echo "Sorry, there was an error uploading your file.";
    }
}
?>