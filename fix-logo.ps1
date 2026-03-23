[System.IO.File]::Copy("C:\Users\Daniel\Downloads\Logo Thermowerk.png", "C:\Users\Daniel\Documents\thermowerk-website\img\logo.png", $true)
Write-Host "img/logo.png updated: $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\img\logo.png').Length) bytes"
Write-Host "public/img/logo.png: $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length) bytes"
Write-Host "BEIDE GLEICH - FERTIG"
