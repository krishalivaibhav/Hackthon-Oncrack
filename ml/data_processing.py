import numpy as np
import rasterio
from rasterio.transform import from_origin
import geopandas as gpd
from shapely.geometry import Point
import pandas as pd
from datetime import datetime, timedelta

class SatelliteDataProcessor:
    def __init__(self, satellite_data_path, ground_stations_path):
        self.satellite_data_path = satellite_data_path
        self.ground_stations_path = ground_stations_path
        
    def load_satellite_data(self):
        """Load and preprocess satellite data"""
        with rasterio.open(self.satellite_data_path) as src:
            data = src.read(1)
            transform = src.transform
            crs = src.crs
            
        # Convert to numpy array and handle missing values
        data = np.where(data < 0, np.nan, data)
        return data, transform, crs
    
    def load_ground_stations(self):
        """Load ground station measurements"""
        stations = gpd.read_file(self.ground_stations_path)
        return stations
    
    def align_data(self, satellite_data, ground_stations, transform):
        """Align satellite data with ground station measurements"""
        aligned_data = []
        
        for _, station in ground_stations.iterrows():
            # Convert station coordinates to pixel coordinates
            x, y = station.geometry.x, station.geometry.y
            row, col = ~transform * (x, y)
            
            # Extract satellite data around the station
            window_size = 3
            row_start = max(0, int(row) - window_size)
            row_end = min(satellite_data.shape[0], int(row) + window_size + 1)
            col_start = max(0, int(col) - window_size)
            col_end = min(satellite_data.shape[1], int(col) + window_size + 1)
            
            window_data = satellite_data[row_start:row_end, col_start:col_end]
            if not np.all(np.isnan(window_data)):
                aligned_data.append({
                    'station_id': station['id'],
                    'latitude': y,
                    'longitude': x,
                    'satellite_value': np.nanmean(window_data),
                    'ground_value': station['measurement']
                })
        
        return pd.DataFrame(aligned_data)
    
    def create_high_res_grid(self, data, transform, target_resolution):
        """Create a higher resolution grid from the input data"""
        # Calculate the scaling factor
        current_resolution = transform[0]
        scale_factor = current_resolution / target_resolution
        
        # Create the new transform
        new_transform = from_origin(
            transform[2],  # x origin
            transform[5],  # y origin
            target_resolution,
            target_resolution
        )
        
        # Create the new grid
        new_shape = (
            int(data.shape[0] * scale_factor),
            int(data.shape[1] * scale_factor)
        )
        
        return new_shape, new_transform
    
    def process_time_series(self, start_date, end_date):
        """Process time series data for a given date range"""
        current_date = start_date
        processed_data = []
        
        while current_date <= end_date:
            # Load data for current date
            satellite_data, transform, crs = self.load_satellite_data()
            ground_stations = self.load_ground_stations()
            
            # Align and process data
            aligned_data = self.align_data(satellite_data, ground_stations, transform)
            aligned_data['date'] = current_date
            
            processed_data.append(aligned_data)
            current_date += timedelta(days=1)
        
        return pd.concat(processed_data, ignore_index=True)
    
    def save_processed_data(self, data, output_path):
        """Save processed data to a file"""
        data.to_csv(output_path, index=False) 