@echo Compiling TypeScript...
cmd.exe /C tsc
if %errorlevel% GEQ 1 pause & exit /B 1

START cmd.exe /C "node dist\worker-fake\index.js count=1 & pause"
START cmd.exe /C "node dist\index.js env=acc & pause"
