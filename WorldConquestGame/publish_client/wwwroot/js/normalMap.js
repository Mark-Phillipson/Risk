window.normalMap = (function () {
    function init(elementId, geoJsonPath) {
        try {
            var map = L.map(elementId).setView([20, 0], 2);
            // Use Carto light tiles with labels (we want Leaflet's built-in labels only)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            fetch(geoJsonPath).then(function (r) { return r.json(); }).then(function (data) {
                // add GeoJSON layer and bind simple Leaflet tooltips that show the English name
                // Add GeoJSON but do not render visible country polygons on the Normal Map.
                // We keep the layer interactive so Leaflet tooltips still work, but
                // make stroke and fill fully transparent so the shapes are not shown.
                var layer = L.geoJSON(data, {
                    style: function () { return { color: 'transparent', weight: 0, fillColor: 'transparent', fillOpacity: 0, opacity: 0 }; },
                    onEachFeature: function (feature, layer) {
                        try {
                            // Use only Leaflet tooltips — do NOT add custom DOM labels or persistent markers
                            var name = (feature.properties && (feature.properties.name || feature.properties.NAME || feature.properties.admin || feature.properties.ADMIN)) || '';
                            if (name) {
                                layer.bindTooltip(name, { permanent: false, direction: 'center', className: 'leaflet-country-tooltip' });
                                // show tooltips on hover using openTooltip/closeTooltip
                                layer.on('mouseover', function (e) { layer.openTooltip(); });
                                layer.on('mouseout', function (e) { layer.closeTooltip(); });
                            }
                        } catch (e) { /* ignore */ }
                    }
                }).addTo(map);

                // Fit to bounds for better initial framing — choose the largest zoom
                // that still contains the GeoJSON bounds so countries are shown as large
                // as possible without clipping their extents.
                try {
                    var b = layer.getBounds();
                    if (b && b.isValid()) {
                        try {
                            // getBoundsZoom returns the maximal integer zoom at which the bounds
                            // are still fully visible in the current map size. Use that zoom and
                            // center on the bounds center. This yields the closest zoom-in while
                            // keeping all countries visible.
                            var idealZoom = map.getBoundsZoom(b);
                            var center = b.getCenter();
                            if (typeof idealZoom === 'number' && !isNaN(idealZoom)) {
                                map.setView(center, idealZoom);
                            } else {
                                // fallback
                                map.fitBounds(b, { padding: [20, 20] });
                            }
                        } catch (e) {
                            // fallback to fitBounds if getBoundsZoom isn't supported or fails
                            try { map.fitBounds(b, { padding: [20, 20] }); } catch (ee) { }
                        }
                    }
                } catch (e) { }
            }).catch(function (err) { console.error('normalMap: failed to load geojson', err); });

            // expose map for debugging
            window._normalMapInstance = map;
        } catch (e) { console.error('normalMap.init error', e); }
    }

    return { init: init };
})();
