param([ValidateRange(1, 2)][int]$AuthorizedRuns = 2)
$ErrorActionPreference = 'Stop'
$endpoint = 'https://platform.sevenpos.pro/api/cron/billing-expiry'

function Invoke-SanitizedExpiry([string]$Label, [string]$Authorization) {
    $requestHeaders = @{}
    if ($Authorization) { $requestHeaders.Authorization = $Authorization }
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method Get -Headers $requestHeaders -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 40
        $body = $response.Content | ConvertFrom-Json
        [pscustomobject]@{
            label = $Label
            status = [int]$response.StatusCode
            success = $body.success -eq $true
            manualExpired = $body.manualExpired
            providerExpired = $body.providerExpired
            expired = $body.expired
            utc = [DateTime]::UtcNow.ToString('o')
        } | ConvertTo-Json -Compress
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        # Never print exception text, request headers, or an upstream raw body.
        [pscustomobject]@{ label = $Label; status = $status; success = $false; utc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress
    }
}

Invoke-SanitizedExpiry 'without-auth' ''
Invoke-SanitizedExpiry 'wrong-secret' 'Bearer invalid-qa-probe'
$secret = $env:CRON_SECRET
try {
    if (-not $secret) {
        $secure = Read-Host 'CRON_SECRET (entrada oculta; no se guarda)' -AsSecureString
        $secret = [System.Net.NetworkCredential]::new('', $secure).Password
    }
    if (-not $secret) { throw 'CRON_SECRET_REQUIRED' }
    for ($run = 1; $run -le $AuthorizedRuns; $run++) {
        Invoke-SanitizedExpiry "authorized-$run" "Bearer $secret"
    }
} finally {
    $secret = $null
    if ($secure) { $secure.Dispose() }
}
