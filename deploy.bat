@echo off
:: 1. Capturamos fecha y hora actual (Formato: AAAAMMDD_HHMMSS)
set "FECHA_HORA=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
:: Limpiar espacios por si la hora es menor a 10 (ej. " 9:00")
set "FECHA_HORA=%FECHA_HORA: =0%"

:: 2. Evaluamos el primer parámetro (%1)
set "PARAMETRO=%~1"

if "%PARAMETRO%"=="" (
    set "RESULTADO=%FECHA_HORA%"
) else (
    set "RESULTADO=%PARAMETRO%"
)


git add .
git commit -m "%RESULTADO%"
git push origin main