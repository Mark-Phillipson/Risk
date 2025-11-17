window.shapeGameInterop = {
    _map: null,
    _currentLayer: null,
    _tileLayer: null,

    displayCountryShape: async function (elementId, countryCode, showBaseMap) {
        try {
            // Ensure we have an element to attach the map to (wait briefly if needed)
            let element = document.getElementById(elementId);
            let attempts = 0;
            while (!element && attempts < 20) { // Wait up to 2 seconds
                await new Promise(resolve => setTimeout(resolve, 100));
                element = document.getElementById(elementId);
                attempts++;
            }

            if (!element) {
                console.error('Map element not found:', elementId);
                return;
            }

            // Create or update a simple visible overlay inside the map container for debugging
            let overlayId = elementId + '-overlay';
            let overlay = document.getElementById(overlayId);
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = overlayId;
                // style to be visible but non-blocking
                overlay.style.position = 'absolute';
                overlay.style.top = '8px';
                overlay.style.left = '8px';
                overlay.style.zIndex = 650; // above leaflet panes
                overlay.style.background = 'rgba(255,255,255,0.9)';
                overlay.style.padding = '6px 8px';
                overlay.style.borderRadius = '4px';
                overlay.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
                overlay.style.fontSize = '13px';
                overlay.style.color = '#222';
                overlay.innerText = 'Preparing map...';
                // Ensure the container is position:relative so overlay absolute works
                try { element.style.position = element.style.position || 'relative'; } catch (e) { }
                element.appendChild(overlay);
            } else {
                overlay.style.display = 'block';
                overlay.innerText = 'Preparing map...';
            }

            // Initialize map if not already done
            if (!this._map) {
                this._map = L.map(elementId, {
                    center: [0, 0],
                    zoom: 2,
                    zoomControl: true,
                    scrollWheelZoom: true,
                    dragging: true,
                    touchZoom: true,
                    doubleClickZoom: true,
                    boxZoom: true
                });

                // Create a tile layer and keep a reference to it. We'll toggle opacity to show/hide
                try {
                    this._tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(this._map);
                    // If we shouldn't show base tiles for this call, make it transparent
                    if (!showBaseMap && this._tileLayer && typeof this._tileLayer.setOpacity === 'function') {
                        try { this._tileLayer.setOpacity(0); } catch (e) { /* ignore */ }
                    }
                } catch (e) {
                    console.warn('Unable to create tile layer:', e);
                }

                // Force a resize/invalidate after creation so tiles render when container size was changed
                setTimeout(() => {
                    try { this._map.invalidateSize(); } catch (e) { /* ignore */ }
                }, 50);
            } else {
                // If the map already exists, toggle tile layer according to showBaseMap
                try {
                    // Toggle tile layer visibility by adjusting opacity - more reliable than removing/adding
                    try {
                        if (this._tileLayer && typeof this._tileLayer.setOpacity === 'function') {
                            this._tileLayer.setOpacity(showBaseMap ? 1 : 0);
                        } else if (showBaseMap && !this._tileLayer) {
                            // fallback: create if missing
                            this._tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors'
                            }).addTo(this._map);
                        }
                    } catch (e) { /* ignore */ }
                    // ensure layout is recalculated
                    this._map.invalidateSize();
                } catch (e) { /* ignore */ }
            }

            // Clear existing country layer only (keep base tile layer)
            if (this._currentLayer) {
                try { this._map.removeLayer(this._currentLayer); } catch (e) { /* ignore */ }
                this._currentLayer = null;
            }

            // Load geojson and attempt a case-insensitive match for common iso fields
            const response = await fetch('data/countries.geojson');
            const geoData = await response.json();

            const target = (countryCode || '').toString().toUpperCase();
            const countryFeature = (geoData.features || []).find(feature => {
                if (!feature) return false;
                const fid = feature.id ? String(feature.id).toUpperCase() : null;
                if (fid && fid === target) return true;
                const props = feature.properties || {};
                const candidateFields = [props.iso_a3, props.ISO_A3, props.adm0_a3, props.ADM0_A3, props['alpha-3'], props['A3'], props['cca3']];
                for (let i = 0; i < candidateFields.length; i++) {
                    const v = candidateFields[i];
                    if (v && String(v).toUpperCase() === target) return true;
                }
                return false;
            });

            if (countryFeature) {
                try {
                    console.log('shapeGameInterop: matched feature id=', countryFeature.id, 'props=', countryFeature.properties);
                } catch (e) { }
                // Create a layer for just this country
                if (overlay) overlay.innerText = 'Country found: ' + target;
                // Choose styling depending on whether base tiles are shown.
                // In hard mode (no base map) we use a high-contrast thick red outline and transparent fill
                // and bring the layer to front so the shape is clearly visible on a plain background.
                const polygonStyle = (showBaseMap)
                    ? { fillColor: '#3388ff', weight: 2, opacity: 1, color: '#3388ff', fillOpacity: 0.7 }
                    : { fillColor: '#ff0000', weight: 4, opacity: 1, color: '#ff0000', fillOpacity: 0.0 };

                this._currentLayer = L.geoJSON(countryFeature, {
                    style: polygonStyle
                }).addTo(this._map);

                try {
                    // ensure the layer is rendered above tiles
                    if (this._currentLayer && typeof this._currentLayer.bringToFront === 'function') {
                        this._currentLayer.bringToFront();
                    } else if (this._currentLayer && this._currentLayer.eachLayer) {
                        this._currentLayer.eachLayer(function (l) { try { l.bringToFront(); } catch (e) { } });
                    }
                } catch (e) {
                    console.warn('Error bringing country layer to front:', e);
                }

                // Fit the map to show the country, then ensure tiles render
                try {
                    const bounds = this._currentLayer.getBounds();
                    if (bounds && bounds.isValid && bounds.isValid()) {
                        this._map.fitBounds(bounds, { padding: [20, 20], maxZoom: 6 });
                    } else {
                        // fallback to world view
                        this._map.setView([0, 0], 2);
                    }
                } catch (e) {
                    // fallback
                    this._map.setView([0, 0], 2);
                }

                // A small delay/invalidate helps Leaflet draw tiles when the container was just shown
                setTimeout(() => {
                    try { this._map.invalidateSize(); } catch (e) { /* ignore */ }
                    // hide overlay after a short while
                    try { if (overlay) overlay.style.display = 'none'; } catch (e) { }
                }, 150);

            } else {
                console.warn('Country not found in geojson for code:', countryCode);
                if (overlay) overlay.innerText = 'Country not found: ' + (countryCode || '');
                this.showCountryNotFound(countryCode);
                // keep overlay visible to indicate missing shape
            }

        } catch (error) {
            console.error('Error displaying country shape:', error);
        }
    },

    showCountryNotFound: function(countryCode) {
        try {
            if (this._currentLayer) {
                this._map.removeLayer(this._currentLayer);
                this._currentLayer = null;
            }
            if (this._map) {
                this._map.setView([0, 0], 2);
                // show a popup hint on the map
                try {
                    L.popup({ closeOnClick: true, autoClose: true })
                        .setLatLng([0, 0])
                        .setContent('Shape not available: ' + (countryCode || ''))
                        .openOn(this._map);
                } catch (e) { /* ignore popup errors */ }
            }
            console.log('Country shape not available for:', countryCode);
        } catch (e) {
            console.warn('showCountryNotFound error:', e);
        }
    },

    clearMap: function() {
        try {
            // Remove any current country layer
            if (this._map && this._currentLayer) {
                try { this._map.removeLayer(this._currentLayer); } catch (e) { }
                this._currentLayer = null;
            }
            // If a tile layer was created, remove it
            if (this._map && this._tileLayer) {
                try { this._map.removeLayer(this._tileLayer); } catch (e) { }
                this._tileLayer = null;
            }

            // Attempt a full disposal of the map so re-creating it later is safe
            if (this._map) {
                try { this._map.remove(); } catch (e) { /* ignore */ }
                this._map = null;
            }

            // Hide the small prepare overlay if present (convention: elementId + '-overlay')
            try {
                var overlay = document.getElementById('shape-map-overlay');
                if (overlay) overlay.style.display = 'none';
            } catch (e) { }
        } catch (e) {
            console.warn('clearMap error:', e);
        }
    },

    // Clean up when component is disposed
    dispose: function() {
        if (this._map) {
            try { this._map.remove(); } catch (e) { /* ignore */ }
            this._map = null;
            this._currentLayer = null;
        }
    }
};