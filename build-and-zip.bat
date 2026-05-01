@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Running npm run build...
call npm run build
if errorlevel 1 (
  echo Build failed.
  exit /b 1
)

if not exist "dist\" (
  echo dist folder not found after build.
  exit /b 1
)

if not exist "zipped\" mkdir "zipped"

for /f "usebackq delims=" %%a in (`powershell -NoProfile -NoLogo -Command "(Get-Date).ToString('yyyy-MM-dd_HH-mm-ss')"`) do set "STAMP=%%a"

for /f "usebackq delims=" %%v in (`powershell -NoProfile -NoLogo -Command "(Get-Content -Raw -LiteralPath '%~dp0package.json' | ConvertFrom-Json).version"`) do set "APPVER=%%v"

set "ZIPNAME=shopify-spykit-%APPVER%__%STAMP%.zip"

echo Creating zipped\%ZIPNAME%...

powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop'; " ^
  "$root = (Get-Location).Path; " ^
  "$outDir = Join-Path $root 'zipped'; " ^
  "New-Item -ItemType Directory -Force -Path $outDir | Out-Null; " ^
  "$dest = Join-Path $outDir '%ZIPNAME%'; " ^
  "if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }; " ^
  "$dist = Join-Path $root 'dist'; " ^
  "$items = @(Get-ChildItem -LiteralPath $dist -Force); " ^
  "if ($items.Count -eq 0) { throw 'dist folder is empty' }; " ^
  "Compress-Archive -LiteralPath ($items.FullName) -DestinationPath $dest -CompressionLevel Optimal"

if errorlevel 1 (
  echo Failed to create zip.
  exit /b 1
)

echo Created: %CD%\zipped\%ZIPNAME%
exit /b 0
