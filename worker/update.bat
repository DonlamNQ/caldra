@echo off
REM Mise a jour du worker MT5 sur le VPS — double-clic, aucune commande a taper.
REM Telecharge la derniere version de mt5-worker.py puis relance la tache planifiee.

cd /d "%~dp0"

echo Telechargement de la derniere version du worker...
curl -L -o mt5-worker.py "https://raw.githubusercontent.com/DonlamNQ/caldra/main/worker/mt5-worker.py"
if errorlevel 1 (
  echo ECHEC du telechargement. Verifie la connexion internet du VPS.
  pause
  exit /b 1
)

echo Redemarrage de la tache CaldraMT5Worker...
schtasks /End /TN "CaldraMT5Worker"
schtasks /Run /TN "CaldraMT5Worker"

echo.
echo OK. Worker mis a jour et relance.
echo Verifie mt5.log (les dernieres lignes doivent etre recentes).
echo.
pause
