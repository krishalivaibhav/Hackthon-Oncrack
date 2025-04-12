import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styled from 'styled-components';
import axios from 'axios';
import debounce from 'lodash/debounce';
import Login from './components/Login';
import Register from './components/Register';

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
`;

const Navbar = styled.nav`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const NavTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  color: #000000;
`;

const NavSearch = styled.div`
  flex: 1;
  max-width: 500px;
  margin: 0 20px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 2px solid #d1d1d6;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
  
  &:focus {
    outline: none;
    border-color: #007aff;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }
`;

const SuggestionsList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
`;

const SuggestionItem = styled.div`
  padding: 10px 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    background-color: #f5f7fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const AQIPanel = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  width: 300px;
  backdrop-filter: blur(5px);
`;

const AQISection = styled.div`
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #d1d1d6;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const AQITitle = styled.h4`
  margin: 0 0 10px 0;
  color: #000000;
  font-size: 1.1rem;
`;

const AQIValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: ${props => {
    const aqi = props.aqi;
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  }};
  margin: 10px 0;
`;

const PollutantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
`;

const PollutantItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
`;

const PollutantLabel = styled.div`
  font-size: 0.8rem;
  color: #000000;
  opacity: 0.7;
  margin-bottom: 5px;
`;

const PollutantValue = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: #000000;
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

// Delhi coordinates (fallback)
const DELHI_COORDINATES = [28.6139, 77.2090];

function ChangeView({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      console.log('ChangeView: Updating map view to', center, zoom);
      map.setView(center, zoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, zoom, map]);

  return null;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(12);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Custom location marker icon
  const locationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const getZoomLevelForLocation = (result) => {
    const type = result.type;
    const displayName = result.display_name.toLowerCase();
    
    // Keywords for administrative areas
    const adminKeywords = ['district', 'division', 'region', 'zone', 'circle'];
    const isAdminArea = adminKeywords.some(keyword => displayName.includes(keyword));
    
    // Keywords for states and large regions
    const stateKeywords = ['state', 'province', 'territory'];
    const isState = stateKeywords.some(keyword => displayName.includes(keyword));
    
    // Keywords for institutions and landmarks
    const institutionKeywords = ['institute', 'university', 'college', 'school', 'hospital', 'track', 'stadium', 'park', 'monument'];
    const isInstitution = institutionKeywords.some(keyword => displayName.includes(keyword));
    
    // Keywords for small areas or neighborhoods
    const smallAreaKeywords = ['colony', 'sector', 'block', 'area', 'locality', 'village', 'town', 'suburb', 'ward'];
    const isSmallArea = smallAreaKeywords.some(keyword => displayName.includes(keyword));
    
    // Keywords for cities
    const cityKeywords = ['city', 'metro', 'municipality'];
    const isCity = cityKeywords.some(keyword => displayName.includes(keyword));
    
    if (isInstitution) {
      return 18; // Very close zoom for institutions and landmarks
    } else if (isSmallArea) {
      return 17; // Very close zoom for neighborhoods and small areas
    } else if (isCity || type === 'city') {
      return 16; // Close zoom for cities
    } else if (isAdminArea) {
      return 15; // Close zoom for administrative areas
    } else if (isState || type === 'administrative') {
      return 14; // Good zoom for states and large administrative regions
    } else {
      return 16; // Default close zoom for other locations
    }
  };

  const handleSuggestionClick = (result) => {
    const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
    const newZoom = getZoomLevelForLocation(result);
    
    setPosition(newPosition);
    setCurrentZoom(newZoom);
    fetchAirQualityData(newPosition[0], newPosition[1]);
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Search with India focus and broader parameters
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}+india&countrycodes=in&limit=20&featuretype=state,administrative,city,town,village,suburb,neighbourhood,quarter,hamlet,isolated_dwelling`
        );
        
        if (response.data && response.data.length > 0) {
          // Filter and sort results to prioritize Indian locations
          const results = response.data
            .filter(result => {
              // Ensure the result is from India
              const displayName = result.display_name.toLowerCase();
              return displayName.includes('india') || 
                     // Major cities and states
                     displayName.includes('delhi') ||
                     displayName.includes('mumbai') ||
                     displayName.includes('bangalore') ||
                     displayName.includes('chennai') ||
                     displayName.includes('kolkata') ||
                     displayName.includes('hyderabad') ||
                     displayName.includes('pune') ||
                     displayName.includes('ahmedabad') ||
                     displayName.includes('surat') ||
                     // States
                     displayName.includes('maharashtra') ||
                     displayName.includes('karnataka') ||
                     displayName.includes('tamil nadu') ||
                     displayName.includes('west bengal') ||
                     displayName.includes('gujarat') ||
                     displayName.includes('rajasthan') ||
                     displayName.includes('uttar pradesh') ||
                     displayName.includes('bihar') ||
                     displayName.includes('andhra pradesh') ||
                     displayName.includes('telangana') ||
                     displayName.includes('kerala') ||
                     displayName.includes('punjab') ||
                     displayName.includes('haryana') ||
                     displayName.includes('odisha') ||
                     displayName.includes('assam') ||
                     displayName.includes('jharkhand') ||
                     displayName.includes('chhattisgarh') ||
                     displayName.includes('uttarakhand') ||
                     displayName.includes('goa') ||
                     displayName.includes('tripura') ||
                     displayName.includes('meghalaya') ||
                     displayName.includes('manipur') ||
                     displayName.includes('nagaland') ||
                     displayName.includes('arunachal pradesh') ||
                     displayName.includes('sikkim') ||
                     displayName.includes('mizoram') ||
                     displayName.includes('himachal pradesh') ||
                     displayName.includes('jammu and kashmir') ||
                     displayName.includes('ladakh') ||
                     displayName.includes('andaman and nicobar') ||
                     displayName.includes('lakshadweep') ||
                     displayName.includes('dadra and nagar haveli') ||
                     displayName.includes('daman and diu') ||
                     displayName.includes('chandigarh') ||
                     displayName.includes('puducherry');
            })
            .sort((a, b) => {
              // Prioritize based on type and relevance
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
              
              // If same type, prioritize exact matches
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
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Get user's location on app start
  useEffect(() => {
    if (!mapReady) return; // Wait for map to be ready

    const getLocation = () => {
      if (!navigator.geolocation) {
        console.log('Geolocation is not supported');
        setError('Geolocation is not supported by your browser. Using Delhi as default.');
        setPosition(DELHI_COORDINATES);
        setCurrentZoom(13);
        fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
        setIsLoading(false);
        return;
      }

      console.log('Requesting geolocation...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Geolocation success:', position);
          const { latitude, longitude } = position.coords;
          console.log('Setting position to:', latitude, longitude);
          
          // First set the position to user's location
          setPosition([latitude, longitude]);
          setCurrentZoom(13);
          fetchAirQualityData(latitude, longitude);
          setIsLoading(false);

          // Then do a reverse geocoding to check if the location is in India
          axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          ).then(response => {
            const address = response.data.address;
            if (!address.country || address.country.toLowerCase() !== 'india') {
              setError('Your location is outside India. Using Delhi as default.');
              setPosition(DELHI_COORDINATES);
              setCurrentZoom(13);
              fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
            }
          }).catch(error => {
            console.error('Error in reverse geocoding:', error);
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setError('Please allow location access to get accurate air quality data for your area.');
              break;
            case error.POSITION_UNAVAILABLE:
              setError('Location information is unavailable.');
              break;
            case error.TIMEOUT:
              setError('Location request timed out.');
              break;
            default:
              setError('An unknown error occurred while getting your location.');
          }
          setPosition(DELHI_COORDINATES);
          setCurrentZoom(13);
          fetchAirQualityData(DELHI_COORDINATES[0], DELHI_COORDINATES[1]);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    getLocation();
  }, [mapReady]); // Only run when map is ready

  // Update map when position changes
  useEffect(() => {
    if (mapRef.current) {
      console.log('Updating map position to:', position);
      mapRef.current.setView(position, currentZoom, {
        animate: true,
        duration: 1.5
      });
    }
  }, [position, currentZoom, mapRef]);

  const fetchAirQualityData = async (lat, lng) => {
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
  };

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    setPosition([lat, lng]);
    fetchAirQualityData(lat, lng);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  if (isLoading) {
    return (
      <LoadingMessage>
        <h3>Loading...</h3>
      </LoadingMessage>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Register />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <AppContainer>
                <Navbar>
                  <NavTitle>Air Quality Monitor - India</NavTitle>
                  <NavSearch>
                    <SearchInput
                      type="text"
                      placeholder="Search location in India (city, state)..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && (
                      <button 
                        onClick={handleClearSearch}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#666'
                        }}
                      >
                        ✕
                      </button>
                    )}
                    {isSearching && (
                      <div style={{ textAlign: 'center', padding: '5px', color: '#000000' }}>
                        Searching...
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <SuggestionsList>
                        {searchResults.map((result, index) => (
                          <SuggestionItem
                            key={index}
                            onClick={() => handleSuggestionClick(result)}
                          >
                            <div style={{ fontWeight: 'bold' }}>{result.display_name}</div>
                            <div style={{ fontSize: '0.8em', opacity: 0.7 }}>
                              {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                            </div>
                          </SuggestionItem>
                        ))}
                      </SuggestionsList>
                    )}
                  </NavSearch>
                </Navbar>

                <MapWrapper>
                  <MapContainer
                    ref={mapRef}
                    center={position}
                    zoom={currentZoom}
                    style={{ height: '100%', width: '100%' }}
                    onClick={handleMapClick}
                    zoomControl={true}
                    preferCanvas={true}
                    whenCreated={(map) => {
                      console.log('Map created');
                      map.invalidateSize();
                      setMapReady(true);
                    }}
                  >
                    <ChangeView center={position} zoom={currentZoom} />
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
                          <p>Your Location</p>
                          <p>AQI: {airQualityData?.aqi || 'Loading...'}</p>
                          <p>PM2.5: {airQualityData?.pollutants?.pm2_5 || 'Loading...'}</p>
                          <p>PM10: {airQualityData?.pollutants?.pm10 || 'Loading...'}</p>
                          <p>NO2: {airQualityData?.pollutants?.no2 || 'Loading...'}</p>
                          <p>O3: {airQualityData?.pollutants?.o3 || 'Loading...'}</p>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                  
                  {airQualityData && (
                    <AQIPanel>
                      <AQISection>
                        <AQITitle>Air Quality Index</AQITitle>
                        <AQIValue aqi={airQualityData?.aqi || 0}>
                          {airQualityData?.aqi || 'Loading...'}
                        </AQIValue>
                        <div style={{ color: '#000000', opacity: 0.7 }}>
                          {getAQIDescription(airQualityData?.aqi || 0)}
                        </div>
                      </AQISection>

                      <AQISection>
                        <AQITitle>Pollutants</AQITitle>
                        <PollutantGrid>
                          <PollutantItem>
                            <PollutantLabel>PM2.5</PollutantLabel>
                            <PollutantValue>{airQualityData?.pollutants?.pm2_5 || 'Loading...'}</PollutantValue>
                          </PollutantItem>
                          <PollutantItem>
                            <PollutantLabel>PM10</PollutantLabel>
                            <PollutantValue>{airQualityData?.pollutants?.pm10 || 'Loading...'}</PollutantValue>
                          </PollutantItem>
                          <PollutantItem>
                            <PollutantLabel>NO2</PollutantLabel>
                            <PollutantValue>{airQualityData?.pollutants?.no2 || 'Loading...'}</PollutantValue>
                          </PollutantItem>
                          <PollutantItem>
                            <PollutantLabel>O3</PollutantLabel>
                            <PollutantValue>{airQualityData?.pollutants?.o3 || 'Loading...'}</PollutantValue>
                          </PollutantItem>
                        </PollutantGrid>
                      </AQISection>

                      <AQISection>
                        <AQITitle>Location</AQITitle>
                        <div style={{ color: '#000000' }}>
                          {searchQuery || 'Current Location'}
                        </div>
                        <div style={{ color: '#000000', opacity: 0.7, fontSize: '0.9rem' }}>
                          Last updated: {new Date().toLocaleTimeString()}
                        </div>
                      </AQISection>
                    </AQIPanel>
                  )}
                </MapWrapper>
              </AppContainer>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
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