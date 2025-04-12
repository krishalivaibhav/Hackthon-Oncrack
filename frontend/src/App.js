import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styled from 'styled-components';
import axios from 'axios';
import debounce from 'lodash/debounce';
import Login from './components/Login';
import SearchBar from './components/SearchBar';
import AQIPanel from './components/AQIPanel';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Styled components
const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #000000;
`;

const MapWrapper = styled.div`
  height: 100vh;
  width: 100%;
  position: relative;
  
  .leaflet-control-zoom {
    margin-bottom: 200px !important;
    margin-left: 20px !important;
    border: none !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    position: absolute !important;
    left: 20px !important;
    bottom: 200px !important;
  }
  
  .leaflet-control-zoom a {
    background: white !important;
    color: #1a2a6c !important;
    border: none !important;
    
    &:hover {
      background: #f5f7fa !important;
    }
  }
`;

const Navbar = styled.nav`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  gap: 24px;
`;

const NavTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: #1a2a6c;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  min-width: 150px;
  
  svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 600px;
  margin-left: auto;
  margin-right: 60px;
  display: flex;
  align-items: center;
  margin-top: 8px;
`;

const LoadingMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

// Constants
const DELHI_COORDINATES = [28.6139, 77.2090];
const DEFAULT_ZOOM = 13;
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

// Memoized marker icon
const locationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, {
        duration: 3.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [position, setPosition] = useState(DELHI_COORDINATES);
  const [airQualityData, setAirQualityData] = useState({
    aqi: 0,
    pollutants: {
      pm2_5: 0,
      pm10: 0,
      no2: 0,
      o3: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [mapReady, setMapReady] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  // Memoized zoom level function
  const getZoomLevelForLocation = useCallback((result) => {
    const type = result.type;
    const displayName = result.display_name.toLowerCase();
    
    const zoomLevels = {
      institution: 18,
      smallArea: 17,
      city: 16,
      adminArea: 15,
      state: 14
    };
    
    const keywords = {
      institution: ['institute', 'university', 'college', 'school', 'hospital', 'track', 'stadium', 'park', 'monument'],
      smallArea: ['colony', 'sector', 'block', 'area', 'locality', 'village', 'town', 'suburb', 'ward'],
      city: ['city', 'metro', 'municipality'],
      adminArea: ['district', 'division', 'region', 'zone', 'circle'],
      state: ['state', 'province', 'territory']
    };
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => displayName.includes(word)) || 
          (category === 'city' && type === 'city') ||
          (category === 'state' && type === 'administrative')) {
        return zoomLevels[category];
      }
    }
    
    return zoomLevels.city; // Default zoom level
  }, []);

  // Memoized suggestion click handler
  const handleSuggestionClick = useCallback((result) => {
    setIsSearching(true);
    setIsZooming(true);
    const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
    const newZoom = getZoomLevelForLocation(result);
    
    setPosition(newPosition);
    setCurrentZoom(newZoom);
    
    setTimeout(() => {
      fetchAirQualityData(newPosition[0], newPosition[1]).then(() => {
        setIsSearching(false);
        setIsZooming(false);
      });
    }, 3500);
    
    setSearchResults([]);
    setSearchQuery(result.display_name);
  }, [getZoomLevelForLocation]);

  // Memoized search function
  const debouncedSearch = useMemo(
    () => debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+india&countrycodes=in&limit=20&featuretype=state,administrative,city,town,village,suburb,neighbourhood,quarter,hamlet,isolated_dwelling`
        );
        
        if (response.data?.length > 0) {
          const results = response.data
            .filter(result => {
              const displayName = result.display_name.toLowerCase();
              return displayName.includes('india') || 
                     displayName.includes('delhi') ||
                     displayName.includes('mumbai') ||
                     displayName.includes('bangalore') ||
                     displayName.includes('chennai') ||
                     displayName.includes('kolkata') ||
                     displayName.includes('hyderabad') ||
                     displayName.includes('pune') ||
                     displayName.includes('ahmedabad') ||
                     displayName.includes('jaipur') ||
                     displayName.includes('lucknow') ||
                     displayName.includes('kanpur') ||
                     displayName.includes('nagpur') ||
                     displayName.includes('indore') ||
                     displayName.includes('thane') ||
                     displayName.includes('bhopal') ||
                     displayName.includes('visakhapatnam') ||
                     displayName.includes('patna') ||
                     displayName.includes('vadodara') ||
                     displayName.includes('ghaziabad') ||
                     displayName.includes('ludhiana') ||
                     displayName.includes('agra') ||
                     displayName.includes('nashik') ||
                     displayName.includes('faridabad') ||
                     displayName.includes('aurangabad') ||
                     displayName.includes('rajkot') ||
                     displayName.includes('meerut') ||
                     displayName.includes('jabalpur') ||
                     displayName.includes('srinagar') ||
                     displayName.includes('amritsar') ||
                     displayName.includes('allahabad') ||
                     displayName.includes('ranchi') ||
                     displayName.includes('guwahati') ||
                     displayName.includes('chandigarh') ||
                     displayName.includes('thiruvananthapuram') ||
                     displayName.includes('kochi') ||
                     displayName.includes('kozhikode') ||
                     displayName.includes('bhubaneswar') ||
                     displayName.includes('dehradun') ||
                     displayName.includes('raipur') ||
                     displayName.includes('gwalior') ||
                     displayName.includes('vijayawada') ||
                     displayName.includes('jodhpur') ||
                     displayName.includes('madurai') ||
                     displayName.includes('raipur') ||
                     displayName.includes('kota') ||
                     displayName.includes('salem') ||
                     displayName.includes('tiruchirappalli') ||
                     displayName.includes('bhubaneswar') ||
                     displayName.includes('aligarh') ||
                     displayName.includes('bareilly') ||
                     displayName.includes('gorakhpur') ||
                     displayName.includes('moradabad') ||
                     displayName.includes('mysore') ||
                     displayName.includes('bhubaneswar') ||
                     displayName.includes('amravati') ||
                     displayName.includes('noida') ||
                     displayName.includes('ghaziabad') ||
                     displayName.includes('solan') ||
                     displayName.includes('jammu') ||
                     displayName.includes('shimla') ||
                     displayName.includes('gandhinagar') ||
                     displayName.includes('bhopal') ||
                     displayName.includes('lucknow') ||
                     displayName.includes('patna') ||
                     displayName.includes('bhubaneswar') ||
                     displayName.includes('dehradun') ||
                     displayName.includes('raipur') ||
                     displayName.includes('gandhinagar') ||
                     displayName.includes('dispur') ||
                     displayName.includes('itanagar') ||
                     displayName.includes('shillong') ||
                     displayName.includes('aizawl') ||
                     displayName.includes('kohima') ||
                     displayName.includes('imphal') ||
                     displayName.includes('gangtok') ||
                     displayName.includes('agartala') ||
                     displayName.includes('panaji') ||
                     displayName.includes('port blair') ||
                     displayName.includes('kavaratti') ||
                     displayName.includes('daman') ||
                     displayName.includes('diu') ||
                     displayName.includes('silvassa') ||
                     displayName.includes('leh') ||
                     displayName.includes('kargil') ||
                     displayName.includes('puducherry');
            })
            .sort((a, b) => {
              const typePriority = {
                'city': 5,
                'town': 4,
                'village': 3,
                'suburb': 2,
                'neighbourhood': 2,
                'quarter': 2,
                'hamlet': 1,
                'isolated_dwelling': 1,
                'administrative': 0
              };
              
              const aPriority = typePriority[a.type] || 0;
              const bPriority = typePriority[b.type] || 0;
              
              if (aPriority !== bPriority) {
                return bPriority - aPriority;
              }
              
              const queryLower = query.toLowerCase();
              const aExactMatch = a.display_name.toLowerCase().includes(queryLower);
              const bExactMatch = b.display_name.toLowerCase().includes(queryLower);
              
              return bExactMatch - aExactMatch;
            });
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching location:', error);
        setError('Error searching location. Please try again.');
      }
    }, 300),
    []
  );

  // Memoized air quality data fetcher
  const fetchAirQualityData = useCallback(async (lat, lng) => {
    try {
      const response = await axios.get(`http://localhost:8000/api/air-quality/${lat}/${lng}`);
      setAirQualityData(response.data);
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      setAirQualityData({
        latitude: lat,
        longitude: lng,
        aqi: 45,
        timestamp: new Date().toISOString(),
        pollutants: {
          pm2_5: 12.5,
          pm10: 25.0,
          no2: 0.05,
          o3: 0.03
        }
      });
    }
  }, []);

  // Geolocation effect
  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser');
        setError('Geolocation is not supported by your browser. Using Delhi as default.');
        setPosition(DELHI_COORDINATES);
        setCurrentZoom(DEFAULT_ZOOM);
        fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
        setIsLoading(false);
        return;
      }

      console.log('Requesting geolocation...');
      
      if (window.geoWatchId) {
        navigator.geolocation.clearWatch(window.geoWatchId);
      }

      window.geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('Geolocation success:', position);
          const { latitude, longitude } = position.coords;
          
          setPosition([latitude, longitude]);
          setCurrentZoom(DEFAULT_ZOOM);
          fetchAirQualityData(latitude, longitude);
          setIsLoading(false);

          axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          ).then(response => {
            const address = response.data.address;
            if (!address.country || address.country.toLowerCase() !== 'india') {
              setError('Your location is outside India. Using Delhi as default.');
              setPosition(DELHI_COORDINATES);
              setCurrentZoom(DEFAULT_ZOOM);
              fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
            }
          }).catch(error => {
            console.error('Error in reverse geocoding:', error);
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          const errorMessages = {
            [error.PERMISSION_DENIED]: 'Please allow location access to get accurate air quality data for your area.',
            [error.POSITION_UNAVAILABLE]: 'Location information is unavailable.',
            [error.TIMEOUT]: 'Location request timed out.'
          };
          
          setError(errorMessages[error.code] || 'An unknown error occurred while getting your location.');
          setPosition(DELHI_COORDINATES);
          setCurrentZoom(DEFAULT_ZOOM);
          fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
          setIsLoading(false);
        },
        GEOLOCATION_OPTIONS
      );
    };

    getLocation();

    return () => {
      if (window.geoWatchId) {
        navigator.geolocation.clearWatch(window.geoWatchId);
      }
    };
  }, [fetchAirQualityData]);

  // Memoized map click handler
  const handleMapClick = useCallback((e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);
    fetchAirQualityData(lat, lng);
  }, [fetchAirQualityData]);

  // Memoized search change handler
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleZoomEnd = useCallback(() => {
    setIsZooming(false);
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={setIsAuthenticated} />;
  }

  if (isLoading) {
    return (
      <LoadingMessage>
        <h3>Getting your location...</h3>
        <p>Please allow location access to get accurate air quality data for your area.</p>
      </LoadingMessage>
    );
  }

  return (
    <AppContainer>
      <Navbar>
        <NavTitle>
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          QuantumAq
        </NavTitle>
        <SearchContainer>
          <SearchBar
            searchQuery={searchQuery}
            handleSearchChange={handleSearchChange}
            searchResults={searchResults}
            handleSuggestionClick={handleSuggestionClick}
          />
        </SearchContainer>
      </Navbar>

      <MapWrapper>
        <MapContainer
          center={position}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          onClick={handleMapClick}
          zoomControl={true}
          zoomControlPosition="bottomleft"
          preferCanvas={true}
          whenCreated={(map) => {
            console.log('Map created, setting mapReady to true');
            setMapReady(true);
          }}
        >
          <ChangeView 
            center={position} 
            zoom={currentZoom} 
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            minZoom={4}
            maxNativeZoom={19}
            keepBuffer={4}
          />
          <Marker position={position} icon={locationIcon}>
            <Popup>
              <div style={{ 
                color: '#000000',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '10px',
                borderRadius: '8px'
              }}>
                <h3>Air Quality Data</h3>
                {error && <p style={{ color: '#ff3b30' }}>{error}</p>}
                <p>Location: {searchQuery || 'Current Location'}</p>
                <p>AQI: {airQualityData?.aqi || 'Loading...'}</p>
                <p>PM2.5: {airQualityData?.pollutants?.pm2_5 || 'Loading...'}</p>
                <p>PM10: {airQualityData?.pollutants?.pm10 || 'Loading...'}</p>
                <p>NO2: {airQualityData?.pollutants?.no2 || 'Loading...'}</p>
                <p>O3: {airQualityData?.pollutants?.o3 || 'Loading...'}</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
        
        {!isZooming && airQualityData && (
          <AQIPanel
            airQualityData={airQualityData}
            searchQuery={searchQuery}
            getAQIDescription={getAQIDescription}
          />
        )}
      </MapWrapper>
    </AppContainer>
  );
}

// Helper function to get AQI description
function getAQIDescription(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export default App; 