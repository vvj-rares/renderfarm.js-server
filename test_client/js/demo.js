function initScene() {
    window.demo = {};

    var renderer;
    var camera;
    var controls;
    var scene = new THREE.Scene();
    window.demo.scene = scene;

    let viewportElement = document.getElementById("viewport");
    { // init renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: viewportElement
        });
        renderer.setSize(viewportElement.offsetWidth, viewportElement.offsetHeight);
        renderer.setClearColor(new THREE.Color(0xaeaeae));

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    { // init camera
        camera = new THREE.PerspectiveCamera(54, 640 / 480, 0.1, 1000);
        camera.name = "Camera001";

        camera.position.x = 7.65;
        camera.position.y = 5.85;
        camera.position.z = 9.45;
        camera.lookAt(0, 0.5, 0);
        camera.updateProjectionMatrix();
        scene.add(camera);
        window.demo.camera = camera;

        controls = new THREE.OrbitControls(camera);
        controls.target.set(0, 0.5, 0);
        window.demo.controls = controls;
    }

    var spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.name = "SpotLight1";
    spotLight.position.set( 10, 40, 10 );
    spotLight.target.position.set( 0, 0, 0 );
    spotLight.angle = Math.PI / 20;

    spotLight.castShadow = true;
    spotLight.shadow.bias = 1e-6;
    spotLight.shadow.mapSize.width  = 512;
    spotLight.shadow.mapSize.height = 512;

    spotLight.shadow.camera.near = 15;
    spotLight.shadow.camera.far = 55;
    spotLight.shadow.camera.fov = 360 * spotLight.angle / Math.PI;

    scene.add(spotLight);

    var helper = new THREE.CameraHelper( spotLight.shadow.camera );
    scene.add( helper );

    var gridHelper = new THREE.GridHelper(4, 4);
    scene.add(gridHelper);

    var geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry = new THREE.BufferGeometry().fromGeometry(geometry);

    var materialWhite = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        transparent: false,
        opacity: 0.95
    });

    var materialRed = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        transparent: false,
        opacity: 0.95
    });

    var materialGreen = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        transparent: false,
        opacity: 0.95
    });

    var materialBlue = new THREE.MeshPhongMaterial({ 
        color: 0x0000ff,
        transparent: false,
        opacity: 0.95
    });

    var cube = new THREE.Mesh(geometry, materialWhite);
    cube.name = "Box0";
    cube.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    cube.castShadow = true;
    cube.receiveShadow = false;
    scene.add(cube);

    var cubex = new THREE.Mesh(geometry, materialRed);
    cubex.name = "BoxX";
    cubex.applyMatrix(new THREE.Matrix4().makeTranslation(3, 0, 0));
    cubex.castShadow = true;
    cubex.receiveShadow = false;
    cube.add(cubex);

    var cubey = new THREE.Mesh(geometry, materialGreen);
    cubey.name = "BoxY";
    cubey.applyMatrix(new THREE.Matrix4().makeTranslation(-3, 3, 0));
    cubey.castShadow = true;
    cubey.receiveShadow = false;
    cubex.add(cubey);

    var cubez = new THREE.Mesh(geometry, materialBlue);
    cubez.name = "BoxZ";
    cubez.applyMatrix(new THREE.Matrix4().makeTranslation(0, -3, 3));
    cubez.castShadow = true;
    cubez.receiveShadow = false;
    cubey.add(cubez);
    // =============

    var planeGeometry = new THREE.PlaneGeometry( 15, 15, 1 );
        planeGeometry = new THREE.BufferGeometry().fromGeometry(planeGeometry);
    var material = new THREE.MeshPhongMaterial({
        color: 0xf0ffff, 
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    var plane = new THREE.Mesh( planeGeometry, material );
    plane.name = "Plane0";
    plane.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0,0,0));
    plane.castShadow = false;
    plane.receiveShadow = true;
    scene.add(plane);

    var animate = function() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
}

function renderScene(scene, camera) {
    console.log(camera);

    $("#btnRender").attr("disabled", true);
    $("#renderStatus").css("color", "gray");
    $("#renderStatus").text("Opening new session...");

    rfarm.createSession(function(newSession) {
        console.log("newSession: ", newSession);

        window.demo.sessionGuid = newSession.guid;

        var sceneJson = scene.toJSON();
        var geometriesJson = sceneJson.geometries;
        var materialsJson = sceneJson.materials;

        if (sceneJson.materials) {
            delete sceneJson.materials;
        }
        if (sceneJson.geometries) {
            delete sceneJson.geometries;
        }

        // rfarm.postGeometry(scene.)
        console.log(geometriesJson);
        rfarm.postGeometries(newSession.guid, geometriesJson, function(result) {
            console.log(result);

            console.log(materialsJson);
            rfarm.postMaterials(newSession.guid, materialsJson, function(result) {
                console.log(result);

                console.log("Uploading scene...");
                rfarm.postScene(newSession.guid, sceneJson, function(result) {
                    console.log(result);

                    /* $("#renderStatus").text("Starting render...");
                    rfarm.createJob(newSession.guid, function(job) {

                        $("#renderStatus").text(`Rendering...`);

                        let t0 = new Date();

                        let jobTimer = setInterval(function() {
                            let t1 = new Date();
        
                            rfarm.getJob (job.guid, function(updatedJob) {
                                $("#renderStatus").text(`Rendering... ${ ((t1 - t0) / 1000).toFixed(0) } sec.`);
        
                                if (updatedJob.closed) {
                                    $("#renderStatus").text(`Render complete, downloading image...`);
        
                                    clearInterval(jobTimer);
                                    console.log(updatedJob.urls);
                                    $("#vray").attr("src", updatedJob.urls[0]); */
        
                                    setTimeout(function() {
                                        rfarm.closeSession(newSession.guid, function(closedSession) {
                                            $("#renderStatus").text(`Session closed.`);
                                            $("#btnRender").attr("disabled", false);
                                            console.log("closedSession: ", closedSession);
                                        });

                                    }, 30000); /*
                                }
                            });
                        }, 1000);
                    }); */

                });

            });
        });

    }, function(sessionError) {
        $("#renderStatus").text(`${sessionError.message} - ${sessionError.error}`);
        $("#renderStatus").css("color", "red");
        $("#btnRender").attr("disabled", false);
    })
}

function updateCamera(camera) {
    var cameraJson = camera.toJSON();

    rfarm.putCamera(window.demo.sessionGuid, cameraJson, function(result) {
        console.log(result);
    });
}

function saveJson(jsonObj, filename) {
    var sceneText = JSON.stringify(jsonObj);

    var blob = new Blob([sceneText], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);
}
