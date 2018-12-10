logInfo "MAXScript" "Greetings from log2console.dlx"
threejsApiStart 29207 "192.168.0.200"

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