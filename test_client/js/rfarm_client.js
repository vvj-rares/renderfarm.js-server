var rfarm = {
    apiKey: "75f5-4d53-b0f4",
    workspace: "55a0bd33-9f15-4bc0-a482-17899eb67af3",
    baseUrl: "https://localhost:8000",

    geometries: {},  // here we map scene geometry uuid <==> backend geometry resource
    materials: {},   // here we map scene material uuid <==> backend material resource

    nodes: {},       // here we map scene nodes         <==> backend nodes
    sessionId: null,  // current session

    // node constructor, maps threejs node ref to 3ds max node name
    _rfarmNode: function(threeNodeRef, maxNodeName) {
        return {
            threeNodeRef: threeNodeRef,
            maxNodeName: maxNodeName
        };
    }
};

// public
rfarm.createSession = function(onCreated) {
    console.log("Requesting new session...");
    //todo: implement it

    $.ajax({
        url: this.baseUrl  + "/session",
        data: { api_key: this.apiKey, workspace: this.workspace },
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

// public
rfarm.closeSession = function(sessionGuid, onClosed) {
    console.log("Closing session...");
    //todo: implement it

    $.ajax({
        url: this.baseUrl  + "/session/" + sessionGuid,
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

// public
rfarm.createScene = function(scene, onComplete) {
    console.log("Creating new scene...");

    $.ajax({
        url: this.baseUrl  + "/scene",
        data: { 
            session: this.sessionId
        },
        type: 'POST',
        success: function(result) {
            console.log(result);

            let sceneRootNodeName = result.id;
            this.nodes[ scene.uuid ] = new rfarm._rfarmNode(scene, sceneRootNodeName);

            if (onComplete) onComplete(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

// public
rfarm.createMesh = function(obj, onComplete) {
    if (obj.type === "Mesh") {
        this._postGeometry( obj.geometry, function(geometryName) {
            this._postMaterial( obj.material, function(materialName) {
                this._getMaxNodeName( obj.parent, function(parentName) {
                    obj.updateMatrixWorld (true);
                    this._postMesh(parentName, geometryName, materialName, obj.matrixWorld.elements, function(nodeName) {
                        // 3ds max object may be renamed when it was added to scene
                        this.geometries[ obj.geometry.uuid ].maxNodeName = nodeName;

                        this.nodes[ obj.uuid ] = new rfarm._rfarmNode(obj, nodeName);
                        console.log("client nodes: ", this.nodes);
                        onComplete(nodeName);
                    }.bind(this));
                }.bind(this) )
            }.bind(this) );
        }.bind(this) );
    }
}.bind(rfarm);

//public
rfarm.createCamera = function(camera, onCameraReady) {
    console.log("Creating new scene...");

    camera.updateMatrix();
    camera.updateMatrixWorld (true);
    camera.updateProjectionMatrix();

    var cameraJson = camera.toJSON();
    var cameraText = JSON.stringify(cameraJson);
    var compressedCameraData = LZString144.compressToBase64(cameraText);

    $.ajax({
        url: "https://localhost:8000/scene/0/camera",
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

//public
rfarm.createSkylight = function(onCreated) {
    console.log("Creating new skylight...");

    $.ajax({
        url: this.baseUrl  + "/scene/0/skylight",
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

//public
rfarm.createSpotlight = function(spotlight, spotlightTarget, onCreated) {
    console.log("Creating new spotlight...");

    spotlight.updateMatrix();
    spotlight.updateMatrixWorld (true);

    spotlightTarget.updateMatrix();
    spotlightTarget.updateMatrixWorld (true);

    var spotlightJson = spotlight.toJSON();
    spotlightJson.object.target = spotlightTarget.matrixWorld.elements;
    var spotlightText = JSON.stringify(spotlightJson.object);
    var compressedSpotlightData = LZString144.compressToBase64(spotlightText);

    $.ajax({
        url: this.baseUrl  + "/scene/0/spotlight",
        data: { 
            session: this.sessionId,
            spotlight: compressedSpotlightData
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

//public
rfarm.render = function(cameraName, width, height, onImageReady) {
    console.log("Creating new render job...");

    $.ajax({
        url: this.baseUrl  + "/job",
        data: { 
            session: this.sessionId,
            width: width, 
            height: height, 
            camera: cameraName 
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

// private
rfarm._postGeometry = function(geometry, onComplete) {
    console.log("Importing geometry...");

    var geometryText = JSON.stringify(geometry.toJSON());
    var compressedGeometryData = LZString144.compressToBase64(geometryText);

    $.ajax({
        url: this.baseUrl  + "/scene/0/geometry",
        data: { 
            session: this.sessionId,
            geometry: compressedGeometryData
        },
        type: 'POST',
        success: function(result) {
            console.log(result);

            let editableMeshNodeName = result.id;
            this.geometries[ geometry.uuid ] = new rfarm._rfarmNode(geometry, editableMeshNodeName);

            if (onComplete) onComplete(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });

}.bind(rfarm);

rfarm._postMaterial = function(material, onComplete) {
    console.log("Creating new material...");

    var materialJson = material.toJSON();
    var materialText = JSON.stringify(materialJson);
    var compressedMaterialData = LZString144.compressToBase64(materialText);

    $.ajax({
        url: this.baseUrl  + "/scene/0/material",
        data: {
            session: this.sessionId,
            material: compressedMaterialData,
        },
        type: 'POST',
        success: function(result) {
            console.log(result);

            let maxMaterialName = result.id;
            this.materials[ material.uuid ] = new rfarm._rfarmNode(material, maxMaterialName);

            if (onComplete) onComplete(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);

rfarm._getMaxNodeName = function(threeNodeRef, onComplete) {
    // returns node name in 3ds max by given threejs node ref
    if (this.nodes[ threeNodeRef.uuid ] !== undefined) {
        onComplete( this.nodes[ threeNodeRef.uuid ].maxNodeName );
    }
}.bind(rfarm);

rfarm._postMesh = function(parentName, geometryName, materialName, matrixWorldArray, onComplete) {
    console.log("Creating new node...");

    var matrixText = JSON.stringify(matrixWorldArray);
    var compressedMatrixData = LZString144.compressToBase64(matrixText);

    $.ajax({
        url: this.baseUrl  + "/scene/0/mesh",
        data: { 
            session: this.sessionId,
            parentName: parentName,
            geometryName: geometryName,
            materialName: materialName,
            matrixWorld: compressedMatrixData
        },
        type: 'POST',
        success: function(result) {
            console.log(result);
            if (onComplete) onComplete(result.id);
        }.bind(this),
        error: function(err) {
            console.error(err);
        }.bind(this)
    });
}.bind(rfarm);
