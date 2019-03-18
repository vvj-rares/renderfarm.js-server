fn existFile fname = (getfiles fname).count != 0

fn rayysFindMaterialByName findName = (
	for matClass in material.classes do
	(
		for m in (getclassinstances matClass processAllAnimatables:true processChildren:true) do 
        (
			if (m.name == findName) then (
				return m;
			)
		)
	)
	return false;
)

fn rayysGetAllMaterialNames = (
    mats = #()
    json = "["
    jsonComma = 0;
    for matClass in material.classes do
    (
		for m in (getclassinstances matClass processAllAnimatables:true processChildren:true) do (
			if jsonComma > 0 then (
				json = append json ", "
			)
			json = append json ("\"" + m.name + "\"")
			jsonComma = jsonComma + 1;
		)
    )
    json = append json "]"
    return json
)

fn rayysBakeVrayLightShadowMaps obj outputDir outputNames size =
(
    --Clear all render elements 
    obj.iNodeBakeProperties.removeAllBakeElements() 

    --Preparing the Bake Elements:
    be1 = VRayLightingMap() --instance of the bake element class
    be1.outputSzX = be1.outputSzY = size --set the size of the baked map --specifythe full file path, name and type:
    be1.fileType = outputDir + "\\" + outputNames[1]
    be1.fileName = filenameFromPath be1.fileType
    be1.filterOn = true --enable filtering
    be1.enabled = true --enable baking

    --be2 = VRayLightingMap() -- instance of the bake element class
    --be2.outputSzX =be2.outputSzY = size --set the size of the baked map --specifythe full file path, name and type:
    --be2.fileType = outputDir + "\\" + outputNames[2]
    --be2.fileName = filenameFromPath be2.fileType
    --be2.filterOn = true --enable filtering
    --be2.enabled = true --enable baking --Preparing theobjectfor baking:

    obj.INodeBakeProperties.addBakeElement be1 --add first element
    --obj.INodeBakeProperties.addBakeElement be2 --add second element
    obj.INodeBakeProperties.bakeEnabled = true --enabling baking
    obj.INodeBakeProperties.bakeChannel = 2 --channel to bake
    obj.INodeBakeProperties.nDilations = 1 --expand the texturea bit
)

fn rayysFlattenUV2 curObj =
(
		select curObj
		setCommandPanelTaskMode mode:#modify

		bakeChannel_Obj = 2
		flattenAngle = 45.0
		flattenSpacing = 0.005
		flattenRotate = true
		flattenFillHoles = true
		
		unwrapMod = unwrap_UVW()

		unwrapMod.setAlwaysEdit false
		unwrapMod.setMapChannel bakeChannel_Obj
		unwrapMod.setFlattenAngle flattenAngle 
		unwrapMod.setFlattenSpacing flattenSpacing 
		unwrapMod.setFlattenNormalize true
		unwrapMod.setFlattenRotate flattenRotate 
		unwrapMod.setFlattenFillHoles flattenFillHoles 
		unwrapMod.setApplyToWholeObject true
		unwrapMod.name = "Flatten UV2"
		unwrapMod.setDebugLevel 0
		
		-- add it to the object
		unwrapMod.setApplyToWholeObject true
		addModifier curObj unwrapMod

		-- & flatten things
		-- unwrapMod.flattenMapByMatID flattenAngle flattenSpacing true 2 flattenRotate flattenFillHoles 
		unwrapMod.flattenMap flattenAngle #([1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]) flattenSpacing true bakeChannel_Obj flattenRotate flattenFillHoles

		subobjectlevel = 0
		-- or use instead of true: autoUnwrapMappingProps.cNormalize.checked
)
