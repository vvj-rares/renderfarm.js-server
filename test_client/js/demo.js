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

        camera.position.x = -3.54;
        camera.position.y = 4.594;
        camera.position.z = 1.671;
        camera.lookAt(0, 0.5, 0);
        camera.updateProjectionMatrix();
        scene.add(camera);
        window.demo.camera = camera;

        controls = new THREE.OrbitControls(camera);
        controls.target.set(0, 0.5, 0);
        window.demo.controls = controls;
    }

    var spotLight = new THREE.SpotLight( 0xffa0c0 );
    spotLight.name = "SpotLight1";
    spotLight.position.set( 10, 40, 10 );
    spotLight.target.position.set( 0, 0, 0 );
    spotLight.angle = Math.PI / 30;

    spotLight.castShadow = true;
    spotLight.shadow.bias = 1e-6;
    spotLight.shadow.mapSize.width  = 512;
    spotLight.shadow.mapSize.height = 512;

    spotLight.shadow.camera.near = 15;
    spotLight.shadow.camera.far = 43;
    spotLight.shadow.camera.fov = Math.PI / 30;
    spotLight.shadow.camera.updateProjectionMatrix();

    scene.add(spotLight);

    var helper = new THREE.CameraHelper( spotLight.shadow.camera );
    scene.add( helper );

    var gridHelper = new THREE.GridHelper(4, 4);
    scene.add(gridHelper);

    var geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry = new THREE.BufferGeometry().fromGeometry(geometry);

    var material = new THREE.MeshPhongMaterial({
        color: 0x40e040,
        transparent: false,
        opacity: 0.95
    });

    var cube = new THREE.Mesh(geometry, material);
    cube.name = "Box01";
    cube.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0))
    cube.castShadow = true;
    cube.receiveShadow = false;
    scene.add(cube);

    var cube2 = new THREE.Mesh(geometry, material);
    cube2.name = "Box02";
    cube2.applyMatrix(new THREE.Matrix4().makeTranslation(2, 0.5, 1))
    cube2.castShadow = true;
    cube2.receiveShadow = false;
    scene.add(cube2);
    // =============

    var planeGeometry = new THREE.PlaneGeometry( 5, 5, 1 );
        planeGeometry = new THREE.BufferGeometry().fromGeometry(planeGeometry);
    var material = new THREE.MeshPhongMaterial( {
        color: 0xf0ffff, 
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    } );

    var plane = new THREE.Mesh( planeGeometry, material );
    plane.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
    plane.applyMatrix(new THREE.Matrix4().makeTranslation(0.15,0,0.25));
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

        console.log("Uploading scene...");
        rfarm.postScene(newSession.guid, scene, function(result) {
            console.log(result);

            /* return;
            $("#renderStatus").text("Starting render...");
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

                            rfarm.closeSession(newSession.guid, function(closedSession) {
                                $("#renderStatus").text(`Session closed.`);
                                $("#btnRender").attr("disabled", false);
                                console.log("closedSession: ", closedSession);
                            });

                        /* }
                    });
                }, 1000);
            }); */

        });

    }, function(sessionError) {
        $("#renderStatus").text(`${sessionError.message} - ${sessionError.error}`);
        $("#renderStatus").css("color", "red");
        $("#btnRender").attr("disabled", false);
    })
}
