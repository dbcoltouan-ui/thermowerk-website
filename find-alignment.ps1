$content = Get-Content "C:\Users\Daniel\Documents\thermowerk-website\src\layouts\Layout.astro" -Raw
$lines = $content -split "`n"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "header-inner|container|hero-left|section|max-width|padding.*clamp|\.hero |\.section") {
        Write-Host "$($i+1): $($lines[$i].Trim())"
    }
}
