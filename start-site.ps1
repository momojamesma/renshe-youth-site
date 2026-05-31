$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspace

$nodeCandidates = @(
  "C:\Users\momo1\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
  "C:\Program Files\nodejs\node.exe",
  "C:\Program Files\WindowsApps\OpenAI.Codex_26.527.3686.0_x64__2p2nqsd0c76g0\app\resources\node.exe"
)

$nodePath = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $nodePath) {
  throw "Node.js was not found. Please install Node.js or confirm the Codex runtime exists."
}

$existing = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $existing) {
  Start-Process -FilePath $nodePath -ArgumentList "server.js" -WorkingDirectory $workspace -WindowStyle Hidden
  Start-Sleep -Seconds 2
}

$chromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)

$chromePath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chromePath) {
  Start-Process -FilePath $chromePath -ArgumentList "http://localhost:3000"
} else {
  Start-Process "http://localhost:3000"
}

Write-Host "Site started: http://localhost:3000"
