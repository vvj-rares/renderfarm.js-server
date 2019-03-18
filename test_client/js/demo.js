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

    var roomGeometry = new THREE.BoxGeometry( 100, 80, 100 );
    // invert the geometry on the x-axis so that all of the faces point inward
    roomGeometry.scale( - 1, 1, 1 );
    roomGeometry = new THREE.BufferGeometry().fromGeometry(roomGeometry);

    var roomMaterial = new THREE.MeshBasicMaterial( {
        color: 0xA9A0A2
    } );

    let roomMesh = new THREE.Mesh( roomGeometry, roomMaterial );
    roomMesh.name = "Room001";
    roomMesh.applyMatrix(new THREE.Matrix4().makeTranslation(0,39.9,0));
    roomMesh.castShadow = false;
    roomMesh.receiveShadow = true;
    scene.add( roomMesh );


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

function renderScene(scene, camera, width, height, renderSettings, onRenderComplete) {
    console.log(camera);

    $("#btnRenderImg").attr("disabled", true);
    $("#btnRenderEnv").attr("disabled", true);
    $("#renderStatus").css("color", "gray");

    // have session? just do it
    if (window.demo.sessionGuid) {
        updateCamera(window.demo.camera);
        postJob(window.demo.sessionGuid, window.demo.camera.name, width, height, renderSettings, onRenderComplete);
        return;
    }

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

        console.log("Uploading geometries...");
        $("#renderStatus").text("Uploading geometries...");
        rfarm.postGeometries(newSession.guid, geometriesJson, function(result) {
            console.log(result);

            console.log("Uploading materials...");
            $("#renderStatus").text("Uploading materials...");
            rfarm.postMaterials(newSession.guid, materialsJson, function(result) {
                console.log(result);

                console.log("Uploading scene...");
                $("#renderStatus").text("Uploading scene...");
                rfarm.postScene(newSession.guid, sceneJson, function(result) {
                    console.log(result);

                    if (result.data.unwrapped_geometry) {
                        // let queue = [ window.demo.scene ];
                        // type: "Mesh"
                        let unwrappedGeometries = {};
                        let responses = [];
                        for (let uuid in result.data.unwrapped_geometry) {
                            $.get(result.data.unwrapped_geometry[uuid], function(json) {
                                responses.push(json);

                                var bufferGeometryLoader = new THREE.BufferGeometryLoader();
                                let loadedGeometry = bufferGeometryLoader.parse(json);
                                loadedGeometry.uuid = json.uuid;
                                unwrappedGeometries[json.uuid] = loadedGeometry;

                                if (responses.length === Object.keys(result.data.unwrapped_geometry).length ) {
                                    console.log("all complete: ", responses);
                                    console.log("unwrappedGeometries: ", unwrappedGeometries);

                                    // traverse the scene now
                                    let queue = [ window.demo.scene ];
                                    let uuid0; // dirty hack
                                    while (queue.length > 0) {
                                        let obj = queue.shift();
                                        if (obj.children) {
                                            for (let c in obj.children) {
                                                queue.push( obj.children[c] );
                                            }
                                        }
        
                                        if (obj.type === "Mesh") {
                                            if (unwrappedGeometries[obj.geometry.uuid]) {
                                                obj.geometry = unwrappedGeometries[obj.geometry.uuid];
                                                if (!uuid0) {
                                                    uuid0 = obj.uuid; // dirty hack here
                                                }
                                            } else {
                                                console.warn("geometry.uuid not found in unwrappedGeometries: " + obj.geometry.uuid);
                                            }
                                        }
                                    }

                                    console.log(window.demo.scene);

                                    // postJob(newSession.guid, window.demo.camera.name, width, height, renderSettings, onRenderComplete);
                                    postJob(newSession.guid, undefined, uuid0, width, height, renderSettings, onRenderComplete);
                                }
                            });
                        }
                    }

                    setTimeout(function() {
                        closeSession(newSession.guid);
                    }, 15000);
                });

            });
        });

    }, function(sessionError) {
        $("#renderStatus").text(`${sessionError.message} - ${sessionError.error}`);
        $("#renderStatus").css("color", "red");
        $("#btnRenderImg").attr("disabled", false);
        $("#btnRenderEnv").attr("disabled", false);
    })
}

function postJob(sessionGuid, cameraName, bakeObjectName, width, height, renderSettings, onRenderComplete) {
    $("#renderStatus").text("Starting render...");
    rfarm.createJob(sessionGuid, cameraName, bakeObjectName, width, height, renderSettings, function(job) {
        $("#renderStatus").text(`Rendering... 0 sec.`);

        let t0 = new Date();

        let jobTimer = setInterval(function() {
            let t1 = new Date();

            rfarm.getJob (job.guid, function(updatedJob) {
                $("#renderStatus").text(`Rendering... ${ ((t1 - t0) / 1000).toFixed(0) } sec.`);

                if (updatedJob.closed) {
                    $("#renderStatus").text(`Render complete!`);

                    clearInterval(jobTimer);
                    console.log(updatedJob.urls);

                    $("#btnRenderImg").attr("disabled", false);
                    $("#btnRenderEnv").attr("disabled", false);

                    if (onRenderComplete) onRenderComplete( updatedJob.urls );
                }
            });

        }, 1000);
    });
}

function updateCamera(camera) {
    var cameraJson = camera.toJSON();

    rfarm.putCamera(window.demo.sessionGuid, cameraJson, function(result) {
        console.log(result);
    });
}

function closeSession(sessionGuid) {
    if (!sessionGuid) return;

    rfarm.closeSession(sessionGuid, function(closedSession) {
        $("#renderStatus").text(`Session closed.`);
        console.log("closedSession: ", closedSession);
    });
}

function saveJson(jsonObj, filename) {
    var sceneText = JSON.stringify(jsonObj);

    var blob = new Blob([sceneText], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);
}

function updateImg(url) {
    $("#vray").attr("src", url);
}

function openEnvmapViewer(url) {
    console.log(" >> openEnvmapViewer: ", url)
    var win = window.open(`http://renderfarmjs.com/envmap-viewer?url[0]=${url}`, '_blank');
    win.focus();
}