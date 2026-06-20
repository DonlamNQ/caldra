# Caldra - durcissement reboot du VPS MT5.
#
# La tache planifiee "CaldraMT5Worker" (-AtLogOn) existe DEJA sur le VPS et relance
# le worker des qu'une session s'ouvre. Il manque juste deux choses pour survivre a
# un REBOOT COMPLET sans intervention :
#   1. qu'une session Windows s'ouvre toute seule au boot  (auto-logon)
#   2. que le terminal MT5 (appli GUI) se rouvre tout seul  (dossier Demarrage)
# Ce script fait les deux. NE recree PAS de tache planifiee (on garde l'existante).
#
# A lancer UNE FOIS sur le VPS, PowerShell ADMIN :
#   powershell -ExecutionPolicy Bypass -File .\harden-reboot.ps1

param(
  [string]$Mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
)

$ErrorActionPreference = "Stop"

# --- 1. Auto-logon Windows (AutoAdminLogon) ---
# Le mot de passe est demande a l'ecran (pas en clair dans ce fichier).
$sec = Read-Host "Mot de passe du compte $env:USERNAME (pour l'auto-logon)" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

$winlogon = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty $winlogon -Name AutoAdminLogon    -Value "1"
Set-ItemProperty $winlogon -Name DefaultUserName   -Value $env:USERNAME
Set-ItemProperty $winlogon -Name DefaultDomainName -Value $env:USERDOMAIN
Set-ItemProperty $winlogon -Name DefaultPassword   -Value $plain
Write-Host "OK - auto-logon active pour $env:USERDOMAIN\$env:USERNAME"
Write-Host "    (NB: AutoAdminLogon stocke le mot de passe en clair dans le registre."
Write-Host "     VPS dedie => acceptable. Alternative chiffree: Sysinternals Autologon.exe)"

# --- 2. MT5 au demarrage (dossier Startup) ---
if (Test-Path $Mt5Path) {
  $startup = [Environment]::GetFolderPath("Startup")
  $lnk = Join-Path $startup "MetaTrader 5.lnk"
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk)
  $s.TargetPath       = $Mt5Path
  $s.WorkingDirectory = Split-Path $Mt5Path
  $s.Save()
  Write-Host "OK - MT5 ajoute au demarrage ($lnk)"
} else {
  Write-Host "ATTENTION - terminal MT5 introuvable : $Mt5Path"
  Write-Host "    relance avec : .\harden-reboot.ps1 -Mt5Path 'C:\chemin\terminal64.exe'"
}

Write-Host ""
Write-Host "Termine. Chaine au prochain boot :"
Write-Host "  session ouverte auto -> MT5 se lance -> tache CaldraMT5Worker (-AtLogOn)"
Write-Host "  relance le worker -> reconnexion automatique."
Write-Host "Teste en redemarrant le VPS une fois."
