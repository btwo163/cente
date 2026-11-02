$ErrorActionPreference = 'Stop'
$root = Join-Path ([IO.Path]::GetTempPath()) ('cente-update-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$env:CENTE_UPDATE_PID = '2147483647'
$env:CENTE_UPDATE_TARGET = Join-Path $root 'app.exe'
$env:CENTE_UPDATE_FILE = Join-Path $root 'new.exe'
$script:failLaunch = $false
$script:launches = 0
function Start-Process {
    param($FilePath, $WorkingDirectory, $WindowStyle)
    $script:launches++
    if ($script:failLaunch -and $script:launches -eq 1) { throw 'Simulated launch failure' }
}
$installer = Join-Path $PSScriptRoot '../src-tauri/src/update-install.ps1'
[IO.File]::WriteAllText($env:CENTE_UPDATE_TARGET, 'old')
[IO.File]::WriteAllText($env:CENTE_UPDATE_FILE, 'new')
$env:CENTE_UPDATE_HASH = (Get-FileHash -LiteralPath $env:CENTE_UPDATE_FILE).Hash
. $installer
if ([IO.File]::ReadAllText($env:CENTE_UPDATE_TARGET) -ne 'new') { throw 'Replacement failed' }
if ($script:launches -ne 1) { throw 'Restart was not requested' }

$script:launches = 0
$script:failLaunch = $true
[IO.File]::WriteAllText($env:CENTE_UPDATE_TARGET, 'old-again')
[IO.File]::WriteAllText($env:CENTE_UPDATE_FILE, 'new-again')
$env:CENTE_UPDATE_HASH = (Get-FileHash -LiteralPath $env:CENTE_UPDATE_FILE).Hash
. $installer
if ([IO.File]::ReadAllText($env:CENTE_UPDATE_TARGET) -ne 'old-again') { throw 'Rollback failed' }
if ($script:launches -ne 2) { throw 'Rollback restart was not requested' }

$script:launches = 0
[IO.File]::WriteAllText($env:CENTE_UPDATE_FILE, 'tampered')
. $installer
if ([IO.File]::ReadAllText($env:CENTE_UPDATE_TARGET) -ne 'old-again') { throw 'Hash mismatch changed target' }
if ($script:launches -ne 0) { throw 'Hash mismatch launched binary' }
Write-Output 'PASS: replacement, restart request, launch-failure rollback, hash mismatch preserves target'
# Leave fixtures in the temporary directory for inspection; no real executable is launched.
