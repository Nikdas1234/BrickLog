# Erzeugt einmalig den Signaturschlüssel der Android-App im Ordner "geheim".
# Der Ordner ist von Git ausgeschlossen. Ein vorhandener Schlüssel wird nie überschrieben.
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot
$dir = Join-Path $root 'geheim'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'

if (Test-Path (Join-Path $dir 'bricklog.p12')) { throw 'Der Schlüssel existiert bereits und wird nicht überschrieben.' }
if (-not (Test-Path $openssl)) { throw "openssl nicht gefunden: $openssl (gehört zu Git für Windows)" }
New-Item -ItemType Directory -Force $dir | Out-Null

$chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.ToCharArray()
$password = -join (1..32 | ForEach-Object { $chars[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32($chars.Length)] })
[IO.File]::WriteAllText((Join-Path $dir 'passwort.txt'), $password)

Push-Location $dir
try {
    # Selbstsigniertes Zertifikat, 30 Jahre gültig; mehr verlangt Android für eine
    # selbst verteilte App nicht.
    & $openssl req -x509 -newkey rsa:2048 -sha256 -days 10950 -nodes -keyout key.pem -out cert.pem -subj '/CN=BrickLog/O=Nikdas1234' 2>$null
    & $openssl pkcs12 -export -inkey key.pem -in cert.pem -name bricklog -out bricklog.p12 -passout 'file:passwort.txt'
    if (-not (Test-Path 'bricklog.p12')) { throw 'Der Schlüsselbund wurde nicht erzeugt.' }
}
finally {
    # Die unverschlüsselten Zwischendateien dürfen nicht liegen bleiben.
    foreach ($temp in 'key.pem', 'cert.pem') { if (Test-Path $temp) { [IO.File]::Delete((Join-Path $dir $temp)) } }
    Pop-Location
}

@'
BrickLog – Signaturschlüssel der Android-App
============================================

bricklog.p12   Der Schlüssel (PKCS12-Schlüsselbund, Alias "bricklog").
passwort.txt   Das Passwort dazu.

Mit diesem Schlüssel wird jede APK signiert. Android nimmt eine neue Fassung nur dann
als Aktualisierung an, wenn sie mit demselben Schlüssel signiert ist.

GEHT DER SCHLÜSSEL VERLOREN, lässt sich die App auf dem Handy nicht mehr aktualisieren.
Dann bleibt nur: Sicherung exportieren, App deinstallieren, neue App installieren,
Sicherung einspielen.

Deshalb: Diesen Ordner an einen zweiten Ort kopieren (USB-Stick, Passwortmanager).
Er ist von Git ausgeschlossen und liegt NICHT auf GitHub. Dort liegen Schlüssel und
Passwort nur als verschlüsselte "Secrets" des Repositories (BRICKLOG_KEYSTORE_BASE64,
BRICKLOG_KEYSTORE_PASSWORD), aus denen sie sich nicht wieder auslesen lassen.

Niemals weitergeben oder veröffentlichen: Wer ihn hat, kann eine gefälschte
Aktualisierung für deine App signieren.
'@ | Set-Content (Join-Path $dir 'LIESMICH.txt') -Encoding utf8

"Schlüssel erzeugt in $dir"
