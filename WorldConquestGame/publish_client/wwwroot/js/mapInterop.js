// Use a custom red marker icon for pins
var redIcon = L.icon({
    iconUrl: '/img/marker-icon-red.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
var greenIcon = L.icon({
    iconUrl: '/img/marker-icon-green.png',
    shadowUrl: '/img/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
window.mapInterop = {
        // Show a temporary tooltip near the clicked element
        showCopiedTooltip: function (element) {
            console.log('[showCopiedTooltip] called with:', element);
            if (!element) {
                console.warn('[showCopiedTooltip] No element passed');
                return;
            }
            // Remove any existing tooltip
            var oldTip = element.querySelector('.copied-tooltip');
            if (oldTip) oldTip.remove();
            var tooltip = document.createElement('span');
            tooltip.className = 'copied-tooltip';
            tooltip.textContent = 'Copied!';
            tooltip.style.position = 'absolute';
            tooltip.style.background = '#222';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '2px 8px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.fontSize = '13px';
            tooltip.style.zIndex = '9999';
            tooltip.style.top = '0';
            tooltip.style.right = '0';
            tooltip.style.transform = 'translateY(-100%)';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.transition = 'opacity 0.3s';
            tooltip.style.opacity = '1';
            element.style.position = 'relative';
            element.appendChild(tooltip);
            console.log('[showCopiedTooltip] tooltip appended:', tooltip);
            setTimeout(function () {
                tooltip.style.opacity = '0';
                setTimeout(function () { if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip); }, 400);
            }, 900);
        },
        // Show a temporary tooltip by querying for an element by CSS selector
        showCopiedTooltipBySelector: function (selector) {
            console.log('[showCopiedTooltipBySelector] called with selector:', selector);
            if (!selector) {
                console.warn('[showCopiedTooltipBySelector] No selector passed');
                return;
            }
            var element = document.querySelector(selector);
            if (!element) {
                console.warn('[showCopiedTooltipBySelector] Element not found for selector:', selector);
                return;
            }
            // Call the original showCopiedTooltip with the found element
            window.mapInterop.showCopiedTooltip(element);
        },
    // Map UI region names to arrays of feature names in the data
    _kentRegionMap: {
        'south kent': ['maidstone', 'dover'],
        'north kent': ['gillingham', 'chatham', 'canterbury'],
        'central kent': ['maidstone', 'canterbury'],
        'east kent': ['canterbury', 'dover'],
        'west kent': ['maidstone', 'gillingham', 'chatham'],
    },
    // Zoom the map to the bounding box of all features matching the provided Kent region name.
    zoomToKentRegion: function (regionName) {
        try {
            if (!window.mapInterop._geoLayer || !window.mapInterop._map || !regionName) return;
            var layer = window.mapInterop._geoLayer;
            var bounds = null;
            var found = false;
            var matchedLatLngs = [];
            var target = regionName.toString().toLowerCase();
            // Check if regionName is a mapped region
            var mappedNames = window.mapInterop._kentRegionMap[target] || [target];
            var availableRegions = [];
            var matchedFeatures = [];
            layer.eachLayer(function (l) {
                try {
                    var props = l.feature && l.feature.properties ? l.feature.properties : {};
                    var r = props.region || props.REGION || props.kent_region || props.KentRegion || '';
                    var name = (props.name || props.NAME || '').toString().toLowerCase();
                    var match = false;
                    // Match if feature name or region matches any mapped name
                    for (var i = 0; i < mappedNames.length; i++) {
                        var mapped = mappedNames[i];
                        if (r && r.toLowerCase() === mapped) match = true;
                        else if (name === mapped) match = true;
                    }
                    availableRegions.push(r || name);
                    if (match) {
                        // For point features, use getLatLng
                        if (l.getLatLng) {
                            matchedLatLngs.push(l.getLatLng());
                            found = true;
                            matchedFeatures.push(r || name);
                        } else if (l.getBounds) {
                            var b = l.getBounds();
                            if (b) {
                                if (!bounds) bounds = b;
                                else bounds = bounds.extend(b);
                                found = true;
                                matchedFeatures.push(r || name);
                            }
                        }
                    }
                } catch (e) { }
            });
            // If we matched point features, create bounds from all points
            if (matchedLatLngs.length > 0) {
                bounds = L.latLngBounds(matchedLatLngs);
            }
            console.log('zoomToKentRegion: availableRegions=', availableRegions);
            console.log('zoomToKentRegion: matchedFeatures=', matchedFeatures);
            if (found && bounds && bounds.isValid && bounds.isValid()) {
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
        } catch (e) { console.error('mapInterop.zoomToKentRegion error', e); return false; }
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

    initMap: function (elementId, geoJsonPath, dotNetRef, initialColor) {
        // elementId: id of the map div
        // geoJsonPath: path to GeoJSON file
        // dotNetRef: Blazor callback
        // initialColor: color for initial pins
        var element = elementId;
        var geo = geoJsonPath;
        // dotNetRef and initialColor are optional
        // If only 3 args, treat 3rd as dotNetRef, color as default
        if (typeof dotNetRef === "string" && !initialColor) {
            initialColor = dotNetRef;
            dotNetRef = null;
        }
        if (!initialColor) initialColor = "#dc3545";

        var map = L.map(element).setView([20, 0], 2);
        window.mapInterop._map = map;
        window.mapInterop._initialCenter = [20, 0];
        window.mapInterop._initialZoom = 2;

        try {
            var container = map.getContainer();
            if (container && !container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
            container.addEventListener('keydown', function (ev) {
                try {
                    var k = ev.key || ev.code || '';
                    if (k === 'Home' || k === '0' || k === 'Numpad0') {
                        try {
                            if (window.mapInterop._map && window.mapInterop._initialCenter) {
                                window.mapInterop._map.setView(window.mapInterop._initialCenter, window.mapInterop._initialZoom);
                                ev.preventDefault();
                            }
                        } catch (e) { }
                    }
                } catch (e) { }
            });
        } catch (e) { }

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(map);

        try {
            var s = sessionStorage.getItem('showCountryLabels');
            if (s === 'false') window.mapInterop._showCountryLabels = false;
            else if (s === 'true') window.mapInterop._showCountryLabels = true;
        } catch (e) { }

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
                    try {
                        var nodes = document.querySelectorAll('.country-label, .country-label.offshore-label, .leaflet-country-tooltip');
                        if (nodes && nodes.length) {
                            nodes.forEach(function (n) { try { if (n && n.parentNode) n.parentNode.removeChild(n); } catch (e) { } });
                        }
                    } catch (e) { }
                } catch (e) { }
            } else {
                try {
                    var sid = document.getElementById('mapinterop-hide-country-labels');
                    if (sid) sid.parentNode.removeChild(sid);
                } catch (e) { }
            }
        } catch (e) { }

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
                    style: function() {
                        console.log('mapInterop: setting initial style to', initialColor);
                        setTimeout(function() {
                            document.querySelectorAll('.leaflet-interactive').forEach(function(el) {
                                el.setAttribute('fill', '#dc3545');
                                el.setAttribute('stroke', '#dc3545');
                                console.log('mapInterop: forced SVG fill/stroke to #dc3545', el);
                            });
                        }, 1000);
                        return { color: '#dc3545', weight: 1, fillColor: '#dc3545', fillOpacity: 0.6, interactive: true };
                    },
                    pointToLayer: function(feature, latlng) {
                        return L.marker(latlng, { icon: redIcon });
                    },
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
    },

    // Helper: compute centroid of the largest polygon part (works for Polygon and MultiPolygon)
    _getLargestPolygonCenter: function (layer, map) {
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
    },

    // Helper: test whether a given LatLng is inside a layer's polygon(s)
    _pointInLayer: function (layer, latlng) {
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
    },

    // Helper: when turf is available, compute an interior point on the largest polygon part of a layer's feature
    _getTurfInteriorPointForLargestPolygon: function (layer) {
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
    },

    // Helper: optionally place the label offshore with a connector if the polygon is narrow/elongated
    _maybePlaceOffshoreLabel: function (layer, id, name, center, conquered) {
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
                var m = L.marker(center, { icon: conquered ? greenIcon : redIcon }).addTo(map);
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
                var m2 = L.marker(center, { icon: conquered ? greenIcon : redIcon }).addTo(map);
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
                var m3 = L.marker(center, { icon: conquered ? greenIcon : redIcon }).addTo(map);
                window.mapInterop._labelMarkers[id] = m3;
                // Always show a permanent tooltip label above the green pin, force visibility
                if (conquered && name) {
                    console.log('DEBUG: Binding tooltip for green pin', id, name);
                    m3.bindTooltip(name, {
                        permanent: true,
                        direction: 'top',
                        className: 'country-label',
                        opacity: 1,
                        interactive: false
                    }).openTooltip();
                    // Force tooltip to show regardless of zoom
                    var tooltip = m3.getTooltip();
                    if (tooltip && tooltip._container) {
                        tooltip._container.style.display = 'block';
                        tooltip._container.style.opacity = '1';
                        console.log('DEBUG: Tooltip container found and forced visible for', id, name);
                    } else {
                        console.warn('DEBUG: Tooltip container NOT found for', id, name);
                    }
                } else {
                    console.warn('DEBUG: Not binding tooltip (conquered:', conquered, 'name:', name, ') for', id);
                }
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
                    var offshoreMarker = L.marker(labelLatLng, { icon: conquered ? greenIcon : redIcon }).addTo(map);
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
                var fm = L.marker(center, { icon: conquered ? greenIcon : redIcon }).addTo(map);
                window.mapInterop._labelMarkers[id] = fm;
                return fm;
            }
        } catch (e) { return null; }
    },

    setCountryConquered: function (id, color) {
        try {
            var layer = window.mapInterop._layersById[id];
            if (layer) {
                // If it's a marker (Kent towns), update its icon
                if (layer instanceof L.Marker && layer.setIcon) {
                    layer.setIcon(greenIcon);
                    console.log('setIcon called for', id, layer, greenIcon);
                } else if (layer.setStyle) {
                    layer.setStyle({ color: '#222', weight: 1, fillColor: (color || '#ffcc00'), fillOpacity: 0.6 });
                }
                try {
                    var name = window.mapInterop._resolveName(layer ? layer.feature : null, id);
                    var map = window.mapInterop._map;
                    var center = null;
                    try {
                        if (window.turf && layer && layer.feature) {
                            try {
                                var interior = window.mapInterop._getTurfInteriorPointForLargestPolygon(layer) || null;
                                if (!interior) {
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
                        if (!center && map && layer && layer.getLatLngs) {
                            center = window.mapInterop._getLargestPolygonCenter(layer, map) || null;
                        }
                        if (!center) {
                            if (layer.getBounds) center = layer.getBounds().getCenter();
                            else if (layer.getLatLng) center = layer.getLatLng();
                        }
                    } catch (e) { center = null; }

                    if (map && center) {
                        try {
                            if (window.mapInterop._showCountryLabels) {
                                window.mapInterop._maybePlaceOffshoreLabel(layer, id, name, center);
                            } else {
                                try { if (window.mapInterop._labelMarkers[id]) { map.removeLayer(window.mapInterop._labelMarkers[id]); delete window.mapInterop._labelMarkers[id]; } } catch (e) { }
                                try { if (window.mapInterop._labelConnectors && window.mapInterop._labelConnectors[id]) { var obj = window.mapInterop._labelConnectors[id]; if (obj.line) try { map.removeLayer(obj.line); } catch (e) { } if (obj.arrow) try { map.removeLayer(obj.arrow); } catch (e) { } delete window.mapInterop._labelConnectors[id]; } } catch (e) { }
                            }
                        } catch (e) { /* fallback below */ }
                    } else {
                        if (window.mapInterop._showCountryLabels) {
                            if (layer.bindTooltip) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'country-label' }).openTooltip();
                        } else {
                            try { if (layer.closeTooltip) layer.closeTooltip(); } catch (e) { }
                        }
                    }
                } catch (e) { console.warn('mapInterop: failed to bind name tooltip', e); }
            } else {
                console.warn('mapInterop: no layer found for', id);
            }
        } catch (e) { console.error('mapInterop.setCountryConquered error', e); }
    },

    setCountryConqueredAny: function (ids, colorOrColors) {
        try {
            if (!ids) return null;
            var matched = [];
            var unmatched = [];
            var colorMap = {};
            var isArrayColors = Array.isArray(colorOrColors);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                if (!id) continue;
                try { colorMap[id] = (isArrayColors ? colorOrColors[i] : colorOrColors) || '#dc3545'; } catch (e) { colorMap[id] = '#dc3545'; }
                console.log('mapInterop: trying to apply style for id', id, ' color=', colorMap[id]);
                if (window.mapInterop._layersById[id]) {
                    matched.push(id);
                    window.mapInterop.setCountryConquered(id, colorMap[id]);
                } else {
                    unmatched.push(id);
                }
            }
            return { matched: matched, unmatched: unmatched };
        } catch (e) { console.error('mapInterop.setCountryConqueredAny error', e); return null; }
    },

    setView: function (lat, lng, zoom, options) {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.error('mapInterop.setView: map instance not found');
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
    },

    // Set zoom level directly
    setZoom: function (zoom) {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.error('mapInterop.setZoom: map instance not found');
                return false;
            }
            if (typeof zoom !== 'number') {
                console.error('mapInterop.setZoom: zoom must be a number');
                return false;
            }
            map.setZoom(zoom);
            return true;
        } catch (e) {
            console.error('mapInterop.setZoom error', e);
            return false;
        }
    },

    // Get current zoom level
    getZoom: function () {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.error('mapInterop.getZoom: map instance not found');
                return null;
            }
            return map.getZoom();
        } catch (e) {
            console.error('mapInterop.getZoom error', e);
            return null;
        }
    },

    // Get maximum zoom level
    getMaxZoom: function () {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.error('mapInterop.getMaxZoom: map instance not found');
                return null;
            }
            return map.getMaxZoom();
        } catch (e) {
            console.error('mapInterop.getMaxZoom error', e);
            return null;
        }
    },

    // Get minimum zoom level
    getMinZoom: function () {
        try {
            var map = window.mapInterop._map;
            if (!map) {
                console.error('mapInterop.getMinZoom: map instance not found');
                return null;
            }
            return map.getMinZoom();
        } catch (e) {
            console.error('mapInterop.getMinZoom error', e);
            return null;
        }
    },

    // Update label visibility depending on current zoom level
    _updateLabelVisibility: function () {
        try {
            // if labels are globally disabled, ensure none are visible and return
            if (!window.mapInterop._showCountryLabels) {
                try {
                    var mm = window.mapInterop._map;
                    if (mm) {
                        for (var id in window.mapInterop._labelMarkers) {
                            try { var m = window.mapInterop._labelMarkers[id]; if (m) mm.removeLayer(m); } catch (e) { }
                        }
                    }
                } catch (e) { }
                return;
            }
            var map = window.mapInterop._map;
            if (!map) return;
            var z = map.getZoom ? map.getZoom() : 0;
            // threshold: hide labels below zoom 4 (you can tweak this)
            var visible = (z >= 4);
            // toggle markers
            try {
                for (var id in window.mapInterop._labelMarkers) {
                    try {
                        var m = window.mapInterop._labelMarkers[id];
                        if (m) {
                            if (visible) map.addLayer(m);
                            else map.removeLayer(m);
                        }
                    } catch (e) { }
                }
            } catch (e) { }
            // toggle connectors
            try {
                for (var cid in window.mapInterop._labelConnectors) {
                    try {
                        var obj = window.mapInterop._labelConnectors[cid];
                        if (obj && obj.line) {
                            if (visible) map.addLayer(obj.line);
                            else map.removeLayer(obj.line);
                        }
                    } catch (e) { }
                }
            } catch (e) { }
            // when becoming visible, recompute positions to ensure offshore labels are placed correctly at the current zoom
            if (visible) {
                try { window.mapInterop.recomputeLabels(); } catch (e) { }
            }
        } catch (e) { }
    },

    focusElement: function (id, select) {
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
    },

    // Clear all conquered styles and labels from the map
    clearConquered: function () {
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
    },

    // Show a Bootstrap modal by id (safe helper to avoid eval)
    showBootstrapModal: function (id) {
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
    },

    // Recompute all label positions based on current geometry and prefer turf interior points for multi-part features
    recomputeLabels: function () {
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
    },

    // Zoom the map to a specific country feature identified by id (code or name).
    zoomToCountry: function (id) {
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
    },

    // Zoom the map to the bounding box of all features matching the provided continent name.
    // Continent name should match a property on the features (we'll check properties.continent or properties.continent_na if present)
    zoomToContinent: function (continentName) {
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
