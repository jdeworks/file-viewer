@echo off
setlocal enabledelayedexpansion

set "DOCS_DIR=%~dp0"
set "PORT=8000"

if not exist "%DOCS_DIR%index.html" (
  echo Expected docs directory next to this script.
  exit /b 1
)

echo Serving file-viewer examples on http://localhost:%PORT%/
python -m http.server %PORT% --directory "%DOCS_DIR%"
