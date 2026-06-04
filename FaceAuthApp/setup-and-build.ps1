# FaceAuth App - Build Script for Windows
# Prerequisites: Node.js 22+, JDK 17, Android SDK
# Run: powershell -ExecutionPolicy Bypass -File setup-and-build.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== FaceAuth Build Script ===" -ForegroundColor Cyan

# 1. Check Java
Write-Host "`n[1/6] Checking Java..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
try {
    $javaVersion = & java -version 2>&1 | Select-Object -First 1
    Write-Host "  Found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Java not found. Install JDK 17: winget install Microsoft.OpenJDK.17" -ForegroundColor Red
    exit 1
}

# 2. Set JAVA_HOME
Write-Host "`n[2/6] Setting JAVA_HOME..." -ForegroundColor Yellow
$jdkPath = Get-ChildItem "C:\Program Files\Microsoft\jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $jdkPath) { $jdkPath = Get-ChildItem "C:\Program Files\Java\jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName }
if ($jdkPath) {
    $env:JAVA_HOME = $jdkPath
    Write-Host "  JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Could not auto-detect JAVA_HOME" -ForegroundColor Yellow
}

# 3. Set ANDROID_HOME
Write-Host "`n[3/6] Setting ANDROID_HOME..." -ForegroundColor Yellow
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $env:ANDROID_HOME)) {
    Write-Host "  ERROR: Android SDK not found at $env:ANDROID_HOME" -ForegroundColor Red
    Write-Host "  Please install Android Studio or set up the Android SDK manually" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green

# 4. Install npm dependencies
Write-Host "`n[4/6] Installing npm dependencies..." -ForegroundColor Yellow
npm install 2>&1 | Select-Object -Last 3

# 5. Run tests
Write-Host "`n[5/6] Running tests..." -ForegroundColor Yellow
npx jest --testPathPattern="embeddingUtils|database" --no-cache 2>&1 | Select-Object -Last 5

# 6. Build Release APK
Write-Host "`n[6/6] Building Release APK..." -ForegroundColor Yellow
Set-Location android
& .\gradlew.bat assembleRelease 2>&1 | Select-Object -Last 20

$apkPath = "app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
    Write-Host "`n=== BUILD SUCCESS ===" -ForegroundColor Green
    Write-Host "APK: $((Resolve-Path $apkPath).Path)" -ForegroundColor Cyan
    Write-Host "Size: ${size} MB" -ForegroundColor Cyan

    # Copy to project root
    Copy-Item $apkPath "..\FaceAuth-release.apk" -Force
    Write-Host "Copied to: FaceAuth-release.apk" -ForegroundColor Green
} else {
    Write-Host "`n=== BUILD FAILED ===" -ForegroundColor Red
    Write-Host "Check the output above for errors" -ForegroundColor Yellow
}

Set-Location ..
