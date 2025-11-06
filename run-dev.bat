@echo off
setlocal

REM Run npm install only when node_modules is missing
if exist "node_modules" (
  echo Skipping npm install (node_modules already exists).
) else (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Aborting.
    exit /b 1
  )
)

echo Starting Vite dev server...
call npm run dev

endlocal
