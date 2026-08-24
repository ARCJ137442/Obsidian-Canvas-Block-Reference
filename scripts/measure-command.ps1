param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $true)]
    [string]$Label,

    [int]$PollMilliseconds = 100
)

$ErrorActionPreference = "Stop"
$workDirectory = (Get-Location).Path
$tempDirectory = Join-Path $env:TEMP ("canvas-plugin-measure-" + [Guid]::NewGuid().ToString("N"))
$stdoutPath = Join-Path $tempDirectory "stdout.txt"
$stderrPath = Join-Path $tempDirectory "stderr.txt"
New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null

function Get-ProcessTreeIds {
    param([int]$RootId)

    $ids = New-Object System.Collections.Generic.HashSet[int]
    $pending = New-Object System.Collections.Generic.Queue[int]
    [void]$ids.Add($RootId)
    $pending.Enqueue($RootId)

    while ($pending.Count -gt 0) {
        $parentId = $pending.Dequeue()
        try {
            $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentId"
            foreach ($child in $children) {
                $childId = [int]$child.ProcessId
                if ($ids.Add($childId)) {
                    $pending.Enqueue($childId)
                }
            }
        } catch {
            # A short-lived process can disappear between enumeration and sampling.
        }
    }

    return @($ids)
}

function Sample-ProcessTree {
    param([int]$RootId)

    $workingSetBytes = [int64]0
    $cpuSeconds = [double]0
    $liveProcesses = 0

    foreach ($processId in (Get-ProcessTreeIds -RootId $RootId)) {
        try {
            $sampledProcess = Get-Process -Id $processId -ErrorAction Stop
            $workingSetBytes += [int64]$sampledProcess.WorkingSet64
            $cpuSeconds += $sampledProcess.TotalProcessorTime.TotalSeconds
            $liveProcesses++
        } catch {
            # A short-lived process can disappear between the two queries.
        }
    }

    return [pscustomobject]@{
        WorkingSetBytes = $workingSetBytes
        CpuSeconds = $cpuSeconds
        LiveProcesses = $liveProcesses
    }
}

$start = Get-Date
$exitMarker = "__CODEX_EXIT_CODE__"
$commandProcess = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/d", "/v:on", "/c", "$Command & echo $exitMarker!ERRORLEVEL!" `
    -WorkingDirectory $workDirectory `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -WindowStyle Hidden `
    -PassThru

$peakWorkingSetBytes = [int64]0
$peakCpuSeconds = [double]0
$sampleCount = 0

do {
    $sample = Sample-ProcessTree -RootId $commandProcess.Id
    $peakWorkingSetBytes = [Math]::Max($peakWorkingSetBytes, $sample.WorkingSetBytes)
    $peakCpuSeconds = [Math]::Max($peakCpuSeconds, $sample.CpuSeconds)
    $sampleCount++

    if (-not $commandProcess.HasExited) {
        Start-Sleep -Milliseconds $PollMilliseconds
    }
} while (-not $commandProcess.HasExited)

$commandProcess.WaitForExit()
$commandProcess.Refresh()
$end = Get-Date
$elapsed = $end - $start
$stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw } else { "" }
$stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { "" }
if ($null -eq $stdout) { $stdout = "" }
if ($null -eq $stderr) { $stderr = "" }
$exitMatch = [regex]::Match($stdout, "(?m)^$exitMarker(-?\d+)\s*$")
$exitCode = if ($exitMatch.Success) {
    [int]$exitMatch.Groups[1].Value
} else {
    [int]$commandProcess.ExitCode
}
$stdout = [regex]::Replace($stdout, "(?m)^$exitMarker\d+\s*$", "")

$report = [pscustomobject]@{
    label = $Label
    command = $Command
    startUtc = $start.ToUniversalTime().ToString("o")
    endUtc = $end.ToUniversalTime().ToString("o")
    wallClockMs = [Math]::Round($elapsed.TotalMilliseconds, 2)
    peakWorkingSetBytes = $peakWorkingSetBytes
    peakWorkingSetMiB = [Math]::Round($peakWorkingSetBytes / 1MB, 2)
    processTreeCpuSeconds = [Math]::Round($peakCpuSeconds, 3)
    sampleCount = $sampleCount
	exitCode = $exitCode
}

Write-Output ("RESOURCE_USAGE: " + ($report | ConvertTo-Json -Compress))
if ($stdout) {
    Write-Output "--- COMMAND STDOUT ---"
    Write-Output $stdout.TrimEnd()
}
if ($stderr) {
    Write-Output "--- COMMAND STDERR ---"
    Write-Output $stderr.TrimEnd()
}

Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
exit $exitCode
