$ErrorActionPreference = 'Stop'

$configPath = Join-Path $PSScriptRoot '..\otel-collector-config.yaml'
if (-not (Test-Path $configPath)) {
    Write-Error "otel-collector-config.yaml not found at $configPath"
}

$content = Get-Content $configPath -Raw

$checks = @(
    @{ Name = 'splunk_hec exporter exists'; Pattern = '(?ms)exporters:\s.*?\bsplunk_hec:\s' },
    @{ Name = 'splunk endpoint hardcoded'; Pattern = 'endpoint:\s*"http://10\.235\.21\.132:8088/services/collector"' },
    @{ Name = 'splunk token present'; Pattern = 'token:\s*"[^"]+"' },
    @{ Name = 'splunk source mapped'; Pattern = 'source:\s*"banking-app"' },
    @{ Name = 'splunk sourcetype mapped'; Pattern = 'sourcetype:\s*"java-otel"' },
    @{ Name = 'splunk index mapped'; Pattern = 'index:\s*"banking"' },
    @{ Name = 'logs pipeline configured'; Pattern = '(?ms)service:\s.*?pipelines:\s.*?logs:\s' },
    @{ Name = 'logs pipeline exports splunk_hec'; Pattern = '(?ms)logs:\s.*?exporters:\s*\[[^\]]*splunk_hec[^\]]*\]' }
)

$allPass = $true
foreach ($check in $checks) {
    if ($content -match $check.Pattern) {
        Write-Host "PASS - $($check.Name)" -ForegroundColor Green
    }
    else {
        Write-Host "FAIL - $($check.Name)" -ForegroundColor Red
        $allPass = $false
    }
}

if (-not $allPass) {
    Write-Error 'P1-T4 static validation failed. Review otel-collector-config.yaml mapping.'
}

Write-Host ''
Write-Host 'Next runtime checks:' -ForegroundColor Cyan
Write-Host '1) docker compose logs otel-collector --tail 300'
Write-Host '2) Search Splunk: index=banking source="banking-app" sourcetype="java-otel"'
