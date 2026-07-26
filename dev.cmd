@echo off
set "NODEDIR=%~dp0..\website\tools\node"
set "PATH=%NODEDIR%;%PATH%"
cd /d "%~dp0"
npm run dev
