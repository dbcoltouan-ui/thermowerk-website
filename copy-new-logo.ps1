$src = "C:\Users\Daniel\Downloads\Logo Thermowerk.png"
$dst1 = "C:\Users\Daniel\Documents\thermowerk-website\public\img\logo.png"
$dst2 = "C:\Users\Daniel\Documents\thermowerk-website\img\logo.png"
Write-Host "Quell-Logo: $((Get-Item $src).Length) bytes"
[System.IO.File]::Copy($src, $dst1, $true)
[System.IO.File]::Copy($src, $dst2, $true)
Write-Host "Neues Logo: $((Get-Item $dst1).Length) bytes"
Write-Host "FERTIG"
