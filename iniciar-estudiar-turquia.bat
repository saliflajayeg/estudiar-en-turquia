@echo off
cd /d "%~dp0"
start "" http://localhost:3060
python -m http.server 3060
