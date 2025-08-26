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

    , setCountryConqueredAny: function (ids, color) {
        try {
            if (!ids) return null;
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                if (!id) continue;
                var layer = window.mapInterop._layersById[id];
                if (layer) {
                    layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
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
