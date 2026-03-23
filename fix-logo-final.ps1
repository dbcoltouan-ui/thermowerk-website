Write-Host "img/logo.png (QUELLE):        $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\img\logo.png').Length) bytes"
Write-Host "public/img/logo.png (ZIEL):    $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length) bytes"
[System.IO.File]::Copy("C:\Users\Daniel\Documents\thermowerk-website\img\logo.png", "C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png", $true)
Write-Host "---NACH KOPIE---"
Write-Host "public/img/logo.png (ZIEL):    $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length) bytes"
