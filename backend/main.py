
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow your Next.js frontend to access this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    from .mars_locations import MARS_RADIUS, MARS_LOCATIONS
    from .navigation import shortest_route
except ImportError:
    from mars_locations import MARS_RADIUS, MARS_LOCATIONS
    from navigation import shortest_route

from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    longitude: float = Field(ge=-180, le=360, allow_inf_nan=False)
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)


class RouteRequest(BaseModel):
    start: Coordinate
    end: Coordinate


@app.post("/api/route")
def get_route(request: RouteRequest):
    return shortest_route(request.start, request.end)


@app.get("/")
def home():
    return {"message": "Mars API is running"}

@app.get("/api/locations")
def get_locations():
    return {
        "radius": MARS_RADIUS,
        "locations": MARS_LOCATIONS
    }
