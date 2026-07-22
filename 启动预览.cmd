@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $url = 'http://127.0.0.1:8787/bu-niu-ma-kitchen.html'; $listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { $python = (Get-Command python.exe -ErrorAction Stop).Source; $outLog = Join-Path $env:TEMP 'bu-niu-ma-preview-out.log'; $errorLog = Join-Path $env:TEMP 'bu-niu-ma-preview-error.log'; $server = Start-Process -FilePath $python -ArgumentList '-m','http.server','8787','--bind','127.0.0.1','--directory','site' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errorLog -PassThru; for ($attempt = 0; $attempt -lt 30; $attempt++) { Start-Sleep -Milliseconds 200; if (Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue) { break }; if ($server.HasExited) { throw ('Preview server stopped: ' + (Get-Content -LiteralPath $errorLog -Raw -ErrorAction SilentlyContinue)) } }; if (-not (Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue)) { throw 'Preview server did not become ready on port 8787.' } }; Start-Process $url"
if errorlevel 1 (
  echo.
  echo Preview startup failed. Please send this window to Codex.
  pause
  exit /b 1
)
exit /b
