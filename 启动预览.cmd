@echo off
setlocal
cd /d "%~dp0"
set "PREVIEW_PORT=%~1"
if not defined PREVIEW_PORT set "PREVIEW_PORT=8787"
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { param([string]$PortText) $ErrorActionPreference = 'Stop'; $port = 0; if (-not [int]::TryParse($PortText, [ref]$port) -or $port -lt 1024 -or $port -gt 65535) { throw ('Invalid preview port: ' + $PortText) }; $root = (Get-Location).Path; $page = Join-Path $root 'site\bu-niu-ma-kitchen.html'; if (-not (Test-Path -LiteralPath $page)) { throw ('Preview page not found: ' + $page) }; $url = 'http://127.0.0.1:' + $port + '/bu-niu-ma-kitchen.html'; function Test-PreviewPage { try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; return $response.StatusCode -eq 200 } catch { return $false } }; $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($listener) { if (-not (Test-PreviewPage)) { throw ('Port ' + $port + ' is already in use, but the preview page is unavailable. Try another port, for example: 8791.') } } else { $python = (Get-Command python.exe -ErrorAction Stop).Source; $outLog = Join-Path $env:TEMP ('bu-niu-ma-preview-' + $port + '-out.log'); $errorLog = Join-Path $env:TEMP ('bu-niu-ma-preview-' + $port + '-error.log'); $server = Start-Process -FilePath $python -ArgumentList '-m','http.server',([string]$port),'--bind','127.0.0.1','--directory','site' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errorLog -PassThru; for ($attempt = 0; $attempt -lt 40; $attempt++) { if (Test-PreviewPage) { break }; if ($server.HasExited) { throw ('Preview server stopped: ' + (Get-Content -LiteralPath $errorLog -Raw -ErrorAction SilentlyContinue)) }; Start-Sleep -Milliseconds 200 }; if (-not (Test-PreviewPage)) { throw ('Preview page did not become ready: ' + $url) } }; Write-Host ('Preview ready: ' + $url); Start-Process $url }" "%PREVIEW_PORT%"
if errorlevel 1 (
  echo.
  echo Preview startup failed. Please send this window to Codex.
  pause
  exit /b 1
)
exit /b
