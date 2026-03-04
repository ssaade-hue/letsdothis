// Initialize the map centered on Seattle
const map = L.map('map').setView([47.6062, -122.3321], 11);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    maxNativeZoom: 18
}).addTo(map);

// Store data globally
let allStops = [];
let filteredStops = [];
let markerGroup = L.markerClusterGroup({
    maxClusterRadius: 60,
    disableClusteringAtZoom: 16
});

// Color scheme for markers based on number of routes
function getMarkerColor(routeCount) {
    if (!routeCount || routeCount === 'No routes') return '#3388ff';
    const count = parseInt(routeCount) || 0;
    if (count <= 2) return '#3388ff';      // Blue - small
    if (count <= 5) return '#ff8800';      // Orange - medium
    return '#ee5e00';                      // Red - large
}

// Create custom marker icon
function createMarkerIcon(color) {
    return L.icon({
        iconUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${encodeURIComponent(color)}" width="28" height="28"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
        className: 'bus-stop-marker'
    });
}

// Create popup content
function createPopupContent(feature) {
    const props = feature.properties;
    const routesArray = props.routes_serving ? props.routes_serving.split(',').map(r => r.trim()) : [];
    
    let html = '<div class="popup-content">';
    html += '<div class="popup-header">';
    html += `<div class="stop-name">${props.stop_name || 'Unknown Stop'}</div>`;
    html += `<div class="stop-id">Stop ID: ${props.stop_id}</div>`;
    html += '</div>';
    
    html += '<div class="popup-info">';
    
    // Routes serving
    if (routesArray.length > 0) {
        html += '<div class="popup-info-row"><span class="info-label">Routes:</span>';
        routesArray.forEach(route => {
            if (route) {
                html += `<span class="routes-badge">${route}</span>`;
            }
        });
        html += '</div>';
    }
    
    // Jurisdiction
    if (props.jurisdiction) {
        html += `<div class="popup-info-row"><span class="info-label">Area:</span><span class="info-value">${props.jurisdiction}</span></div>`;
    }
    
    // Shelter
    html += `<div class="popup-info-row"><span class="info-label">Shelter:</span><span class="info-value">${props.has_shelter}</span></div>`;
    
    // Accessibility
    const accessClass = props.accessibility.includes('ADA') ? 'yes' : 'no';
    html += `<div class="popup-info-row"><span class="accessibility ${accessClass}">${props.accessibility}</span></div>`;
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// Load GeoJSON data
async function loadStops() {
    try {
        const response = await fetch('data/stops.geojson');
        if (!response.ok) throw new Error('Failed to load stops data');
        
        const data = await response.json();
        allStops = data.features;
        
        // Update stop count
        document.querySelector('.stop-count').textContent = `${allStops.length.toLocaleString()} Active Stops`;
        
        // Add all stops to map
        displayStops(allStops);
        
        // Fit map to bounds
        if (allStops.length > 0) {
            const bounds = L.latLngBounds(
                allStops.map(stop => [
                    stop.properties.stop_lat,
                    stop.properties.stop_lon
                ])
            );
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        
    } catch (error) {
        console.error('Error loading stops:', error);
        document.querySelector('.stop-count').textContent = 'Error loading stops';
    }
}

// Display stops on map
function displayStops(stops) {
    markerGroup.clearLayers();
    
    stops.forEach(feature => {
        const props = feature.properties;
        const color = getMarkerColor(props.routes_serving);
        
        const marker = L.marker(
            [props.stop_lat, props.stop_lon],
            { icon: createMarkerIcon(color) }
        );
        
        marker.bindPopup(createPopupContent(feature), {
            maxWidth: 300,
            className: 'stop-popup'
        });
        
        // Add click event for analytics (optional)
        marker.on('click', function() {
            console.log(`Clicked stop: ${props.stop_name}`);
        });
        
        markerGroup.addLayer(marker);
    });
    
    map.addLayer(markerGroup);
}

// Search functionality
document.getElementById('search-input').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length === 0) {
        displayStops(allStops);
        return;
    }
    
    filteredStops = allStops.filter(stop => {
        const props = stop.properties;
        const stopName = (props.stop_name || '').toLowerCase();
        const stopId = (props.stop_id || '').toLowerCase();
        const routes = (props.routes_serving || '').toLowerCase();
        
        return stopName.includes(query) || 
               stopId.includes(query) || 
               routes.includes(query);
    });
    
    displayStops(filteredStops);
    
    // Show message if no results
    if (filteredStops.length === 0) {
        console.log(`No stops found matching: ${query}`);
    }
});

// Clear search
document.getElementById('clear-search').addEventListener('click', function() {
    document.getElementById('search-input').value = '';
    displayStops(allStops);
});

// Load data when page loads
window.addEventListener('load', loadStops);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('search-input').value = '';
        displayStops(allStops);
    }
});
