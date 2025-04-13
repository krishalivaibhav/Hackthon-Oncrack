import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import debounce from 'lodash/debounce';
import Login from './components/Login';

// Add this keyframe animation at the top of the file, after the imports
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Styled components
const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
  background: rgba(255, 255, 255, 0.98);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
`;

const NavTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: -0.5px;
`;

const NavSearch = styled.div`
  flex: 1;
  max-width: 500px;
  margin: 0 24px;
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 40px 12px 16px;
  margin: 8px 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.9);
  color: #1a1a1a;
  
  &:focus {
    outline: none;
    border-color: #007aff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }
  
  &::placeholder {
    color: #8e8e93;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #8e8e93;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 50%;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #1a1a1a;
  }
  
  &:focus {
    outline: none;
  }
`;

const SuggestionsList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 8px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;

const SuggestionItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  
  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const AQIPanel = styled.div`
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: rgba(255, 255, 255, 0.95);
  padding: ${props => props.expanded ? '25px' : '0'};
  border-radius: ${props => props.expanded ? '16px' : '50%'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  width: ${props => props.expanded ? '320px' : '220px'};
  height: ${props => props.expanded ? 'auto' : '220px'};
  backdrop-filter: blur(10px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }
`;

const MainAQICircle = styled.div`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: ${props => {
    const aqi = props.aqi;
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  }};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #000000;
  font-weight: bold;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const MainAQIValue = styled.div`
  font-size: 42px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const MainAQILabel = styled.div`
  font-size: 16px;
  opacity: 0.9;
  font-weight: 500;
  margin-top: 4px;
`;

const PollutantCircles = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${rotate} 30s linear infinite;
`;

const PollutantCircle = styled.div`
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.05);
  
  &:nth-child(1) { transform: translate(-85px, -85px); }
  &:nth-child(2) { transform: translate(85px, -85px); }
  &:nth-child(3) { transform: translate(-85px, 85px); }
  &:nth-child(4) { transform: translate(85px, 85px); }
  
  &:hover {
    transform: scale(1.1) translate(${props => {
      switch(props.index) {
        case 0: return '-85px, -85px';
        case 1: return '85px, -85px';
        case 2: return '-85px, 85px';
        case 3: return '85px, 85px';
        default: return '0, 0';
      }
    }});
    z-index: 3;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
  
  > * {
    transform: rotate(${props => -30 * props.index}s);
    animation: ${rotate} 30s linear infinite reverse;
  }
  
  &:hover > * {
    animation-play-state: paused;
  }
`;

const PollutantLabel = styled.div`
  font-size: 14px;
  color: #000000;
  opacity: 0.8;
  font-weight: 500;
  margin-bottom: 4px;
`;

const PollutantValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #000000;
`;

const AQISection = styled.div`
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  width: 100%;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const AQITitle = styled.h4`
  margin: 0 0 12px 0;
  color: #000000;
  font-size: 1.2rem;
  font-weight: 600;
`;

const AQIValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => {
    const aqi = props.aqi;
    if (aqi <= 50) return '#00e400';
    if (aqi <= 100) return '#ffff00';
    if (aqi <= 150) return '#ff7e00';
    if (aqi <= 200) return '#ff0000';
    if (aqi <= 300) return '#8f3f97';
    return '#7e0023';
  }};
  margin: 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const PollutantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  width: 100%;
`;

const PollutantItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.04);
  }
`;

const LoadingMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.98);
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  text-align: center;
  
  h3 {
    margin: 0 0 12px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  p {
    margin: 0;
    color: #666;
    font-size: 0.95rem;
  }
`;

const RecenterButton = styled.button`
  position: absolute;
  bottom: 24px;
  left: 24px;
  background: rgba(255, 255, 255, 0.98);
  border: none;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  
  &:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  svg {
    width: 24px;
    height: 24px;
    fill: #1a1a1a;
  }
`;

// Add this new styled component for the loading animation
const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #007aff;
  animation: spin 1s ease-in-out infinite;
  margin: 20px auto;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Update the CustomZoomControls styled component
const CustomZoomControls = styled.div`
  position: absolute;
  top: 120px;
  left: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.98);
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  
  button {
    width: 36px;
    height: 36px;
    border: none;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: #1a1a1a;
    font-size: 18px;
    font-weight: 600;
    
    &:hover {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-1px);
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
`;

// Delhi coordinates (fallback)
const DELHI_COORDINATES = [28.6139, 77.2090];

function ChangeView({ center, zoom, setIsZooming }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoom) {
      setIsZooming(true);
      map.flyTo(center, zoom, {
        duration: 3.5,
        easeLinearity: 0.25
      });
      
      // Reset zooming state after animation
      const timer = setTimeout(() => {
        setIsZooming(false);
      }, 3500);
      
      return () => clearTimeout(timer);
    }
  }, [center, zoom, map, setIsZooming]);

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
  const [currentZoom, setCurrentZoom] = useState(12);
  const [isZooming, setIsZooming] = useState(false);
  const [isAQIExpanded, setIsAQIExpanded] = useState(false);

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

  useEffect(() => {
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
  }, []);

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
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition([latitude, longitude]);
          setCurrentZoom(13);
          fetchAirQualityData(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please try again.');
        }
      );
    }
  };

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
        <NavTitle>Air Quality Monitor - India</NavTitle>
        <NavSearch>
          <SearchInput
            type="text"
            placeholder="Search location in India (city, state)..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <ClearButton onClick={handleClearSearch}>
              ✕
            </ClearButton>
          )}
          {isSearching && (
            <div style={{ 
              position: 'absolute',
              right: '40px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8e8e93',
              fontSize: '14px'
            }}>
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
          center={position}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          onClick={handleMapClick}
          zoomControl={false}
          preferCanvas={true}
        >
          <ChangeView center={position} zoom={currentZoom} setIsZooming={setIsZooming} />
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
        
        <CustomZoomControls>
          <button 
            onClick={() => {
              const newZoom = Math.min(currentZoom + 1, 19);
              setCurrentZoom(newZoom);
              // Use a more direct approach to update the map zoom
              const mapInstance = document.querySelector('.leaflet-container')._leaflet_map;
              if (mapInstance) {
                // Disable any ongoing animations
                if (mapInstance._animatingZoom) {
                  mapInstance._stopZoomAnim();
                }
                // Set zoom directly without animation
                mapInstance.setZoom(newZoom, { animate: false });
              }
            }} 
            title="Zoom in"
          >
            +
          </button>
          <button 
            onClick={() => {
              const newZoom = Math.max(currentZoom - 1, 4);
              setCurrentZoom(newZoom);
              // Use a more direct approach to update the map zoom
              const mapInstance = document.querySelector('.leaflet-container')._leaflet_map;
              if (mapInstance) {
                // Disable any ongoing animations
                if (mapInstance._animatingZoom) {
                  mapInstance._stopZoomAnim();
                }
                // Set zoom directly without animation
                mapInstance.setZoom(newZoom, { animate: false });
              }
            }} 
            title="Zoom out"
          >
            −
          </button>
        </CustomZoomControls>
        
        <RecenterButton onClick={handleRecenter} title="Recenter to your location">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </RecenterButton>
        
        {!isZooming && (
          <AQIPanel 
            expanded={isAQIExpanded}
            onClick={() => setIsAQIExpanded(!isAQIExpanded)}
          >
            {!airQualityData ? (
              <>
                <MainAQICircle aqi={0}>
                  <MainAQIValue>--</MainAQIValue>
                  <MainAQILabel>Loading AQI...</MainAQILabel>
                </MainAQICircle>
                <PollutantCircles>
                  <PollutantCircle index={0}>
                    <div>
                      <PollutantLabel>PM2.5</PollutantLabel>
                      <PollutantValue>--</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={1}>
                    <div>
                      <PollutantLabel>PM10</PollutantLabel>
                      <PollutantValue>--</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={2}>
                    <div>
                      <PollutantLabel>NO2</PollutantLabel>
                      <PollutantValue>--</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={3}>
                    <div>
                      <PollutantLabel>O3</PollutantLabel>
                      <PollutantValue>--</PollutantValue>
                    </div>
                  </PollutantCircle>
                </PollutantCircles>
              </>
            ) : !isAQIExpanded ? (
              <>
                <MainAQICircle aqi={airQualityData?.aqi || 0}>
                  <MainAQIValue>{airQualityData?.aqi || '--'}</MainAQIValue>
                  <MainAQILabel>AQI</MainAQILabel>
                </MainAQICircle>
                <PollutantCircles>
                  <PollutantCircle index={0}>
                    <div>
                      <PollutantLabel>PM2.5</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.pm2_5 || '--'}</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={1}>
                    <div>
                      <PollutantLabel>PM10</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.pm10 || '--'}</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={2}>
                    <div>
                      <PollutantLabel>NO2</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.no2 || '--'}</PollutantValue>
                    </div>
                  </PollutantCircle>
                  <PollutantCircle index={3}>
                    <div>
                      <PollutantLabel>O3</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.o3 || '--'}</PollutantValue>
                    </div>
                  </PollutantCircle>
                </PollutantCircles>
              </>
            ) : (
              <>
                <AQISection>
                  <AQITitle>Air Quality Index</AQITitle>
                  <AQIValue aqi={airQualityData?.aqi || 0}>
                    {airQualityData?.aqi || '--'}
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
                      <PollutantValue>{airQualityData?.pollutants?.pm2_5 || '--'}</PollutantValue>
                    </PollutantItem>
                    <PollutantItem>
                      <PollutantLabel>PM10</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.pm10 || '--'}</PollutantValue>
                    </PollutantItem>
                    <PollutantItem>
                      <PollutantLabel>NO2</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.no2 || '--'}</PollutantValue>
                    </PollutantItem>
                    <PollutantItem>
                      <PollutantLabel>O3</PollutantLabel>
                      <PollutantValue>{airQualityData?.pollutants?.o3 || '--'}</PollutantValue>
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
              </>
            )}
          </AQIPanel>
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
