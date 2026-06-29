$ErrorActionPreference = 'Stop'

$configPath = Join-Path $PSScriptRoot '..\otel-collector-config.yaml'
if (-not (Test-Path $configPath)) {
    Write-Error "otel-collector-config.yaml not found at $configPath"
}

$content = Get-Content $configPath -Raw

$checks = @(
    @{ Name = 'splunk_hec exporter exists'; Pattern = '(?ms)exporters:\s.*?\bsplunk_hec:\s' },
    @{ Name = 'splunk endpoint configured via env'; Pattern = 'endpoint:\s*"\$\{SPLUNK_HEC_ENDPOINT\}"' },
    @{ Name = 'splunk token configured via env'; Pattern = 'token:\s*"\$\{SPLUNK_HEC_TOKEN\}"' },
    @{ Name = 'splunk source mapped'; Pattern = 'source:\s*"banking-app"' },
    @{ Name = 'splunk sourcetype mapped'; Pattern = 'sourcetype:\s*"java-otel"' },
    @{ Name = 'splunk index configured via env'; Pattern = 'index:\s*"\$\{SPLUNK_INDEX\}"' },
    @{ Name = 'opensearch exporter exists'; Pattern = '(?ms)exporters:\s.*?\belasticsearch/opensearch:\s' },
    @{ Name = 'opensearch endpoint configured via env'; Pattern = 'endpoints:\s*\["\$\{OPENSEARCH_ENDPOINT\}"\]' },
    @{ Name = 'jaeger traces exporter exists'; Pattern = '(?ms)exporters:\s.*?\botlphttp/jaeger:\s' },
    @{ Name = 'prometheus remote write exporter exists'; Pattern = '(?ms)exporters:\s.*?\bprometheusremotewrite:\s' },
    @{ Name = 'logs pipeline configured'; Pattern = '(?ms)service:\s.*?pipelines:\s.*?logs:\s' },
    @{ Name = 'logs pipeline exports splunk_hec'; Pattern = '(?ms)logs:\s.*?exporters:\s*\[[^\]]*splunk_hec[^\]]*\]' },
    @{ Name = 'logs pipeline exports opensearch'; Pattern = '(?ms)logs:\s.*?exporters:\s*\[[^\]]*elasticsearch/opensearch[^\]]*\]' },
    @{ Name = 'traces pipeline exports jaeger'; Pattern = '(?ms)traces:\s.*?exporters:\s*\[[^\]]*otlphttp/jaeger[^\]]*\]' },
    @{ Name = 'metrics pipeline exports prometheus remote write'; Pattern = '(?ms)metrics:\s.*?exporters:\s*\[[^\]]*prometheusremotewrite[^\]]*\]' }
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
Write-Host '3) Check OpenSearch logs index: GET http://10.235.21.132:9200/banking/_search?size=1'
Write-Host '4) Check Jaeger UI for new traces after traffic'
