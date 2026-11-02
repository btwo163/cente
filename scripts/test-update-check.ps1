$ErrorActionPreference = 'Stop'
$env:CENTE_UPDATE_REPO = 'example/cente'
$script:mode = 'api'
$script:calls = @()
$script:expected = @{
    version = 'v9.0.0'; notes = 'release notes'
    url = 'https://github.com/example/cente/releases/download/v9.0.0/cente-windows-x86_64.exe'
    digest = 'sha256:' + ('a' * 64); size = 1234; draft = $false; prerelease = $false
}
function Invoke-RestMethod {
    param($Uri, $Headers, $TimeoutSec)
    $script:calls += $Uri
    if ($Uri -eq 'https://api.github.com/repos/example/cente/releases/latest') {
        if ($script:mode -eq 'limited') { throw '403 API rate limit exceeded' }
        $digest = if ($script:mode -eq 'missing-digest') { $null } else { $script:expected.digest }
        return @{
            tag_name = $script:expected.version; body = $script:expected.notes
            draft = $false; prerelease = $false
            assets = @(@{name = 'cente-windows-x86_64.exe'; browser_download_url = $script:expected.url; digest = $digest; size = 1234})
        }
    }
    if ($Uri -ne 'https://github.com/example/cente/releases/latest/download/cente-update.json') { throw "Unexpected URL: $Uri" }
    return $script:expected
}
foreach ($mode in @('api', 'limited', 'missing-digest')) {
    $script:mode = $mode
    $script:calls = @()
    $result = (. (Join-Path $PSScriptRoot '../src-tauri/src/update-check.ps1')) | ConvertFrom-Json
    foreach ($key in $script:expected.Keys) {
        if ($result.$key -cne $script:expected[$key]) { throw "Incorrect $key in mode $mode" }
    }
    $count = if ($mode -eq 'api') { 1 } else { 2 }
    if ($script:calls.Count -ne $count) { throw "Incorrect request count in mode $mode" }
}
Write-Output 'PASS: API metadata, anonymous rate-limit fallback, missing-digest fallback'
