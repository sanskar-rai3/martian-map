"""Spherical route previews. These do not model terrain or traversability."""
import math

try:
    from .mars_locations import MARS_RADIUS
except ImportError:
    from mars_locations import MARS_RADIUS


def shortest_route(start, end):
    def vector(point):
        lat, lon = map(math.radians, (point.latitude, point.longitude))
        return (math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))

    a, b = vector(start), vector(end)
    dot = max(-1.0, min(1.0, sum(x * y for x, y in zip(a, b))))
    angle = math.acos(dot)
    # Construct a tangent basis, including a deterministic antipodal route.
    tangent = tuple(y - dot * x for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in tangent))
    if norm < 1e-10:
        axis = (0, 0, 1) if abs(a[2]) < 0.9 else (1, 0, 0)
        projection = sum(x * y for x, y in zip(a, axis))
        tangent = tuple(y - projection * x for x, y in zip(a, axis))
        norm = math.sqrt(sum(x * x for x in tangent))
    tangent = tuple(x / norm for x in tangent)
    steps = max(1, math.ceil(angle / math.radians(1)))
    path = []
    for i in range(steps + 1):
        t = angle * i / steps
        v = tuple(math.cos(t) * x + math.sin(t) * y for x, y in zip(a, tangent))
        path.append({"longitude": math.degrees(math.atan2(v[1], v[0])),
                     "latitude": math.degrees(math.atan2(v[2], math.hypot(v[0], v[1])))})
    path[0] = {"longitude": start.longitude, "latitude": start.latitude}
    path[-1] = {"longitude": end.longitude, "latitude": end.latitude}
    return {"path": path, "distance": angle * MARS_RADIUS,
            "model": "spherical", "terrain_aware": False}
