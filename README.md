# Interplanetary Survival Guide: Martian Map

An interactive geospatial platform of the Martian surface, made by team **LOL (Larpers of Linux)** for the NASA Space Apps Challenge 2026.

## Project Overview

Interplanetary Survival Guide: Martian Map is an interactive Mars pathfinding and mapping platform that helps users and astronomers understand and navigate the Martian surface.

**Objective:** Transform Martian topographical datasets into an accessible, interactive guide.

## Challenge Information

- **Challenge:** Challenge 11 – Martian Map
- **Event:** NASA Space Apps Challenge 2026
- **Team:** LOL (Larpers of Linux)

## Problem Statement

- Understanding Martian terrain and geographical features
- Planning safe routes for exploration and transportation

## Our Solution

- Plan the safest and the shortest path
- Display important topographical regions of Mars
- Visualize the Martian surface in an interactive 3D mode

## Key Features

- 3D interactive map
- Safe route planning
- Short route planning
- Interactive navigation
- Animated loading screen
- Guide bot

## Tech Stack

- Next.js
- React.js
- CesiumJS
- Python
- Git and GitHub
- NASA Open Data

## Installation Guide

**Prerequisites:** [Node.js](https://nodejs.org) 18.18 or later

1. Clone the repository and move into it:

   ```bash
   git clone https://github.com/sanskar-rai3/martian-map
   cd martian-map/frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend and route planning

Run the API from the repository root in a separate terminal:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The frontend forwards `/api/*` to `http://127.0.0.1:8000`. Set
`BACKEND_URL` in `frontend/.env.local` if your API runs elsewhere, then restart Next.js.
Open the globe menu to choose two locations and plan a route.
Routes are shortest arcs on a sphere, measured in metres by the API. They are
previews only: no elevation, obstacles, or hazard dataset is loaded, so they do
not establish a safe or walkable route. The C++ grid engine remains a separate
experimental implementation; the preview API does not require compiling it.

The base globe works without an ion token. Detailed Mars tiles require
`NEXT_PUBLIC_CESIUM_ION_TOKEN` in `frontend/.env.local` with access to the Mars
asset. `NEXT_PUBLIC_MARS_ION_ASSET_ID` defaults to `3644333`. If tile loading
fails, the explorer keeps its plain Mars globe, locations, and route previews.

Run route calculation regression checks from the repository root:

```bash
python -m unittest backend.test_navigation
```

## Citations

- [NASA says Mars rover discovered potential biosignature last year](https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/)

## Team

- Royan Rai
- Sanskar Rai
- Ayush Shrestha
- Iroj Shakya
- Aastha Khanal
- Prastut Karki