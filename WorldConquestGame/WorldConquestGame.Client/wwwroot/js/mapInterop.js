window.mapInterop = {
    // Zoom the map to the bounding box of all features matching the provided Kent region name.
    zoomToKentRegion: function (regionName) {
        try {
            if (!window.mapInterop._geoLayer || !window.mapInterop._map || !regionName) return;
            var layer = window.mapInterop._geoLayer;
            var bounds = null;
            layer.eachLayer(function (l) {
                try {
                    var props = l.feature && l.feature.properties ? l.feature.properties : {};
                    var r = props.region || props.REGION || props.kent_region || props.KentRegion || '';
                    var name = (props.name || props.NAME || '').toString().toLowerCase();
                    var target = regionName.toString().toLowerCase();
                    if (r && r.toLowerCase() === target) {
                        var b = l.getBounds ? l.getBounds() : null;
                        if (b) {
                            if (!bounds) bounds = b;
                            else bounds.extend(b);
                        }
                    } else if (name === target) {
                        var b = l.getBounds ? l.getBounds() : null;
                        if (b) {
                            if (!bounds) bounds = b;
                            else bounds.extend(b);
                        }
                    }
                } catch (e) { }
            });
            if (bounds) {
                window.mapInterop._map.fitBounds(bounds, { padding: [40, 40] });
                return true;
            } else {
                // Fallback: use hardcoded bounding boxes for Kent regions if needed
                var lower = regionName.toString().toLowerCase();
                var boxes = {
                    'south kent': [[51.0, 0.8], [51.2, 1.2]],
                    'north kent': [[51.4, 0.3], [51.5, 0.7]],
                    'east kent': [[51.2, 1.0], [51.4, 1.4]],
                    'west kent': [[51.1, 0.2], [51.3, 0.6]]
                };
                if (boxes[lower]) {
                    var b = L.latLngBounds(boxes[lower]);
                    window.mapInterop._map.fitBounds(b, { padding: [40, 40] });
                    return true;
                }
                return false;
            }
        } catch (e) { console.error('mapInterop.zoomToKentRegion error', e); return false; }
    },
    // Zoom the map to the bounding box of all features matching the provided UK region name.
    // Region name should match a property on the features (we'll check properties.region or properties.REGION or properties.country_region)
    zoomToUkRegion: function (regionName) {
        try {
            if (!window.mapInterop._geoLayer || !window.mapInterop._map || !regionName) return;
            var layer = window.mapInterop._geoLayer;
            var bounds = null;
            layer.eachLayer(function (l) {
                try {
                    var props = l.feature && l.feature.properties ? l.feature.properties : {};
                    // Try to match region by several possible property names
                    var r = props.region || props.REGION || props.country_region || props.CountryRegion || '';
                    // Fallback: try to match by country name for England, Scotland, Wales, Northern Ireland
                    var name = (props.name || props.NAME || '').toString().toLowerCase();
                    var target = regionName.toString().toLowerCase();
                    // Accept match if region or name matches
                    if (r && r.toLowerCase() === target) {
                        var b = l.getBounds ? l.getBounds() : null;
                        if (b) {
                            if (!bounds) bounds = b;
                            else bounds.extend(b);
                        }
                    } else if (name === target) {
                        var b = l.getBounds ? l.getBounds() : null;
                        if (b) {
                            if (!bounds) bounds = b;
                            else bounds.extend(b);
                        }
                    }
                } catch (e) { }
            });
            if (bounds) {
                window.mapInterop._map.fitBounds(bounds, { padding: [40, 40] });
                return true;
            } else {
                // Fallback: use hardcoded approximate bounding boxes for UK regions
                var lower = regionName.toString().toLowerCase();
                var boxes = {
                    'england': [[49.9, -6.5], [55.8, 1.8]],
                    'scotland': [[54.5, -7.5], [60.9, -0.8]],
                    'wales': [[51.3, -5.5], [53.5, -2.8]],
                    'northern ireland': [[54.0, -8.2], [55.5, -5.4]]
                };
                if (boxes[lower]) {
                    var b = L.latLngBounds(boxes[lower]);
                    window.mapInterop._map.fitBounds(b, { padding: [40, 40] });
                    return true;
                }
                return false;
            }
        } catch (e) { console.error('mapInterop.zoomToUkRegion error', e); return false; }
    },
    // Opens a new tab with the Wikipedia page for the given country name
    openWikipediaTab: function (countryName) {
        if (!countryName) return;
        var url = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(countryName);
        window.open(url, '_blank');
    },
    // store references to layers by feature id (code or name)
    _layersById: {},
    // store label markers for conquered countries so they persist independent of feature tooltips
    _labelMarkers: {},
    // store connector polylines/arrow markers for offshore labels
    _labelConnectors: {},
    // reference to the Leaflet map instance
    _map: null,
    // whether to show persistent country labels (can be overridden via sessionStorage 'showCountryLabels')
    _showCountryLabels: true,

    _resolveId: function (feature) {
        if (!feature) return '';
        var props = feature.properties || {};

        function pickFirst(list) {
            if (!list || !list.length) return '';
            for (var i = 0; i < list.length; i++) {
                var val = list[i];
                if (val !== undefined && val !== null) {
                    var str = ('' + val).trim();
                    if (str.length) return str;
                }
            }
            return '';
        }

        // Prefer authoritative administrative codes from properties before falling back to
        // generic identifiers such as feature.id (which is numeric for some GeoJSON sources).
        var propertyCodes = [
            props.ctyua23cd, props.CTYUA23CD,
            props.ctyua22cd, props.CTYUA22CD,
            props.ctyua21cd, props.CTYUA21CD,
            props.lad23cd, props.LAD23CD,
            props.lad22cd, props.LAD22CD,
            props.gss_code, props.GSS_CODE,
            props.gsscode, props.GSSCODE,
            props.iso_a3, props.ISO_A3,
            props.iso_a2, props.ISO_A2,
            props.code, props.Code, props.CODE
        ];
        var selected = pickFirst(propertyCodes);
        if (selected) return selected;

        var altCandidates = [
            props.globalid, props.GLOBALID, props.GlobalID,
            feature.id,
            props.name, props.NAME,
            props.admin, props.ADMIN,
            props.formal_en, props.FORMAL_EN
        ];
        selected = pickFirst(altCandidates);
        if (selected) return selected;

        try {
            for (var key in props) {
                if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
                if (typeof key !== 'string') continue;
                var lower = key.toLowerCase();
                if (lower === 'ctyua22cd' || lower === 'ctyua21cd' || lower === 'ctyua23cd' || lower.endsWith('code')) {
                    var v = props[key];
                    if (v !== undefined && v !== null && ('' + v).trim().length) {
                        return ('' + v).trim();
                    }
                }
            }
        } catch (e) { }
        return '';
    },

    _resolveName: function (feature, fallbackId) {
        if (!feature) return fallbackId || '';
        var props = feature.properties || {};
        var candidates = [
            props.name, props.NAME,
            props.admin, props.ADMIN,
            props.formal_en, props.FORMAL_EN,
            props.ctyua22nm, props.CTYUA22NM,
            props.ctyua21nm, props.CTYUA21NM,
            props.ctyua23nm, props.CTYUA23NM,
            props.lad22nm, props.LAD22NM,
            props.lad23nm, props.LAD23NM
        ];
        for (var i = 0; i < candidates.length; i++) {
            var val = candidates[i];
            if (val !== undefined && val !== null && ('' + val).trim().length) {
                return ('' + val).trim();
            }
        }
        return fallbackId || '';
    },

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
        // remember the initial view so we can reset to it via keyboard (Home / 0)
        window.mapInterop._initialCenter = [20, 0];
        window.mapInterop._initialZoom = 2;

        // Ensure the map container is keyboard-focusable so key events can be captured.
        try {
            var container = map.getContainer();
            if (container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
            // Add a keydown listener to support Home and 0 as "reset view" keys
            container.addEventListener('keydown', function (ev) {
                try {
                    var k = ev.key || ev.code || '';
                    if (k === 'Home' || k === '0' || k === 'Numpad0') {
                        try {
                            if (window.mapInterop._map && window.mapInterop._initialCenter) {
                                window.mapInterop._map.setView(window.mapInterop._initialCenter, window.mapInterop._initialZoom);
                                ev.preventDefault();
                            }
                        } catch (e) { /* ignore errors */ }
                    }
                } catch (e) { }
            });
        } catch (e) { /* ignore focusability/keybinding failures */ }

        // Use a basemap without place labels so only our conquered-country labels are visible.
        // Carto 'light_nolabels' tiles provide a clean unlabeled background.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        // Read showCountryLabels flag from sessionStorage (string 'true'/'false').
        try {
            var s = sessionStorage.getItem('showCountryLabels');
            if (s === 'false') window.mapInterop._showCountryLabels = false;
            else if (s === 'true') window.mapInterop._showCountryLabels = true;
        } catch (e) { }

        // If labels are disabled, inject a stylesheet to forcibly hide any label DOM
        // (covers cases where labels may be created before the flag check completes).
        try {
            if (!window.mapInterop._showCountryLabels) {
                try {
                    var styleId = 'mapinterop-hide-country-labels';
                    if (!document.getElementById(styleId)) {
                        var styleEl = document.createElement('style');
                        styleEl.id = styleId;
                        styleEl.type = 'text/css';
                        styleEl.appendChild(document.createTextNode('.country-label, .country-label.offshore-label, .leaflet-country-tooltip { display: none !important; }'));
                        document.head.appendChild(styleEl);
                    }
                    // also remove any existing label DOM nodes that may have been added earlier
                    try {
                        var nodes = document.querySelectorAll('.country-label, .country-label.offshore-label, .leaflet-country-tooltip');
                        if (nodes && nodes.length) {
                            nodes.forEach(function (n) { try { if (n && n.parentNode) n.parentNode.removeChild(n); } catch (e) { } });
                        }
                    } catch (e) { }
                } catch (e) { }
            } else {
                // If labels are enabled, ensure the stylesheet is removed if present
                try {
                    var sid = document.getElementById('mapinterop-hide-country-labels');
                    if (sid) sid.parentNode.removeChild(sid);
                } catch (e) { }
            }
        } catch (e) { }

        // If labels are disabled, ensure any pre-existing label markers/tooltips are removed
        try {
            if (!window.mapInterop._showCountryLabels) {
                try {
                    var mm = window.mapInterop._map;
                    if (mm && window.mapInterop._labelMarkers) {
                        for (var k in window.mapInterop._labelMarkers) {
                            try { var m = window.mapInterop._labelMarkers[k]; if (m) mm.removeLayer(m); } catch (e) { }
                        }
                    }
                    window.mapInterop._labelMarkers = {};
                    if (window.mapInterop._labelConnectors) {
                        for (var c in window.mapInterop._labelConnectors) {
                            try { var obj = window.mapInterop._labelConnectors[c]; if (obj && obj.line) mm.removeLayer(obj.line); if (obj && obj.arrow) mm.removeLayer(obj.arrow); } catch (e) { }
                        }
                    }
                    window.mapInterop._labelConnectors = {};
                    // Close any permanent tooltips bound to layers
                    if (window.mapInterop._layersById) {
                        for (var id in window.mapInterop._layersById) {
                            try { var lay = window.mapInterop._layersById[id]; if (lay && lay.closeTooltip) lay.closeTooltip(); } catch (e) { }
                        }
                    }
                } catch (e) { }
            }
        } catch (e) { }

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
                            // Fallback order extended to cover administrative boundary datasets.
                            var idKey = window.mapInterop._resolveId(feature);
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
                                var id = window.mapInterop._resolveId(feature);
                                console.log('mapInterop: feature clicked, id=', id);
                                if (dotNetRef && dotNetRef.invokeMethodAsync) {
                                    // invoke .NET callback
                                    dotNetRef.invokeMethodAsync('OnCountryClicked', id).then(function () {
                                        console.log('mapInterop: .NET callback invoked for', id);
                                    }).catch(function (err) {
                                        console.error('mapInterop: .NET callback error', err);
                                    });
                                } else {
                                    alert("Country clicked: " + window.mapInterop._resolveName(feature, id));
                                }
                            } catch (e) {
                                console.error('Error invoking .NET callback', e);
                            }
                        });
                    }
                }).addTo(map);

                // keep a reference
                window.mapInterop._geoLayer = geoLayer;
                // update label visibility initially (labels hidden at default zoom)
                try { if (window.mapInterop._updateLabelVisibility) window.mapInterop._updateLabelVisibility(); } catch (e) { }
                // listen for zoom changes to toggle label visibility
                try { map.on && map.on('zoomend', function () { try { if (window.mapInterop._updateLabelVisibility) window.mapInterop._updateLabelVisibility(); } catch (e) { } }); } catch (e) { }
                try {
                    // Log summary of known layer keys for debugging
                    var keys = Object.keys(window.mapInterop._layersById || {});
                    console.log('mapInterop: loaded geo layer, known layer keys count=', keys.length, ' sample=', keys.slice(0, 12));
                    // Zoom the map to a specific country feature identified by id (code or name).
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

    // Helper: test whether a given LatLng is inside a layer's polygon(s)
    , _pointInLayer: function (layer, latlng) {
        try {
            if (!layer || !latlng) return false;
            var lat = latlng.lat !== undefined ? latlng.lat : (latlng[0] || null);
            var lng = latlng.lng !== undefined ? latlng.lng : (latlng[1] || null);
            if (lat === null || lng === null) return false;

            // Normalize layer latlng arrays to array of rings (each ring is array of points {lat,lng})
            var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
            if (!latlngs) return false;

            var polys = [];
            // Polygon: latlngs[0] is ring of LatLngs
            if (latlngs[0] && latlngs[0][0] && typeof latlngs[0][0].lat === 'number') {
                polys.push(latlngs[0]);
            } else {
                // MultiPolygon
                for (var i = 0; i < latlngs.length; i++) {
                    if (latlngs[i] && latlngs[i][0] && typeof latlngs[i][0][0] !== 'undefined') {
                        polys.push(latlngs[i][0]);
                    }
                }
            }

            function pointInRing(pLat, pLng, ring) {
                var inside = false;
                for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                    var xi = ring[i].lng, yi = ring[i].lat;
                    var xj = ring[j].lng, yj = ring[j].lat;
                    var intersect = ((yi > pLat) != (yj > pLat)) && (pLng < (xj - xi) * (pLat - yi) / (yj - yi + 0.0) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
            }

            for (var p = 0; p < polys.length; p++) {
                try {
                    var ring = polys[p];
                    if (!ring || ring.length < 3) continue;
                    if (pointInRing(lat, lng, ring)) return true;
                } catch (e) { }
            }
            return false;
        } catch (e) { return false; }
    }

    // Helper: when turf is available, compute an interior point on the largest polygon part of a layer's feature
    , _getTurfInteriorPointForLargestPolygon: function (layer) {
        try {
            if (!window.turf || !layer || !layer.feature) return null;
            // extract latlng rings similarly to _getLargestPolygonCenter
            var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
            if (!latlngs || !latlngs.length) return null;

            var polygons = [];
            if (latlngs[0] && latlngs[0][0] && typeof latlngs[0][0].lat === 'number') {
                // single Polygon: outer ring only
                polygons.push(latlngs[0]);
            } else {
                // MultiPolygon: collect outer ring of each polygon
                for (var i = 0; i < latlngs.length; i++) {
                    if (latlngs[i] && latlngs[i][0] && typeof latlngs[i][0][0] !== 'undefined') {
                        polygons.push(latlngs[i][0]);
                    }
                }
            }

            if (!polygons.length) return null;

            // Convert each outer ring to a GeoJSON Polygon feature and compute turf.area to find the largest
            var best = { area: 0, point: null };
            for (var p = 0; p < polygons.length; p++) {
                try {
                    var ring = polygons[p];
                    if (!ring || ring.length < 3) continue;
                    var coords = ring.map(function (ll) { return [ll.lng, ll.lat]; });
                    // Ensure polygon coordinates are closed per GeoJSON (first === last)
                    if (coords.length && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
                        coords = coords.concat([coords[0]]);
                    }
                    var polyFeat = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
                    try {
                        var a = window.turf.area(polyFeat) || 0;
                        if (a > best.area) {
                            // compute interior point on this polygon
                            var interior = null;
                            try { interior = window.turf.pointOnFeature(polyFeat); } catch (ie) { interior = null; }
                            if (interior && interior.geometry && interior.geometry.coordinates) {
                                best = { area: a, point: interior };
                            } else {
                                // as fallback to turf.pointOnFeature fail, compute centroid via layer projection
                                // reuse existing centroid logic by creating a temporary layer-like object is complex, so skip
                            }
                        }
                    } catch (e) { /* ignore area calculation errors */ }
                } catch (e) { }
            }
            if (best.point && best.point.geometry && best.point.geometry.coordinates) {
                var c = best.point.geometry.coordinates;
                return L.latLng(c[1], c[0]);
            }
        } catch (e) { }
        return null;
    }

    // Helper: optionally place the label offshore with a connector if the polygon is narrow/elongated
    , _maybePlaceOffshoreLabel: function (layer, id, name, center) {
        try {
            var map = window.mapInterop._map;
            if (!map || !layer || !center) return null;

            // cleanup any existing marker/connector for this id
            try {
                if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); delete window.mapInterop._labelMarkers[id]; }
            } catch (e) { }
            try {
                if (window.mapInterop._labelConnectors && window.mapInterop._labelConnectors[id]) {
                    var obj = window.mapInterop._labelConnectors[id];
                    if (obj.line) try { map.removeLayer(obj.line); } catch (e) { }
                    if (obj.arrow) try { map.removeLayer(obj.arrow); } catch (e) { }
                    delete window.mapInterop._labelConnectors[id];
                }
            } catch (e) { }

            // get largest polygon pixel bbox to decide narrowness
            var latlngs = layer.getLatLngs ? layer.getLatLngs() : null;
            if (!latlngs) {
                // place normal marker
                var m = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                window.mapInterop._labelMarkers[id] = m;
                return m;
            }

            // collect outer ring points for pixel bbox
            var rings = [];
            if (latlngs[0] && latlngs[0][0] && typeof latlngs[0][0].lat === 'number') {
                rings.push(latlngs[0]);
            } else {
                for (var i = 0; i < latlngs.length; i++) {
                    if (latlngs[i] && latlngs[i][0] && typeof latlngs[i][0][0] !== 'undefined') rings.push(latlngs[i][0]);
                }
            }

            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (var r = 0; r < rings.length; r++) {
                try {
                    var ring = rings[r];
                    for (var j = 0; j < ring.length; j++) {
                        var p = map.latLngToLayerPoint(ring[j]);
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    }
                } catch (e) { }
            }
            if (!isFinite(minX) || !isFinite(minY)) {
                var m2 = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                window.mapInterop._labelMarkers[id] = m2;
                return m2;
            }

            var width = maxX - minX;
            var height = maxY - minY;

            // heuristics: if polygon is narrow and tall (like Norway) or very small, place label offshore to the west
            var shouldOffshore = false;
            try {
                if (width > 0 && height / width > 2.5) shouldOffshore = true; // tall & narrow
                if (width < 120 && height < 120) shouldOffshore = true; // very small
            } catch (e) { }

            if (!shouldOffshore) {
                var m3 = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                window.mapInterop._labelMarkers[id] = m3;
                return m3;
            }

            // compute offshore label position by shifting left (west) in pixel space
            try {
                var centerPt = map.latLngToLayerPoint(center);
                var offset = Math.max(80, width * 1.2);
                var labelPt = L.point(centerPt.x - offset, centerPt.y);
                var labelLatLng = map.layerPointToLatLng(labelPt);

                // create label HTML with inline arrow to the right; rotate arrow toward centroid
                try {
                    var dx = centerPt.x - labelPt.x;
                    var dy = centerPt.y - labelPt.y;
                    var angleRad = Math.atan2(dy, dx);
                    var angleDeg = (angleRad * 180 / Math.PI) + 90; // adjust arrow orientation
                    var arrowSpan = '<span style="display:inline-block; margin-left:8px; transform: rotate(' + angleDeg + 'deg); font-size:14px; color:#111;">&#9650;</span>';
                    var labelHtml = '<span class="label-text">' + (name || '') + '</span>' + arrowSpan;
                    var offshoreMarker = L.marker(labelLatLng, { interactive: false, icon: L.divIcon({ className: 'country-label offshore-label', html: labelHtml, iconSize: null }) }).addTo(map);
                    window.mapInterop._labelMarkers[id] = offshoreMarker;

                    // draw connector line from polygon centroid to offshore label (no separate arrow marker)
                    var line = L.polyline([center, labelLatLng], { color: '#222', weight: 1, opacity: 0.8, dashArray: '3,6' }).addTo(map);
                    window.mapInterop._labelConnectors[id] = { line: line };
                    return offshoreMarker;
                } catch (e) {
                    var fm = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                    window.mapInterop._labelMarkers[id] = fm;
                    return fm;
                }
            } catch (e) {
                // fallback: normal marker
                var fm = L.marker(center, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name, iconSize: null }) }).addTo(map);
                window.mapInterop._labelMarkers[id] = fm;
                return fm;
            }
        } catch (e) { return null; }
    }

    , setCountryConquered: function (id, color) {
        try {
            var layer = window.mapInterop._layersById[id];
            if (layer) {
                layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
                try {
                    // Prefer human-readable name from feature properties; fallbacks for common keys
                    var name = window.mapInterop._resolveName(layer ? layer.feature : null, id);
                    // Try to place a persistent label marker at the polygon centroid (or bounds center)
                    var map = window.mapInterop._map;
                    var center = null;
                    try {
                        // Prefer a true interior point when turf is available (handles complex polygons)
                        if (window.turf && layer && layer.feature) {
                            try {
                                // Prefer interior point on the largest polygon part (helps multi-part countries like Norway)
                                var interior = window.mapInterop._getTurfInteriorPointForLargestPolygon(layer) || null;
                                if (!interior) {
                                    // fallback to pointOnFeature for the whole feature
                                    try {
                                        var whole = window.turf.pointOnFeature(layer.feature);
                                        if (whole && whole.geometry && whole.geometry.coordinates) {
                                            var wc = whole.geometry.coordinates;
                                            interior = L.latLng(wc[1], wc[0]);
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                                if (interior) center = interior;
                            } catch (e) { /* turf failed, fall through */ }
                        }
                        // Fallback: centroid of largest polygon part
                        if (!center && map && layer && layer.getLatLngs) {
                            center = window.mapInterop._getLargestPolygonCenter(layer, map) || null;
                        }
                        // Final fallback: bounds center or single LatLng
                        if (!center) {
                            if (layer.getBounds) center = layer.getBounds().getCenter();
                            else if (layer.getLatLng) center = layer.getLatLng();
                        }
                    } catch (e) { center = null; }

                    if (map && center) {
                        // Only place persistent labels if allowed
                        try {
                            if (window.mapInterop._showCountryLabels) {
                                // use offshore-aware placement helper which will remove any existing marker/connector
                                window.mapInterop._maybePlaceOffshoreLabel(layer, id, name, center);
                            } else {
                                // ensure any existing labels/connectors for this id are removed
                                try { if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); delete window.mapInterop._labelMarkers[id]; } } catch (e) { }
                                try { if (window.mapInterop._labelConnectors && window.mapInterop._labelConnectors[id]) { var obj = window.mapInterop._labelConnectors[id]; if (obj.line) try { map.removeLayer(obj.line); } catch (e) { } if (obj.arrow) try { map.removeLayer(obj.arrow); } catch (e) { } delete window.mapInterop._labelConnectors[id]; } } catch (e) { }
                            }
                        } catch (e) { /* fallback below */ }
                    } else {
                        // fallback to permanent tooltip centered on the polygon (only if labels enabled)
                        if (window.mapInterop._showCountryLabels) {
                            if (layer.bindTooltip) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                        } else {
                            // ensure any existing permanent tooltip is closed/removed
                            try { if (layer.closeTooltip) layer.closeTooltip(); } catch (e) { }
                        }
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
                        var name = window.mapInterop._resolveName(layer ? layer.feature : null, id);
                        var map = window.mapInterop._map;
                        var center = null;
                        try {
                            // Prefer interior point on the largest polygon part when possible
                            if (window.turf && layer && layer.feature) {
                                try {
                                    var interior2 = window.mapInterop._getTurfInteriorPointForLargestPolygon(layer) || null;
                                    if (!interior2) {
                                        try {
                                            var whole2 = window.turf.pointOnFeature(layer.feature);
                                            if (whole2 && whole2.geometry && whole2.geometry.coordinates) {
                                                var wc2 = whole2.geometry.coordinates;
                                                interior2 = L.latLng(wc2[1], wc2[0]);
                                            }
                                        } catch (e) { }
                                    }
                                    if (interior2) center = interior2;
                                } catch (e) { }
                            }
                            if (!center && map && layer && layer.getLatLngs) {
                                center = window.mapInterop._getLargestPolygonCenter(layer, map) || null;
                            }
                            if (!center) {
                                if (layer.getBounds) center = layer.getBounds().getCenter();
                                else if (layer.getLatLng) center = layer.getLatLng();
                            }
                        } catch (e) { center = null; }
                        // ensure the chosen center actually lies inside the polygon; if not, fallback to bounds center
                        try {
                            if (map && center && layer && !window.mapInterop._pointInLayer(layer, center)) {
                                // centroid landed outside (common for complex polygons); use bounds center if available
                                if (layer.getBounds) center = layer.getBounds().getCenter();
                                else if (layer.getLatLng) center = layer.getLatLng();
                            }
                        } catch (e) { }

                        if (map && center) {
                            try {
                                if (window.mapInterop._showCountryLabels) window.mapInterop._maybePlaceOffshoreLabel(layer, id, name, center);
                                else {
                                    try { if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); delete window.mapInterop._labelMarkers[id]; } } catch (e) { }
                                    try { if (window.mapInterop._labelConnectors && window.mapInterop._labelConnectors[id]) { var obj2 = window.mapInterop._labelConnectors[id]; if (obj2.line) try { map.removeLayer(obj2.line); } catch (e) { } if (obj2.arrow) try { map.removeLayer(obj2.arrow); } catch (e) { } delete window.mapInterop._labelConnectors[id]; } } catch (e) { }
                                }
                            } catch (e) { }
                        } else {
                            if (window.mapInterop._showCountryLabels) {
                                if (layer.bindTooltip) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                            } else {
                                try { if (layer.closeTooltip) layer.closeTooltip(); } catch (e) { }
                            }
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
                                        var name2 = window.mapInterop._resolveName(layer2 ? layer2.feature : null, id2);
                                        var map2 = window.mapInterop._map;
                                        var center2 = null;
                                        try { if (map2 && layer2 && layer2.getLatLngs) center2 = window.mapInterop._getLargestPolygonCenter(layer2, map2) || null; if (!center2) { if (layer2.getBounds) center2 = layer2.getBounds().getCenter(); else if (layer2.getLatLng) center2 = layer2.getLatLng(); } } catch (e) { center2 = null; }
                                        if (map2 && center2) {
                                            try { if (window.mapInterop._labelMarkers[id2]) { map2.removeLayer(window.mapInterop._labelMarkers[id2]); } } catch (e) { }
                                            if (window.mapInterop._showCountryLabels) {
                                                var marker2 = L.marker(center2, { interactive: false, icon: L.divIcon({ className: 'country-label', html: name2, iconSize: null }) }).addTo(map2);
                                                window.mapInterop._labelMarkers[id2] = marker2;
                                            } else {
                                                // ensure any existing label marker is removed
                                                try { if (window.mapInterop._labelMarkers[id2]) { map2.removeLayer(window.mapInterop._labelMarkers[id2]); delete window.mapInterop._labelMarkers[id2]; } } catch (e) { }
                                            }
                                        } else {
                                            if (window.mapInterop._showCountryLabels) {
                                                if (layer2.bindTooltip) layer2.bindTooltip(name2, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                                            } else {
                                                try { if (layer2.closeTooltip) layer2.closeTooltip(); } catch (e) { }
                                            }
                                        }
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

    , setView: function (lat, lng, zoom, options) {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.warn('mapInterop.setView: map not initialized yet');
                return false;
            }
            if (typeof lat !== 'number' || typeof lng !== 'number') {
                console.error('mapInterop.setView: latitude and longitude must be numbers');
                return false;
            }
            if (zoom === undefined || zoom === null) {
                zoom = map.getZoom();
            }
            var opts = options || { animate: false };
            map.setView([lat, lng], zoom, opts);
            return true;
        } catch (e) {
            console.error('mapInterop.setView error', e);
            return false;
        }
    }

    // Update label visibility depending on current zoom level
    , _updateLabelVisibility: function () {
        try {
            // if labels are globally disabled, ensure none are visible and return
            if (!window.mapInterop._showCountryLabels) {
                try { var mm = window.mapInterop._map; if (mm) { for (var id in window.mapInterop._labelMarkers) { try { var m = window.mapInterop._labelMarkers[id]; if (m) mm.removeLayer(m); } catch (e) { } } } } catch (e) { }
                return;
            }
            var map = window.mapInterop._map;
            if (!map) return;
            var z = map.getZoom ? map.getZoom() : 0;
            // threshold: hide labels below zoom 4 (you can tweak this)
            var visible = (z >= 4);
            // toggle markers and connectors
            try {
                for (var id in window.mapInterop._labelMarkers) {
                    try { var m = window.mapInterop._labelMarkers[id]; if (m) { if (visible) map.addLayer(m); else map.removeLayer(m); } } catch (e) { }
                }
            } catch (e) { }
            try {
                for (var cid in window.mapInterop._labelConnectors) {
                    try { var obj = window.mapInterop._labelConnectors[cid]; if (obj && obj.line) { if (visible) map.addLayer(obj.line); else map.removeLayer(obj.line); } } catch (e) { }
                }
            } catch (e) { }
            // when becoming visible, recompute positions to ensure offshore labels are placed correctly at the current zoom
            if (visible) {
                try { window.mapInterop.recomputeLabels(); } catch (e) { }
            }
        } catch (e) { }
    }

    , focusElement: function (id, select) {
        try {
            if (!id) return false;

            function isVisible(el) {
                try {
                    if (!el) return false;
                    if (el.offsetParent === null) return false;
                    var cs = window.getComputedStyle(el);
                    if (!cs) return true;
                    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
                    return true;
                } catch (e) { return false; }
            }

            function doFocus(el) {
                try {
                    if (!el) return false;
                    // ensure the element is visible and focusable
                    if (!isVisible(el)) return false;
                    // use requestAnimationFrame to avoid timing races
                    window.requestAnimationFrame(function () {
                        try {
                            if (typeof el.focus === 'function') {
                                el.focus({ preventScroll: false });
                            } else if (el.focus) {
                                el.focus();
                            }
                            if (select) {
                                try {
                                    if (typeof el.select === 'function') el.select();
                                    else if (el.setSelectionRange && typeof el.value === 'string') el.setSelectionRange(0, el.value.length);
                                } catch (e) { }
                            }
                        } catch (e) { }
                    });
                    return true;
                } catch (e) { return false; }
            }

            var el = document.getElementById(id);
            if (el && doFocus(el)) return true;

            // If element not present or not visible yet, observe the DOM for changes and focus when ready
            var observer = null;
            var timedOut = false;
            var timeout = setTimeout(function () { timedOut = true; if (observer) observer.disconnect(); }, 2000);

            observer = new MutationObserver(function (mutations) {
                try {
                    if (timedOut) return;
                    var e = document.getElementById(id);
                    if (e && isVisible(e)) {
                        try { doFocus(e); } catch (ex) { }
                        if (observer) observer.disconnect();
                        clearTimeout(timeout);
                    }
                } catch (e) { }
            });

            try {
                observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
            } catch (e) {
                // If MutationObserver isn't supported or observation fails, fall back to polling
                var attempts = 0;
                var maxAttempts = 40; // ~2s
                var tid = setInterval(function () {
                    attempts++;
                    try {
                        var el2 = document.getElementById(id);
                        if (el2 && doFocus(el2)) {
                            clearInterval(tid);
                            clearTimeout(timeout);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(tid);
                        }
                    } catch (e) { clearInterval(tid); }
                }, 50);
            }

            return true;
        } catch (e) { console.error('mapInterop.focusElement error', e); return false; }
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
            // remove any connector lines/arrows
            for (var c in window.mapInterop._labelConnectors) {
                try {
                    var obj = window.mapInterop._labelConnectors[c];
                    if (obj) {
                        try { if (obj.line) window.mapInterop._map.removeLayer(obj.line); } catch (e) { }
                        try { if (obj.arrow) window.mapInterop._map.removeLayer(obj.arrow); } catch (e) { }
                    }
                } catch (e) { }
            }
            window.mapInterop._labelConnectors = {};
        } catch (e) { console.error('mapInterop.clearConquered error', e); }
    }

    // Show a Bootstrap modal by id (safe helper to avoid eval)
    , showBootstrapModal: function (id) {
        try {
            if (!id) return false;
            var el = document.getElementById(id);
            if (!el) return false;
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                try {
                    var modal = new bootstrap.Modal(el);
                    modal.show();
                    return true;
                } catch (e) { console.error('mapInterop.showBootstrapModal error', e); return false; }
            }
            return false;
        } catch (e) { console.error('mapInterop.showBootstrapModal error', e); return false; }
    }

    // Recompute all label positions based on current geometry and prefer turf interior points for multi-part features
    , recomputeLabels: function () {
        try {
            // if labels disabled, nothing to recompute
            if (!window.mapInterop._showCountryLabels) return false;
            var map = window.mapInterop._map;
            if (!map || !window.mapInterop._geoLayer) return false;

            // iterate all known layers and update existing markers/tooltips
            var keys = Object.keys(window.mapInterop._layersById || {});
            for (var i = 0; i < keys.length; i++) {
                try {
                    var id = keys[i];
                    var layer = window.mapInterop._layersById[id];
                    if (!layer) continue;

                    // only reposition labels for layers that are currently styled (conquered)
                    // We check for fillOpacity > 0 as a heuristic
                    var styled = false;
                    try { var s = layer.options && layer.options.fillOpacity; styled = (typeof s === 'number' && s > 0); } catch (e) { }
                    if (!styled) continue;

                    var name = window.mapInterop._resolveName(layer ? layer.feature : null, id);
                    var newCenter = null;
                    try {
                        if (window.turf) {
                            var interior = window.mapInterop._getTurfInteriorPointForLargestPolygon(layer) || null;
                            if (!interior) {
                                try {
                                    var whole = window.turf.pointOnFeature(layer.feature);
                                    if (whole && whole.geometry && whole.geometry.coordinates) {
                                        var wc = whole.geometry.coordinates;
                                        interior = L.latLng(wc[1], wc[0]);
                                    }
                                } catch (e) { }
                            }
                            if (interior) newCenter = interior;
                        }
                    } catch (e) { }
                    if (!newCenter) {
                        try { newCenter = window.mapInterop._getLargestPolygonCenter(layer, map) || null; } catch (e) { newCenter = null; }
                    }
                    if (!newCenter) {
                        try { if (layer.getBounds) newCenter = layer.getBounds().getCenter(); else if (layer.getLatLng) newCenter = layer.getLatLng(); } catch (e) { newCenter = null; }
                    }

                    if (newCenter) {
                        try {
                            // delegate placement (offshore-aware) which will remove/move existing markers/connectors
                            window.mapInterop._maybePlaceOffshoreLabel(layer, id, name, newCenter);
                            continue;
                        } catch (e) {
                            try { if (window.mapInterop._labelMarkers[id]) { var m = window.mapInterop._labelMarkers[id]; if (m && m.setLatLng) m.setLatLng(newCenter); continue; } } catch (ee) { }
                        }
                    }
                } catch (e) { }
            }
            return true;
        } catch (e) { console.error('mapInterop.recomputeLabels error', e); return false; }
    }

    // Zoom the map to a specific country feature identified by id (code or name).
    , zoomToCountry: function (id) {
        try {
            if (!id || !window.mapInterop._map || !window.mapInterop._geoLayer) return false;
            // try direct lookup using stored keys
            var layer = window.mapInterop._layersById[id] || window.mapInterop._layersById[(id || '').toUpperCase()] || window.mapInterop._layersById[(id || '').toLowerCase()];

            // fallback: try to match by feature property name if direct lookup fails
            if (!layer) {
                try {
                    var keys = Object.keys(window.mapInterop._layersById || {});
                    for (var i = 0; i < keys.length; i++) {
                        var cand = keys[i];
                        var lay = window.mapInterop._layersById[cand];
                        if (!lay || !lay.feature || !lay.feature.properties) continue;
                        var name = window.mapInterop._resolveName(lay ? lay.feature : null, id);
                        if (name && name.toString().toLowerCase() === id.toString().toLowerCase()) { layer = lay; break; }
                    }
                } catch (e) { /* ignore */ }
            }

            if (!layer) {
                console.warn('mapInterop.zoomToCountry: no layer found for', id);
                return false;
            }

            var map = window.mapInterop._map;

            // Prefer fitting to actual feature bounds when available
            try {
                if (layer.getBounds) {
                    var bounds = layer.getBounds();
                    if (bounds && bounds.isValid && bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [40, 40] });
                        return true;
                    }
                }
            } catch (e) { /* ignore fitBounds failures */ }

            // Fallback: compute interior/centroid and set view
            var center = null;
            try {
                if (window.turf) {
                    var interior = window.mapInterop._getTurfInteriorPointForLargestPolygon(layer) || null;
                    if (interior) center = interior;
                }
            } catch (e) { }
            try { if (!center && map && layer && layer.getLatLngs) center = window.mapInterop._getLargestPolygonCenter(layer, map); } catch (e) { }
            if (!center) {
                try { if (layer.getBounds) center = layer.getBounds().getCenter(); else if (layer.getLatLng) center = layer.getLatLng(); } catch (e) { }
            }

            if (center && map) {
                try {
                    // Choose an appropriate zoom level — prefer a closer zoom for small features
                    var targetZoom = 6;
                    try {
                        var cur = map.getZoom ? map.getZoom() : targetZoom;
                        targetZoom = Math.max(4, Math.min(10, cur + 2));
                    } catch (e) { }
                    map.setView(center, targetZoom);
                    return true;
                } catch (e) {
                    try { map.setView(center, 6); return true; } catch (ee) { }
                }
            }
            return false;
        } catch (e) { console.error('mapInterop.zoomToCountry error', e); return false; }
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

// Expose a small helper to reset view programmatically
window.mapInterop.resetView = function () {
    try {
        if (window.mapInterop._map && window.mapInterop._initialCenter) {
            window.mapInterop._map.setView(window.mapInterop._initialCenter, window.mapInterop._initialZoom);
            return true;
        }
    } catch (e) { }
    return false;
};
