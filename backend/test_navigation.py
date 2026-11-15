import math
import unittest
from types import SimpleNamespace

from backend.navigation import shortest_route
from backend.mars_locations import MARS_RADIUS


def point(lon, lat):
    return SimpleNamespace(longitude=lon, latitude=lat)


class RouteTests(unittest.TestCase):
    def test_quarter_circumference(self):
        route = shortest_route(point(0, 0), point(90, 0))
        self.assertAlmostEqual(route['distance'], math.pi * MARS_RADIUS / 2)
        self.assertTrue(all(abs(p['latitude']) < 1e-8 for p in route['path']))

    def test_dateline_uses_short_arc(self):
        route = shortest_route(point(179, 0), point(-179, 0))
        self.assertAlmostEqual(route['distance'], math.radians(2) * MARS_RADIUS)
        self.assertTrue(all(abs(p['longitude']) >= 179 for p in route['path']))

    def test_identical_and_antipodal_points(self):
        for start, end in [(point(0, 0), point(0, 0)), (point(0, 0), point(180, 0)),
                           (point(0, 90), point(0, -90))]:
            route = shortest_route(start, end)
            self.assertTrue(math.isfinite(route['distance']))
            self.assertTrue(all(math.isfinite(p['latitude']) and math.isfinite(p['longitude'])
                                for p in route['path']))
            self.assertEqual(route['path'][-1]['latitude'], end.latitude)


if __name__ == '__main__':
    unittest.main()
