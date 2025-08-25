window.mapInterop = {
    initMap: function (elementId, geoJsonPath) {
        // elementId: id of the map div
        // geoJsonPath: path to GeoJSON file
        // optional 3rd arg (dotNetRef) is provided by Blazor for callbacks
        var args = Array.prototype.slice.call(arguments);
        var element = args[0];
        var geo = args[1];
        var dotNetRef = args.length > 2 ? args[2] : null;

        var map = L.map(element).setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        fetch(geo)
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: { color: "#333", weight: 1, fillOpacity: 0.2 },
                    onEachFeature: function (feature, layer) {
                        layer.on('click', function () {
                            try {
                                var id = (feature.properties && (feature.properties.code || feature.properties.name)) || '';
                                console.log('mapInterop: feature clicked, id=', id);
                                if (dotNetRef && dotNetRef.invokeMethodAsync) {
                                    // invoke .NET callback
                                    dotNetRef.invokeMethodAsync('OnCountryClicked', id).then(function () {
                                        console.log('mapInterop: .NET callback invoked for', id);
                                    }).catch(function (err) {
                                        console.error('mapInterop: .NET callback error', err);
                                    });
                                } else {
                                    alert("Country clicked: " + (feature.properties && feature.properties.name));
                                }
                            } catch (e) {
                                console.error('Error invoking .NET callback', e);
                            }
                        });
                    }
                }).addTo(map);
            }).catch(function (err) { console.error('Failed to load geojson', err); });
    }
};
