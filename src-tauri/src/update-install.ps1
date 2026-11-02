$ErrorActionPreference = 'Stop'
$target = $env:CENTE_UPDATE_TARGET
$staged = $env:CENTE_UPDATE_FILE
$backup = $target + '.update-backup-' + [guid]::NewGuid().ToString('N')
$moved = $false
try {
    $old = Get-Process -Id ([int]$env:CENTE_UPDATE_PID) -ErrorAction SilentlyContinue
    if ($old -and !$old.WaitForExit(60000)) { throw 'Cente did not exit within 60 seconds; update cancelled' }
    # Recheck immediately before replacing the executable.
    if ((Get-FileHash -LiteralPath $staged -Algorithm SHA256).Hash -ne $env:CENTE_UPDATE_HASH) { throw 'Update SHA256 mismatch' }
    Move-Item -LiteralPath $target -Destination $backup
    $moved = $true
    Move-Item -LiteralPath $staged -Destination $target
    Start-Process -FilePath $target -WorkingDirectory (Split-Path -Parent $target) -WindowStyle Hidden
} catch {
    $_.Exception.Message | Set-Content -LiteralPath (Join-Path (Split-Path -Parent $staged) 'install-error.txt') -Encoding UTF8
    if ($moved) {
        Move-Item -LiteralPath $backup -Destination $target -Force
        Start-Process -FilePath $target -WorkingDirectory (Split-Path -Parent $target) -WindowStyle Hidden
    }
}
