from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

class Location(Base):
    __tablename__ = 'locations'
    
    id = Column(Integer, primary_key=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float)
    name = Column(String)
    
    measurements = relationship("AirQualityMeasurement", back_populates="location")

class AirQualityMeasurement(Base):
    __tablename__ = 'air_quality_measurements'
    
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey('locations.id'))
    timestamp = Column(DateTime, nullable=False)
    aqi = Column(Float)
    pm2_5 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    o3 = Column(Float)
    co = Column(Float)
    so2 = Column(Float)
    source = Column(String)  # 'satellite', 'ground_station', 'model'
    
    location = relationship("Location", back_populates="measurements")

class Prediction(Base):
    __tablename__ = 'predictions'
    
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey('locations.id'))
    timestamp = Column(DateTime, nullable=False)
    prediction_horizon = Column(Integer)  # hours ahead
    aqi = Column(Float)
    pm2_5 = Column(Float)
    pm10 = Column(Float)
    no2 = Column(Float)
    o3 = Column(Float)
    confidence = Column(Float)
    
    location = relationship("Location")

def init_db():
    """Initialize the database connection and create tables"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/airquality')
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()

def get_db():
    """Get a database session"""
    Session = sessionmaker(bind=create_engine(os.getenv('DATABASE_URL')))
    session = Session()
    try:
        yield session
    finally:
        session.close()

def add_measurement(session, measurement_data):
    """Add a new air quality measurement to the database"""
    measurement = AirQualityMeasurement(**measurement_data)
    session.add(measurement)
    session.commit()
    return measurement

def get_measurements(session, location_id, start_time, end_time):
    """Get air quality measurements for a specific location and time range"""
    return session.query(AirQualityMeasurement).filter(
        AirQualityMeasurement.location_id == location_id,
        AirQualityMeasurement.timestamp >= start_time,
        AirQualityMeasurement.timestamp <= end_time
    ).all()

def add_prediction(session, prediction_data):
    """Add a new prediction to the database"""
    prediction = Prediction(**prediction_data)
    session.add(prediction)
    session.commit()
    return prediction

def get_predictions(session, location_id, start_time, end_time):
    """Get predictions for a specific location and time range"""
    return session.query(Prediction).filter(
        Prediction.location_id == location_id,
        Prediction.timestamp >= start_time,
        Prediction.timestamp <= end_time
    ).all() 