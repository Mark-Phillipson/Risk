window.mapInterop = {
    // store references to layers by feature id (code or name)
    _layersById: {},
    // store label markers for conquered countries so they persist independent of feature tooltips
    _labelMarkers: {},
    // reference to the Leaflet map instance
    _map: null,

    initMap: function (elementId, geoJsonPath) {
        // elementId: id of the map div
        // geoJsonPath: path to GeoJSON file
        // optional 3rd arg (dotNetRef) is provided by Blazor for callbacks
        var args = Array.prototype.slice.call(arguments);
        var element = args[0];
        var geo = args[1];
        var dotNetRef = args.length > 2 ? args[2] : null;

        var map = L.map(element).setView([20, 0], 2);
        // keep a reference so other functions can add markers/tooltips independent of local scope
        window.mapInterop._map = map;

        // Use a basemap without place labels so only our conquered-country labels are visible.
        // Carto 'light_nolabels' tiles provide a clean unlabeled background.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        fetch(geo)
            .then(response => response.json())
            .then(data => {
                var geoLayer = L.geoJSON(data, {
                    // Start with features visually hidden (still interactive/clickable).
                    // They will be revealed when setCountryConquered / setCountryConqueredAny is called.
                    style: { color: "transparent", weight: 1, fillOpacity: 0, interactive: true },
                    onEachFeature: function (feature, layer) {
                        // store layer by id for later updates
                        try {
                            // Prefer feature.id (commonly ISO3 code) when available.
                            // Fallback order: feature.id -> properties.iso_a3 -> properties.code -> properties.name
                            var idKey = feature.id || (feature.properties && (feature.properties.iso_a3 || feature.properties.code || feature.properties.name)) || '';
                            if (idKey) {
                                try {
                                    // store canonical key plus uppercase/lowercase variants to improve matching tolerance
                                    window.mapInterop._layersById[idKey] = layer;
                                    var up = ('' + idKey).toUpperCase();
                                    var low = ('' + idKey).toLowerCase();
                                    if (!window.mapInterop._layersById[up]) window.mapInterop._layersById[up] = layer;
                                    if (!window.mapInterop._layersById[low]) window.mapInterop._layersById[low] = layer;
                                } catch (e) { /* ignore storage failures */ }
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
                try {
                    // Log summary of known layer keys for debugging
                    var keys = Object.keys(window.mapInterop._layersById || {});
                    console.log('mapInterop: loaded geo layer, known layer keys count=', keys.length, ' sample=', keys.slice(0, 12));
                } catch (e) { }
                // After loading geo layer, check for any pending continent zoom request stored in sessionStorage
                try {
                    var pending = sessionStorage.getItem('zoomToContinent');
                    if (pending) {
                        // remove it and apply
                        sessionStorage.removeItem('zoomToContinent');
                        window.mapInterop.zoomToContinent(pending);
                    }
                } catch (e) { }
            }).catch(function (err) { console.error('Failed to load geojson', err); });
    }

    // Helper: compute centroid of the largest polygon part (works for Polygon and MultiPolygon)
    , _getLargestPolygonCenter: function (layer, map) {
        try {
            if (!layer || !map) return null;
            if (!layer.getLatLngs) return null;
            var latlngs = layer.getLatLngs();
            if (!latlngs || !latlngs.length) return null;

            // Normalize to array of outer rings (arrays of LatLng)
            var polys = [];
            // Detect Polygon (array of rings) vs MultiPolygon (array of polygons)
            // Polygon: latlngs[0] is an array of LatLngs (ring) and latlngs[0][0].lat exists
            if (latlngs[0] && latlngs[0][0] && typeof latlngs[0][0].lat === 'number') {
                // take outer ring only
                polys.push(latlngs[0]);
            } else {
                // MultiPolygon: latlngs is array of polygons, each polygon is array of rings
                for (var i = 0; i < latlngs.length; i++) {
                    if (latlngs[i] && latlngs[i][0] && typeof latlngs[i][0][0] !== 'undefined') {
                        // push outer ring
                        polys.push(latlngs[i][0]);
                    }
                }
            }

            if (!polys.length) return null;

            // Shoelace area & centroid in pixel coordinates (map projection), pick largest
            function toPoints(poly) {
                return poly.map(function (ll) { return map.latLngToLayerPoint(ll); });
            }

            function polygonArea(points) {
                var area = 0;
                for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
                    area += (points[j].x * points[i].y) - (points[i].x * points[j].y);
                }
                return Math.abs(area) / 2;
            }

            function polygonCentroid(points) {
                var cx = 0, cy = 0, a = 0;
                for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
                    var cross = (points[j].x * points[i].y) - (points[i].x * points[j].y);
                    a += cross;
                    cx += (points[j].x + points[i].x) * cross;
                    cy += (points[j].y + points[i].y) * cross;
                }
                a = a / 2;
                if (a === 0) return points[0] || null;
                cx = cx / (6 * a);
                cy = cy / (6 * a);
                return L.point(cx, cy);
            }

            var best = { area: 0, center: null };
            for (var p = 0; p < polys.length; p++) {
                try {
                    var ring = polys[p];
                    if (!ring || ring.length < 3) continue;
                    var pts = toPoints(ring);
                    var area = polygonArea(pts);
                    if (area > best.area) {
                        var centroidPt = polygonCentroid(pts);
                        if (centroidPt) best = { area: area, center: map.layerPointToLatLng(centroidPt) };
                    }
                } catch (e) { /* skip invalid ring */ }
            }

            return best.center || null;
        } catch (e) { return null; }
    }

    , setCountryConquered: function (id, color) {
        try {
            var layer = window.mapInterop._layersById[id];
            if (layer) {
                layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
                try {
                    // Prefer human-readable name from feature properties; fallbacks for common keys
                    var name = (layer.feature && layer.feature.properties && (layer.feature.properties.name || layer.feature.properties.NAME || layer.feature.properties.ADMIN || layer.feature.properties.admin)) || id;
                    // Try to place a persistent label marker at the polygon centroid (or bounds center)
                    var map = window.mapInterop._map;
                    var center = null;
                    try {
                        // Prefer centroid of largest polygon part for multi-polygons (fixes labels like Russia)
                        if (map && layer && layer.getLatLngs) {
                            center = window.mapInterop._getLargestPolygonCenter(layer, map) || null;
                        }
                        if (!center) {
                            if (layer.getBounds) center = layer.getBounds().getCenter();
                            else if (layer.getLatLng) center = layer.getLatLng();
                        }
                    } catch (e) { center = null; }

                    if (map && center) {
                        // remove existing marker if present
                        try { if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); } } catch (e) { }
                        var marker = L.marker(center, {
                            interactive: false,
                            icon: L.divIcon({ className: 'country-label', html: name, iconSize: null })
                        }).addTo(map);
                        window.mapInterop._labelMarkers[id] = marker;
                    } else {
                        // fallback to permanent tooltip centered on the polygon
                        if (layer.bindTooltip) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                    }
                } catch (e) { console.warn('mapInterop: failed to bind name tooltip', e); }
            } else {
                console.warn('mapInterop: no layer found for', id);
            }
        } catch (e) { console.error('mapInterop.setCountryConquered error', e); }
    }

    , setCountryConqueredAny: function (ids, colorOrColors) {
        try {
            if (!ids) return null;
            var matched = [];
            var unmatched = [];
            // Build a color map so retries can re-use the same per-id color when applicable
            var colorMap = {};
            var isArrayColors = Array.isArray(colorOrColors);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                if (!id) continue;
                // assign color for this id (either per-index or the single provided color)
                try { colorMap[id] = (isArrayColors ? colorOrColors[i] : colorOrColors) || '#ffcc00'; } catch (e) { colorMap[id] = '#ffcc00'; }
                console.log('mapInterop: trying to apply style for id', id, ' color=', colorMap[id]);
                var layer = window.mapInterop._layersById[id] || window.mapInterop._layersById[(id || '').toUpperCase()] || window.mapInterop._layersById[(id || '').toLowerCase()];
                if (layer) {
                    layer.setStyle({ color: '#222', weight: 1, fillColor: (colorMap[id] || '#ffcc00'), fillOpacity: 0.6 });
                    try {
                        var name = (layer.feature && layer.feature.properties && (layer.feature.properties.name || layer.feature.properties.NAME || layer.feature.properties.ADMIN || layer.feature.properties.admin)) || id;
                        var map = window.mapInterop._map;
                        var center = null;
                        try {
                            if (map && layer && layer.getLatLngs) {
                                center = window.mapInterop._getLargestPolygonCenter(layer, map) || null;
                            }
                            if (!center) {
                                if (layer.getBounds) center = layer.getBounds().getCenter();
                                else if (layer.getLatLng) center = layer.getLatLng();
                            }
                        } catch (e) { center = null; }
                        if (map && center) {
                            try { if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); } } catch (e) { }
                            var marker = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                            window.mapInterop._labelMarkers[id] = marker;
                        } else {
                            if (layer.bindTooltip) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                        }
                    } catch (e) { console.warn('mapInterop: failed to bind name tooltip', e); }
                    console.log('mapInterop: conquered layer for', id, ' color=', colorMap[id]);
                    matched.push(id);
                } else {
                    unmatched.push(id);
                }
            }
            if (matched.length) {
                console.log('mapInterop: matched ids', matched);
            }
            if (unmatched.length) {
                console.warn('mapInterop: unmatched ids (first pass)', unmatched);
                // try some heuristics immediately: trimmed and replace multiple spaces
                var stillUnmatched = [];
                for (var j = 0; j < unmatched.length; j++) {
                    var orig = unmatched[j];
                    var candidates = [orig, (orig || '').trim(), (orig || '').replace(/\s+/g, ' '), (orig || '').toUpperCase(), (orig || '').toLowerCase()];
                    var found = false;
                    for (var k = 0; k < candidates.length; k++) {
                        var cand = candidates[k];
                        var lay = window.mapInterop._layersById[cand];
                        if (lay) { found = true; break; }
                    }
                    if (!found) stillUnmatched.push(orig);
                }
                if (stillUnmatched.length) {
                    // schedule a retry after a short delay in case layers are registered slightly later
                    setTimeout(function (toTry) {
                        try {
                            for (var ii = 0; ii < toTry.length; ii++) {
                                var id2 = toTry[ii];
                                var layer2 = window.mapInterop._layersById[id2] || window.mapInterop._layersById[(id2 || '').toUpperCase()] || window.mapInterop._layersById[(id2 || '').toLowerCase()];
                                if (layer2) {
                                    // re-apply style (use colorMap if available)
                                    var c = (colorMap && colorMap[id2]) ? colorMap[id2] : (isArrayColors ? '#ffcc00' : colorOrColors || '#ffcc00');
                                    layer2.setStyle({ color: '#222', weight: 1, fillColor: (c || '#ffcc00'), fillOpacity: 0.6 });
                                    try {
                                        var name2 = (layer2.feature && layer2.feature.properties && (layer2.feature.properties.name || layer2.feature.properties.NAME || layer2.feature.properties.ADMIN || layer2.feature.properties.admin)) || id2;
                                        var map2 = window.mapInterop._map;
                                        var center2 = null;
                                        try { if (map2 && layer2 && layer2.getLatLngs) center2 = window.mapInterop._getLargestPolygonCenter(layer2, map2) || null; if (!center2) { if (layer2.getBounds) center2 = layer2.getBounds().getCenter(); else if (layer2.getLatLng) center2 = layer2.getLatLng(); } } catch (e) { center2 = null; }
                                        if (map2 && center2) { try { if (window.mapInterop._labelMarkers[id2]) { map2.removeLayer(window.mapInterop._labelMarkers[id2]); } } catch (e) { } var marker2 = L.marker(center2, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name2, iconSize: null }) }).addTo(map2); window.mapInterop._labelMarkers[id2] = marker2; }
                                        else { if (layer2.bindTooltip) layer2.bindTooltip(name2, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip(); }
                                    } catch (e) { console.warn('mapInterop: retry bind tooltip failed', e); }
                                    console.log('mapInterop: retry applied for', id2, ' color=', (colorMap && colorMap[id2]) ? colorMap[id2] : colorOrColors);
                                }
                            }
                        } catch (e) { console.error('mapInterop.retry error', e); }
                    }, 250, stillUnmatched);
                }
            }
            return { matched: matched, unmatched: unmatched };
        } catch (e) { console.error('mapInterop.setCountryConqueredAny error', e); return null; }
    }

    , focusElement: function (id) {
        try {
            if (!id) return;
            var el = document.getElementById(id);
            if (el && el.focus) el.focus();
        } catch (e) { console.error('mapInterop.focusElement error', e); }
    }

    // Clear all conquered styles and labels from the map
    , clearConquered: function () {
        try {
            // reset style for all known layers
            for (var id in window.mapInterop._layersById) {
                try { var layer = window.mapInterop._layersById[id]; if (layer && layer.setStyle) layer.setStyle({ color: 'transparent', weight: 1, fillOpacity: 0 }); } catch (e) { }
            }
            // remove all label markers
            for (var k in window.mapInterop._labelMarkers) {
                try { var m = window.mapInterop._labelMarkers[k]; if (m) window.mapInterop._map.removeLayer(m); } catch (e) { }
            }
            window.mapInterop._labelMarkers = {};
        } catch (e) { console.error('mapInterop.clearConquered error', e); }
    }

    // Zoom the map to the bounding box of all features matching the provided continent name.
    // Continent name should match a property on the features (we'll check properties.continent or properties.continent_na if present)
    , zoomToContinent: function (continentName) {
        try {
            if (!window.mapInterop._geoLayer || !window.mapInterop._map || !continentName) return;
            var layer = window.mapInterop._geoLayer;
            var bounds = null;
            layer.eachLayer(function (l) {
                try {
                    var props = l.feature && l.feature.properties ? l.feature.properties : {};
                    var c = props.continent || props.CONTINENT || props.continent_na || props.REGION_UN || '';
                    if (c && c.toString().toLowerCase() === continentName.toString().toLowerCase()) {
                        try {
                            var b = l.getBounds ? l.getBounds() : null;
                            if (b) {
                                if (!bounds) bounds = b;
                                else bounds.extend(b);
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            });
            if (bounds) {
                window.mapInterop._map.fitBounds(bounds, { padding: [40, 40] });
                return true;
            } else {
                console.warn('mapInterop.zoomToContinent: no features found for', continentName, ' — falling back to predefined bounds');
                // Fallback: use hardcoded approximate continent bounding boxes (LatLngBounds: [[south, west],[north, east]])
                var lower = continentName.toString().toLowerCase();
                var boxes = {
                    'africa': [[-35.0, -20.0], [38.0, 52.0]],
                    'europe': [[34.0, -25.0], [72.0, 45.0]],
                    'asia': [[-10.0, 26.0], [80.0, 180.0]],
                    'north america': [[5.0, -170.0], [83.0, -30.0]],
                    'south america': [[-56.0, -82.0], [13.0, -34.0]],
                    'oceania': [[-50.0, 110.0], [10.0, 180.0]],
                    'antarctica': [[-90.0, -180.0], [-60.0, 180.0]]
                };
                if (boxes[lower]) {
                    var b = L.latLngBounds(boxes[lower]);
                    window.mapInterop._map.fitBounds(b, { padding: [40, 40] });
                    return true;
                }
                return false;
            }
        } catch (e) { console.error('mapInterop.zoomToContinent error', e); return false; }
    }
};
