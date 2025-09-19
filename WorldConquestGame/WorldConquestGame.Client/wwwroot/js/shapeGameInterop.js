window.shapeGameInterop = {
    _map: null,
    _currentLayer: null,

    displayCountryShape: async function (elementId, countryCode) {
        try {
            // Check if element exists, wait if necessary
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

                // Add a simple tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this._map);
            }

            // Clear existing layers
            if (this._currentLayer) {
                this._map.removeLayer(this._currentLayer);
                this._currentLayer = null;
            }

            // Load and display the specific country
            const response = await fetch('data/countries.geojson');
            const geoData = await response.json();

            // Find the specific country in the GeoJSON
            const countryFeature = geoData.features.find(feature => 
                feature.id === countryCode || 
                (feature.properties && feature.properties.iso_a3 === countryCode)
            );

            if (countryFeature) {
                // Create a layer for just this country
                this._currentLayer = L.geoJSON(countryFeature, {
                    style: {
                        fillColor: '#3388ff',
                        weight: 2,
                        opacity: 1,
                        color: '#3388ff',
                        fillOpacity: 0.7
                    }
                }).addTo(this._map);

                // Fit the map to show the country
                this._map.fitBounds(this._currentLayer.getBounds(), {
                    padding: [20, 20],
                    maxZoom: 6
                });
            } else {
                console.warn('Country not found:', countryCode);
                // If country not found, show a placeholder message
                this.showCountryNotFound(countryCode);
            }

        } catch (error) {
            console.error('Error displaying country shape:', error);
        }
    },

    showCountryNotFound: function(countryCode) {
        // Clear the map and show a message
        if (this._currentLayer) {
            this._map.removeLayer(this._currentLayer);
            this._currentLayer = null;
        }
        
        // Reset map view
        this._map.setView([0, 0], 2);
        
        // You could add a popup or marker here to indicate the country wasn't found
        console.log('Country shape not available for:', countryCode);
    },

    clearMap: function() {
        if (this._map) {
            if (this._currentLayer) {
                this._map.removeLayer(this._currentLayer);
                this._currentLayer = null;
            }
            // Reset to world view
            this._map.setView([0, 0], 2);
        }
    },

    // Clean up when component is disposed
    dispose: function() {
        if (this._map) {
            this._map.remove();
            this._map = null;
            this._currentLayer = null;
        }
    }
};