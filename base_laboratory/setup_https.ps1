param(
    [string]$HostIp = "",
    [switch]$OnlyCerts,
    [switch]$OnlyStart,
    [switch]$SkipBuild,
    [switch]$UseMkcert
)

$ErrorActionPreference = "Stop"

function Test-CommandExists {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-MkcertPath {
    $command = Get-Command mkcert -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
        return $command.Source
    }

    $wingetPackageDir = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path $wingetPackageDir) {
        $candidate = Get-ChildItem $wingetPackageDir -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like 'FiloSottile.mkcert*' } |
            Select-Object -First 1

        if ($candidate) {
            $exePath = Join-Path $candidate.FullName "mkcert.exe"
            if (Test-Path $exePath) {
                return $exePath
            }
        }
    }

    return $null
}

function Resolve-HostIpFromEnv {
    param([string]$RootPath)

    $envPath = Join-Path $RootPath ".env"
    if (-not (Test-Path $envPath)) {
        return $null
    }

    $line = Get-Content $envPath | Where-Object { $_ -match '^\s*PUBLIC_BASE_URL\s*=' } | Select-Object -First 1
    if (-not $line) {
        return $null
    }

    $value = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")
    try {
        return ([uri]$value).Host
    }
    catch {
        return $null
    }
}

function Remove-ContainerIfExists {
    param([string]$Name)

    $existing = docker ps -aq --filter "name=^/${Name}$"
    if ($existing) {
        Write-Host "Eski container topildi ($Name), o'chirilmoqda..." -ForegroundColor Yellow
        docker rm -f $Name | Out-Null
    }
}

function New-Cert {
    param(
        [string]$KeyPath,
        [string]$CrtPath,
        [string]$Ip
    )

    & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $KeyPath `
        -out $CrtPath `
        -subj "/CN=$Ip" `
        -addext "subjectAltName=IP:$Ip,DNS:localhost,IP:127.0.0.1"
}

function New-CertWithDocker {
    param(
        [string]$CertDir,
        [string]$KeyFile,
        [string]$CrtFile,
        [string]$Ip
    )

    $dockerPath = ($CertDir -replace '\\', '/')
    $opensslCmd = "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/$KeyFile -out /certs/$CrtFile -subj '/CN=$Ip' -addext 'subjectAltName=IP:$Ip,DNS:localhost,IP:127.0.0.1'"

    docker run --rm -v "${dockerPath}:/certs" alpine:3 sh -c $opensslCmd | Out-Null
}

function New-CertWithMkcert {
    param(
        [string]$MkcertExe,
        [string]$KeyPath,
        [string]$CrtPath,
        [string]$Ip
    )

    & $MkcertExe -cert-file $CrtPath -key-file $KeyPath localhost 127.0.0.1 $Ip
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$employeeServiceDir = Join-Path (Split-Path -Parent $root) "employee_service"
$backendCertDir = Join-Path $backendDir "certs"
$frontendCertDir = Join-Path $frontendDir "certs"
$employeeCertDir = Join-Path $employeeServiceDir "certs"

$backendKey = Join-Path $backendCertDir "backend.key"
$backendCrt = Join-Path $backendCertDir "backend.crt"
$frontendKey = Join-Path $frontendCertDir "frontend.key"
$frontendCrt = Join-Path $frontendCertDir "frontend.crt"
$employeeKey = Join-Path $employeeCertDir "employee.key"
$employeeCrt = Join-Path $employeeCertDir "employee.crt"

if (-not (Test-Path $backendDir) -or -not (Test-Path $frontendDir)) {
    throw "Repo root topilmadi. setup_https.ps1 faylini loyiha rootida ishga tushiring."
}

if (-not $HostIp) {
    $HostIp = Resolve-HostIpFromEnv -RootPath $root
}

if (-not $HostIp) {
    $HostIp = "192.168.2.72"
}

$usedMkcert = $false

if (-not $OnlyStart) {
    $hasLocalOpenSsl = Test-CommandExists "openssl"
    $hasDocker = Test-CommandExists "docker"
    $mkcertExe = Resolve-MkcertPath
    $hasMkcert = [bool]$mkcertExe

    if ($UseMkcert -and -not $hasMkcert) {
        throw "-UseMkcert berildi, lekin mkcert topilmadi. mkcert o'rnating yoki flagni olib tashlang."
    }

    $canUseMkcert = $UseMkcert -or $hasMkcert

    if (-not $canUseMkcert -and -not $hasLocalOpenSsl -and -not $hasDocker) {
        throw "mkcert/openssl/docker topilmadi. mkcert yoki OpenSSL o'rnating, yoki Docker Desktop ishga tushiring."
    }

    New-Item -Path $backendCertDir -ItemType Directory -Force | Out-Null
    New-Item -Path $frontendCertDir -ItemType Directory -Force | Out-Null
    New-Item -Path $employeeCertDir -ItemType Directory -Force | Out-Null

    if ($canUseMkcert) {
        Write-Host "[1/4] mkcert local CA o'rnatilmoqda (trusted cert)..." -ForegroundColor Cyan
        & $mkcertExe -install

        Write-Host "[2/4] Backend sertifikat yaratilmoqda (mkcert)..." -ForegroundColor Cyan
        New-CertWithMkcert -MkcertExe $mkcertExe -KeyPath $backendKey -CrtPath $backendCrt -Ip $HostIp

        Write-Host "[3/4] Frontend sertifikat yaratilmoqda (mkcert)..." -ForegroundColor Cyan
        New-CertWithMkcert -MkcertExe $mkcertExe -KeyPath $frontendKey -CrtPath $frontendCrt -Ip $HostIp

        Write-Host "[4/4] Employee Service sertifikat yaratilmoqda (mkcert)..." -ForegroundColor Cyan
        New-CertWithMkcert -MkcertExe $mkcertExe -KeyPath $employeeKey -CrtPath $employeeCrt -Ip $HostIp
        $usedMkcert = $true
    }
    elseif ($hasLocalOpenSsl) {
        Write-Host "[1/3] Backend sertifikat yaratilmoqda (local openssl)..." -ForegroundColor Cyan
        New-Cert -KeyPath $backendKey -CrtPath $backendCrt -Ip $HostIp

        Write-Host "[2/3] Frontend sertifikat yaratilmoqda (local openssl)..." -ForegroundColor Cyan
        New-Cert -KeyPath $frontendKey -CrtPath $frontendCrt -Ip $HostIp

        Write-Host "[3/3] Employee Service sertifikat yaratilmoqda (local openssl)..." -ForegroundColor Cyan
        New-Cert -KeyPath $employeeKey -CrtPath $employeeCrt -Ip $HostIp
    }
    else {
        Write-Host "[1/3] Backend sertifikat yaratilmoqda (docker openssl)..." -ForegroundColor Cyan
        New-CertWithDocker -CertDir $backendCertDir -KeyFile "backend.key" -CrtFile "backend.crt" -Ip $HostIp

        Write-Host "[2/3] Frontend sertifikat yaratilmoqda (docker openssl)..." -ForegroundColor Cyan
        New-CertWithDocker -CertDir $frontendCertDir -KeyFile "frontend.key" -CrtFile "frontend.crt" -Ip $HostIp

        Write-Host "[3/3] Employee Service sertifikat yaratilmoqda (docker openssl)..." -ForegroundColor Cyan
        New-CertWithDocker -CertDir $employeeCertDir -KeyFile "employee.key" -CrtFile "employee.crt" -Ip $HostIp
    }

    Write-Host "Sertifikatlar yaratildi:" -ForegroundColor Green
    Write-Host " - $backendCrt"
    Write-Host " - $frontendCrt"
    Write-Host " - $employeeCrt"
}

if ($OnlyCerts) {
    Write-Host "OnlyCerts yoqilgan: containerlar ishga tushirilmaydi." -ForegroundColor Yellow
    exit 0
}

if (-not (Test-CommandExists "docker")) {
    throw "docker topilmadi. Docker Desktop ishga tushganini tekshiring."
}

$composeArgs = if ($SkipBuild) { "up -d" } else { "up -d --build" }

Remove-ContainerIfExists -Name "laboratory_backend_https"
Remove-ContainerIfExists -Name "laboratory_backend_https_proxy"
Remove-ContainerIfExists -Name "laboratory_employee_service"
Remove-ContainerIfExists -Name "laboratory_employee_https_proxy"
Remove-ContainerIfExists -Name "laboratory_frontend_https"

Write-Host "[3/3] Backend HTTPS containerlari ishga tushirilmoqda..." -ForegroundColor Cyan
Push-Location $backendDir
try {
    Invoke-Expression "docker compose $composeArgs"
}
finally {
    Pop-Location
}

Write-Host "[4/3] Frontend HTTPS containerlari ishga tushirilmoqda..." -ForegroundColor Cyan
Push-Location $frontendDir
try {
    Invoke-Expression "docker compose $composeArgs"
}
finally {
    Pop-Location
}

Write-Host "Tayyor." -ForegroundColor Green
Write-Host "Frontend: https://${HostIp}:6060"
Write-Host "Backend API: https://${HostIp}:8050/api/v1"
Write-Host "Employee Service: https://${HostIp}:5000"
if ($usedMkcert) {
    Write-Host "mkcert ishlatildi: brauzerda sertifikat trusted bo'lishi kerak." -ForegroundColor Green
}
else {
    Write-Host "Eslatma: self-signed cert sabab brauzer warning chiqishi normal." -ForegroundColor Yellow
}
