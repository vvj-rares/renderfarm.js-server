for current in geometry do
(
    select current
    newFileName = current.name
    newFilePath = pathConfig.GetDir #export
    completeFilePath = (newFilePath + "/" + newFileName)
    
    exportFile completeFilePath #noPrompt selectedOnly:true using:FBXEXP
)

clearSelection()

