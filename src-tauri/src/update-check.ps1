$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    $headers = @{ 'User-Agent' = 'Cente-Updater'; Accept = 'application/vnd.github+json' }
    try {
        $release = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $env:CENTE_UPDATE_REPO + '/releases/latest') -Headers $headers -TimeoutSec 30
        $asset = @($release.assets | Where-Object { $_.name -eq 'cente-windows-x86_64.exe' }) | Select-Object -First 1
        if (!$asset -or !$asset.digest) { throw 'Release API is missing asset metadata' }
        $result = @{ version = $release.tag_name; notes = $release.body; url = $asset.browser_download_url; digest = $asset.digest; size = $asset.size; prerelease = $release.prerelease; draft = $release.draft }
    } catch {
        # Public release assets do not consume the anonymous REST API quota.
        # The Rust backend applies the same source, version, size and hash checks.
        $result = Invoke-RestMethod -Uri ("https://github.com/" + $env:CENTE_UPDATE_REPO + '/releases/latest/download/cente-update.json') -Headers $headers -TimeoutSec 30
    }
    $result | ConvertTo-Json -Compress -Depth 4
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
