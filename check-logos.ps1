Write-Host "=== LOGO GROESSEN ==="
Write-Host "Downloads/Logo Thermowerk.png: $((Get-Item 'C:\Users\Daniel\Downloads\Logo Thermowerk.png').Length) bytes"
Write-Host "public/img/logo.png:          $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length) bytes"
Write-Host "img/logo.png:                 $((Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\img\logo.png').Length) bytes"
Write-Host ""
$src = (Get-Item 'C:\Users\Daniel\Downloads\Logo Thermowerk.png').Length
$dst = (Get-Item 'C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png').Length
if ($src -eq $dst) { Write-Host "GLEICH - public/img hat das neue Logo" } else { Write-Host "UNTERSCHIEDLICH - public/img hat noch das alte Logo!" }
