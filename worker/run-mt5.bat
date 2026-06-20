@echo off
REM Caldra - worker MT5 avec redemarrage automatique (anti-crash).
REM Le Planificateur de taches lance CE script a l'ouverture de session (anti-reboot) ;
REM la boucle ci-dessous le relance s'il s'arrete pour une raison quelconque.
cd /d "%~dp0"
title Caldra MT5 Worker

:loop
echo [%date% %time%] demarrage du worker MT5...
python mt5-worker.py >> mt5.log 2>> mt5.err.log
echo [%date% %time%] worker arrete (code %errorlevel%) - redemarrage dans 10s...
timeout /t 10 /nobreak >nul
goto loop
