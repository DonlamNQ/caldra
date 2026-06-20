# Caldra - installe le worker MT5 en demarrage automatique sur le VPS Windows.
#
# A lancer UNE FOIS sur le VPS, dans PowerShell ADMIN, depuis le dossier worker :
#   powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
#
# Resultat :
#   - tache planifiee "Caldra MT5 Worker" qui demarre run-mt5.bat A CHAQUE OUVERTURE
#     DE SESSION (= survit aux reboots, a condition que l'auto-logon soit active, cf. fin).
#   - le .bat boucle => le worker se relance tout seul s'il crashe (anti-crash).
#   - la tache se relance aussi si le .bat lui-meme s'arrete (RestartCount).

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$bat  = Join-Path $here "run-mt5.bat"
$taskName = "Caldra MT5 Worker"

if (-not (Test-Path $bat)) { throw "run-mt5.bat introuvable dans $here" }

$me = "$env:USERDOMAIN\$env:USERNAME"

# Action : lancer le .bat (qui boucle et relance le worker).
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$bat`"" -WorkingDirectory $here

# Declencheur : a l'ouverture de session de cet utilisateur (terminal MT5 = appli GUI,
# il lui faut un vrai bureau => on NE tourne PAS sous SYSTEM/session 0).
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $me

# Tourne sous le compte courant, avec elevation, sans limite de duree, relance si arret.
$principal = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "OK - tache '$taskName' enregistree (demarrage a chaque ouverture de session)."
Write-Host "Lancer maintenant : Start-ScheduledTask -TaskName '$taskName'"
Write-Host ""
Write-Host "IMPORTANT pour survivre a un REBOOT sans intervention :"
Write-Host "  active l'auto-logon Windows (sinon le VPS reste sur l'ecran de login et la"
Write-Host "  session ne s'ouvre jamais => le worker ne demarre pas)."
Write-Host "  -> lance : netplwiz  => decoche 'Les utilisateurs doivent entrer un mot de"
Write-Host "     passe' => saisis le mot de passe du compte."
