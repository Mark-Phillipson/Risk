
$apiUrl = "http://api.geonames.org/searchJSON?country=GB&adminName1=England&adminName2=Kent&featureClass=P&maxRows=500&username=MPhillipson"

try {
    $response = Invoke-WebRequest -Uri $apiUrl -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json

    if ($null -eq $data.geonames -or $data.geonames.Count -eq 0) {
        if ($null -ne $data.status) {
            Write-Host "GeoNames API error: $($data.status.message) (Code: $($data.status.value))" -ForegroundColor Red
        } else {
            Write-Host "No data returned. Check your API query and account status." -ForegroundColor Yellow
        }
        return
    }

    $features = @()
    foreach ($place in $data.geonames) {
        $features += @{
            type = "Feature"
            geometry = @{
                type = "Point"
                coordinates = @($place.lng, $place.lat)
            }
            properties = @{
                name = $place.name
            }
        }
    }

    $geojson = @{
        type = "FeatureCollection"
        features = $features
    } | ConvertTo-Json -Depth 5

    Set-Content -Path "kent-towns-villages.geojson" -Value $geojson
    Write-Host "GeoJSON file created successfully with $($features.Count) features." -ForegroundColor Green
} catch {
    Write-Host "Error fetching data from GeoNames: $($_.Exception.Message)" -ForegroundColor Red
}