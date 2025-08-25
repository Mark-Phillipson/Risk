window.mapInterop = {
    // store references to layers by feature id (code or name)
    _layersById: {},

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
                var geoLayer = L.geoJSON(data, {
                    style: { color: "#333", weight: 1, fillOpacity: 0.2 },
                    onEachFeature: function (feature, layer) {
                        // store layer by id for later updates
                        try {
                            // Prefer feature.id (commonly ISO3 code) when available.
                            // Fallback order: feature.id -> properties.iso_a3 -> properties.code -> properties.name
                            var idKey = feature.id || (feature.properties && (feature.properties.iso_a3 || feature.properties.code || feature.properties.name)) || '';
                            if (idKey) {
                                window.mapInterop._layersById[idKey] = layer;
                                // for debugging in-browser
                                // console.log('mapInterop: stored layer for', idKey);
                            }
                        } catch (e) { }

                        layer.on('click', function () {
                            try {
                                var id = feature.id || (feature.properties && (feature.properties.iso_a3 || feature.properties.code || feature.properties.name)) || '';
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

                // keep a reference
                window.mapInterop._geoLayer = geoLayer;
            }).catch(function (err) { console.error('Failed to load geojson', err); });
    }

    , setCountryConquered: function (id, color) {
        try {
            var layer = window.mapInterop._layersById[id];
            if (layer) {
                layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
                if (layer.bindTooltip) {
                    layer.bindTooltip('Conquered').openTooltip();
                }
            } else {
                console.warn('mapInterop: no layer found for', id);
            }
        } catch (e) { console.error('mapInterop.setCountryConquered error', e); }
    }

    , setCountryConqueredAny: function (ids, color) {
        try {
            if (!ids) return null;
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                if (!id) continue;
                var layer = window.mapInterop._layersById[id];
                if (layer) {
                    layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
                    if (layer.bindTooltip) {
                        layer.bindTooltip('Conquered').openTooltip();
                    }
                    console.log('mapInterop: conquered layer for', id);
                    return id; // return the id that matched
                }
            }
            console.warn('mapInterop: no layer found for any of', ids);
            return null;
        } catch (e) { console.error('mapInterop.setCountryConqueredAny error', e); return null; }
    }

    , focusElement: function (id) {
        try {
            if (!id) return;
            var el = document.getElementById(id);
            if (el && el.focus) el.focus();
        } catch (e) { console.error('mapInterop.focusElement error', e); }
    }
};
