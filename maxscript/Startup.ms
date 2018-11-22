logInfo "MAXScript" "Greetings from log2console.dlx"
threejsApiStart()

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
