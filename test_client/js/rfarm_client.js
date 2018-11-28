var rfarm = {
    apiKey: "75f5-4d53-b0f4",
    baseUrl: "https://localhost:8000",
    geometries: [],  // here we map scene geometry uuid <==> backend geometry resource
    materials: [],   // here we map scene material uuid <==> backend material resource
    sessionId: null, // current session
    nodes: [],
};

rfarm.createSession = function(onCreated) {
    console.log("Requesting new session...");
    //todo: implement it

    $.ajax({
        url: this.rfarmBaseUrl + "/session",
        data: { api_key: this.apiKey },
        type: 'POST',
        success: function(result) {
            this.sessionId = result.id;
            console.log(result);
            if (onCreated) onCreated(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err.responseJSON);
        }.bind(this)
    });

}.bind(rfarm);

rfarm.closeSession = function(sessionGuid, onClosed) {
    console.log("Closing session...");
    //todo: implement it

    $.ajax({
        url: this.rfarmBaseUrl + "/session/" + sessionGuid,
        data: { 
            session: this.sessionId 
        },
        type: 'DELETE',
        success: function(result) {
            console.log(result);
            if (onClosed) onClosed();
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

rfarm.createScene = function(onCreated) {
    console.log("Creating new scene...");
    //todo: implement it

    $.ajax({
        url: this.rfarmBaseUrl + "/scene",
        data: { 
            session: this.sessionId
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            if (onCreated) onCreated();
        },
        error: function(err) {
            console.error(err);
        }
    });
}.bind(rfarm);

rfarm.createCamera = function(camera, onCameraReady) {
    console.log("Creating new scene...");

    var cameraJson = camera.toJSON();
    var cameraText = JSON.stringify(cameraJson);
    var compressedCameraData = LZString144.compressToBase64(cameraText);

    $.ajax({
        url: "https://localhost:8000/scene/camera",
        data: { 
            session: this.sessionId,
            camera: compressedCameraData 
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            onCameraReady(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });

}.bind(rfarm);

rfarm.createLight = function(onCreated) {
    console.log("Creating new light...");
    //todo: implement it

    $.ajax({
        url: this.rfarmBaseUrl + "/scene/skylight",
        data: { 
            session: this.sessionId, 
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            if (onCreated) onCreated();
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

rfarm.createMaterial = function(material, onCreated) {
    console.log("Creating new material...");
    //todo: implement it

    $.ajax({
        url: this.rfarmBaseUrl + "/scene/0/material",
        data: { 
            session: this.sessionId,
            diffuseColor_r: Math.round(255*material.color.r),
            diffuseColor_g: Math.round(255*material.color.g),
            diffuseColor_b: Math.round(255*material.color.b)
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            if (onCreated) onCreated(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

rfarm.createMesh = function(sceneJson, materialName, onMeshReady) {
    console.log("Creating new mesh...");
    //todo: implement it

    var sceneText = JSON.stringify(sceneJson);
    var compressedSceneData = LZString144.compressToBase64(sceneText);

    $.ajax({
        url: this.rfarmBaseUrl + "/scene/mesh",
        data: { 
            session: this.sessionId,
            mesh: compressedSceneData,
            material: materialName
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            if (onMeshReady) onMeshReady();
        },
        error: function(err) {
            console.error(err);
        }
    });
}.bind(rfarm);

rfarm.render = function(camera, width, height, onImageReady) {
    console.log("Creating new render job...");

    // var width = $("#viewport").outerWidth();
    // var height = $("#viewport").outerHeight();

    $.ajax({
        url: this.rfarmBaseUrl + "/job",
        data: { 
            session: document.sessionId, 
            width: width, 
            height: height, 
            camera: cameraId 
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            onImageReady(result.url);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

document.rfarm = rfarm;
