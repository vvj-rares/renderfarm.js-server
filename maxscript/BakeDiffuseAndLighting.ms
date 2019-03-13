size = 256
rayysBakeVrayLightShadowMaps $Box001 "C:\\Temp" "Box001" size
select $Box001
render rendertype:#bakeSelected vfb:on progressBar:true outputSize:[size,size]
