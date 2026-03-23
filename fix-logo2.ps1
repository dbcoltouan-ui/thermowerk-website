# Das 106KB logo in img/ ist das NEUE richtige Logo
# Kopiere es nach public/img/
[System.IO.File]::Copy("C:\Users\Daniel\Documents\thermowerk-website\img\logo.png", "C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png", $true)
Write-Host "public/img/logo.png: $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length) bytes"
Write-Host "img/logo.png:        $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\img\logo.png').Length) bytes"
