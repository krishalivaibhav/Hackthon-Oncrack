import pytest
from fastapi.testclient import TestClient
from main import app
from database import init_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Air Quality Mapping API"}

def test_get_air_quality(client):
    response = client.get("/api/air-quality/37.7749/-122.4194")
    assert response.status_code == 200
    data = response.json()
    assert "latitude" in data
    assert "longitude" in data
    assert "aqi" in data
    assert "pollutants" in data

def test_get_air_quality_history(client):
    response = client.get(
        "/api/air-quality/history/37.7749/-122.4194",
        params={
            "start_time": "2023-01-01T00:00:00Z",
            "end_time": "2023-01-02T00:00:00Z"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "location" in data
    assert "time_range" in data
    assert "data" in data

def test_get_air_quality_prediction(client):
    response = client.get(
        "/api/air-quality/prediction/37.7749/-122.4194",
        params={"hours_ahead": 24}
    )
    assert response.status_code == 200
    data = response.json()
    assert "location" in data
    assert "prediction_horizon" in data
    assert "predictions" in data

def test_invalid_coordinates(client):
    response = client.get("/api/air-quality/91/181")  # Invalid coordinates
    assert response.status_code == 422  # Validation error

def test_invalid_time_range(client):
    response = client.get(
        "/api/air-quality/history/37.7749/-122.4194",
        params={
            "start_time": "invalid",
            "end_time": "2023-01-02T00:00:00Z"
        }
    )
    assert response.status_code == 422  # Validation error 