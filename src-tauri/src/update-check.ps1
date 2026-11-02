$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    $headers = @{ 'User-Agent' = 'Cente-Updater'; Accept = 'application/vnd.github+json' }
    $release = Invoke-RestMethod -Uri ("https://api.github.com/repos/" + $env:CENTE_UPDATE_REPO + '/releases/latest') -Headers $headers -TimeoutSec 30
    $asset = @($release.assets | Where-Object { $_.name -eq 'cente-windows-x86_64.exe' }) | Select-Object -First 1
    @{ version = $release.tag_name; notes = $release.body; url = $asset.browser_download_url; digest = $asset.digest; size = $asset.size; prerelease = $release.prerelease; draft = $release.draft } | ConvertTo-Json -Compress
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
