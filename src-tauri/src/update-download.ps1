$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    Invoke-WebRequest -UseBasicParsing -Uri $env:CENTE_UPDATE_URL -OutFile $env:CENTE_UPDATE_FILE -TimeoutSec 180
    if ((Get-Item -LiteralPath $env:CENTE_UPDATE_FILE).Length -ne [long]$env:CENTE_UPDATE_SIZE) { throw 'Update size mismatch' }
    if ((Get-FileHash -LiteralPath $env:CENTE_UPDATE_FILE -Algorithm SHA256).Hash -ne $env:CENTE_UPDATE_HASH) { throw 'Update SHA256 mismatch' }
    $stream = [IO.File]::OpenRead($env:CENTE_UPDATE_FILE)
    try { if ($stream.ReadByte() -ne 77 -or $stream.ReadByte() -ne 90) { throw 'Invalid Windows executable' } } finally { $stream.Dispose() }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
