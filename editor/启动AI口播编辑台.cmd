@echo off
echo 正在启动 AI 口播编辑台……
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-edit-desk.ps1"
if errorlevel 1 pause
