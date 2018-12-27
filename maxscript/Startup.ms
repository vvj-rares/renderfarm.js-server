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

fn rayysFlipYZ sceneRoot = (
	callbacks.removeScripts id:#flipYZ
	rotate sceneRoot (eulerangles 90 0 0)
)

fn rayysUnflipYZ sceneRoot = (
	callbacks.removeScripts id:#unflipYZ
	rotate sceneRoot (eulerangles -90 0 0)
)
