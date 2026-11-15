"use client";

import MarsDialogue from "./MarsDialogue";
import MarsLoader from "./MarsLoader";
import LocationDialogue from "./LocationDialogue";
import { LOCATION_FACTS } from "./locationFacts";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

const MARS_RADIUS = 3_396_190;
const MARS_ELLIPSOID = new Cesium.Ellipsoid(MARS_RADIUS, MARS_RADIUS, MARS_RADIUS);

// Closest the camera may get to the real (tiled) surface, in metres.
const MIN_SURFACE_CLEARANCE = 200;

const MARS_LOCATIONS = [
  {
    name: "Jezero Crater",
    description: "Perseverance landing site",
    longitude: 77.58,
    latitude: 18.38,
  },
  {
    name: "Gale Crater",
    description: "Curiosity rover landing site",
    longitude: 137.8,
    latitude: -5.4,
  },
  {
    name: "Olympus Mons",
    description: "Largest volcano in the Solar System",
    longitude: 226.2,
    latitude: 18.65,
  },
  {
    name: "Valles Marineris",
    description: "One of the largest canyon systems in the Solar System",
    longitude: 301.4123,
    latitude: -14.0059,
  },
  {
    name: "Hellas Planitia",
    description: "One of the largest impact basins on Mars",
    longitude: 70.5025,
    latitude: -42.4301,
  },
  {
    name: "Isidis Planitia",
    description: "Ancient impact basin",
    longitude: 88.0,
    latitude: 12.0,
  },
  {
    name: "Utopia Planitia",
    description: "Vast northern impact basin",
    longitude: 110.0,
    latitude: 45.0,
  },
  {
    name: "Elysium Planitia",
    description: "NASA InSight lander region",
    longitude: 154.7372,
    latitude: 2.979,
  },
  {
    name: "Arsia Mons",
    description: "Large shield volcano",
    longitude: 239.91,
    latitude: -8.26,
  },
  {
    name: "Pavonis Mons",
    description: "Equatorial shield volcano",
    longitude: 247.0,
    latitude: 0.0,
  },
  {
    name: "Ascraeus Mons",
    description: "Large shield volcano",
    longitude: 255.92,
    latitude: 11.92,
  },
  {
    name: "Alba Mons",
    description: "Vast volcanic formation",
    longitude: 249.29,
    latitude: 41.08,
  },
  {
    name: "Argyre Planitia",
    description: "Large southern impact basin",
    longitude: 320.0,
    latitude: -50.0,
  },
  {
    name: "Apollinaris Mons",
    description: "Ancient volcanic mountain",
    longitude: 174.793,
    latitude: -9.1712,
  },
  {
    name: "Elysium Mons",
    description: "Large shield volcano",
    longitude: 147.2138,
    latitude: 25.0232,
  },
];


type MarsLocation = (typeof MARS_LOCATIONS)[number];

// ==========================================
// ROTATE A VECTOR AROUND AN AXIS
// ==========================================

function rotateVector(
  vector: Cesium.Cartesian3,
  axis: Cesium.Cartesian3,
  angle: number,
): Cesium.Cartesian3 {
  const normalizedAxis = Cesium.Cartesian3.normalize(
    axis,
    new Cesium.Cartesian3(),
  );

  const quaternion = Cesium.Quaternion.fromAxisAngle(normalizedAxis, angle);

  const matrix = Cesium.Matrix3.fromQuaternion(quaternion);

  return Cesium.Matrix3.multiplyByVector(
    matrix,
    vector,
    new Cesium.Cartesian3(),
  );
}

// ==========================================
// MARS GLOBE COMPONENT
// ==========================================

export default function MarsGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  // Radius of the actual terrain under the camera (Mars is far from a perfect sphere:
  // poles ~20 km low, volcanoes 20+ km high). Updated by the surface probe.
  const surfaceRadiusRef = useRef(MARS_RADIUS);

  const [routeStart, setRouteStart] = useState(MARS_LOCATIONS[0].name);
  const [routeEnd, setRouteEnd] = useState(MARS_LOCATIONS[1].name);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeMessage, setRouteMessage] = useState("");
  const routeRequestRef = useRef(0);

  const planRoute = async () => {
    const requestId = ++routeRequestRef.current;
    setRouteBusy(true);
    setRouteMessage("");
    const viewer = viewerRef.current;
    viewer?.entities.removeById("planned-route");
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: MARS_LOCATIONS.find((location) => location.name === routeStart),
          end: MARS_LOCATIONS.find((location) => location.name === routeEnd),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Route request failed. Check that the backend is running.");
      const route: { path: { longitude: number; latitude: number }[]; distance: number } = await response.json();
      if (!viewer || viewer.isDestroyed() || requestId !== routeRequestRef.current) return;
      viewer.entities.add({
        id: "planned-route",
        polyline: {
          positions: route.path.map((point) => Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, 25000, MARS_ELLIPSOID)),
          width: 4,
          material: Cesium.Color.CYAN,
          arcType: Cesium.ArcType.NONE,
        },
      });
      setRouteMessage(`Distance: ${(route.distance / 1000).toFixed(1)} km`);
    } catch (err) {
      if (requestId === routeRequestRef.current) setRouteMessage(err instanceof Error ? err.message : "Unable to plan route.");
    } finally {
      if (requestId === routeRequestRef.current) setRouteBusy(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [achievement, setAchievement] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [menuDialogueOpen, setMenuDialogueOpen] = useState(false);
  const [menuHint, setMenuHint] = useState(false);
  const [factsOpen, setFactsOpen] = useState(false);
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  // Turn off every dialogue, hint and toast for the rest of the session
  const skipOnboarding = () => {
    setOnboardingSkipped(true);
    setDialogueOpen(false);
    setMenuHint(false);
    setMenuDialogueOpen(false);
    setFactsOpen(false);
    setAchievement(false);
  };

  const onboardingActive = dialogueOpen || menuHint || menuDialogueOpen;

  const finishLoading = () => {
    setLoaderDone(true);
    if (!error && !onboardingSkipped) {
      setAchievement(true);
      setDialogueOpen(true);
      const audio = new Audio("/audio/minecraftacheivement.mp3");
      audio.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(() => setAchievement(false), 4000);
    return () => clearTimeout(timer);
  }, [achievement]);

  const [selectedLocation, setSelectedLocation] = useState<MarsLocation | null>(
    null,
  );

  // ==========================================
  // INITIALIZE CESIUM
  // ==========================================

  useEffect(() => {
    let cancelled = false;
    let viewer: Cesium.Viewer | undefined;

    let inputCanvas: HTMLCanvasElement | undefined;

    let handleWheel: ((event: WheelEvent) => void) | undefined;

    let handlePointerDown: ((event: PointerEvent) => void) | undefined;

    let handlePointerMove: ((event: PointerEvent) => void) | undefined;

    let handlePointerUp: ((event: PointerEvent) => void) | undefined;

    let handlePointerCancel: (() => void) | undefined;
    let cursorObserver: MutationObserver | undefined;

    async function initializeMars() {
      try {
        const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

        if (!containerRef.current) return;

        window.CESIUM_BASE_URL = "/cesium/";

        if (token) Cesium.Ion.defaultAccessToken = token;

        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          baseLayerPicker: false,
          infoBox: false,
          selectionIndicator: false,
          scene3DOnly: true,
          baseLayer: false,
          ellipsoid: MARS_ELLIPSOID,
          globe: new Cesium.Globe(MARS_ELLIPSOID),
          skyAtmosphere: false,
          // Render at the screen's real pixel density (sharper on HiDPI displays)
          useBrowserRecommendedResolution: false,
          msaaSamples: 4,
        });

        viewerRef.current = viewer;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#b65d3a");
        viewer.scene.globe.showGroundAtmosphere = false;
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(77.58, 18.38, 4_000_000, MARS_ELLIPSOID),
        });

        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#080b16");

        // ======================================
        // CAMERA CONFIGURATION
        // ======================================

        const controller = viewer.scene.screenSpaceCameraController;

        controller.enableInputs = true;

        // Disable default rotation.
        // We will implement our own mouse rotation.
        controller.enableRotate = false;

        // Preserve other camera interactions.
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableTranslate = false;

        controller.enableCollisionDetection = false;

        // Keep native trackpad pinch zoom.
        controller.zoomEventTypes = [Cesium.CameraEventType.PINCH];

        controller.zoomFactor = 5.0;
        controller.minimumZoomDistance = 100;
        controller.maximumZoomDistance = 50_000_000;

        // ======================================
        // CUSTOM MOUSE DRAG ROTATION
        // ======================================

        const canvas = viewer.scene.canvas;

        inputCanvas = canvas;

        // Force custom CSS cursor by blocking Cesium's inline cursor changes
        cursorObserver = new MutationObserver(() => {
          if (canvas.style.cursor) canvas.style.cursor = "";
        });
        cursorObserver.observe(canvas, { attributes: true, attributeFilter: ["style"] });
        let isDragging = false;

        let lastX = 0;
        let lastY = 0;

        // Maximum close-up rotation sensitivity.
        const MAX_ZOOM_SENSITIVITY = 8;

        // Base rotation sensitivity.
        const BASE_ROTATION_SENSITIVITY = 0.0008;

        // --------------------------------------
        // POINTER DOWN
        // --------------------------------------

        handlePointerDown = (event: PointerEvent) => {
          // Only left mouse button.
          if (event.pointerType !== "mouse" || event.button !== 0) {
            return;
          }

          isDragging = true;

          lastX = event.clientX;
          lastY = event.clientY;

          canvas.setPointerCapture(event.pointerId);

          event.preventDefault();
        };

        // --------------------------------------
        // POINTER MOVE
        // --------------------------------------

        handlePointerMove = (event: PointerEvent) => {
          if (!isDragging || !viewer || viewer.isDestroyed()) {
            return;
          }

          const camera = viewer.camera;

          const deltaX = event.clientX - lastX;
          const deltaY = event.clientY - lastY;

          lastX = event.clientX;
          lastY = event.clientY;

          if (deltaX === 0 && deltaY === 0) return;

          // ------------------------------------
          // CALCULATE CAMERA ALTITUDE
          // ------------------------------------

          const distance = Cesium.Cartesian3.magnitude(camera.positionWC);

          const altitude = Math.max(distance - surfaceRadiusRef.current, 1);

          // ------------------------------------
          // ADAPTIVE ROTATION SENSITIVITY
          // ------------------------------------

          const zoomFactor = Math.min(
            MAX_ZOOM_SENSITIVITY,
            Math.max(1, Math.sqrt(MARS_RADIUS / altitude)),
          );

          const sensitivity = BASE_ROTATION_SENSITIVITY * zoomFactor;

          const horizontalAngle = -deltaX * sensitivity;

          const verticalAngle = deltaY * sensitivity;

          // ------------------------------------
          // GET CAMERA VECTORS
          // ------------------------------------

          let position = camera.positionWC.clone();
          let direction = camera.directionWC.clone();
          let up = camera.upWC.clone();
          let right = camera.rightWC.clone();

          // ------------------------------------
          // HORIZONTAL ROTATION
          // Rotate around Mars' north-south axis.
          // ------------------------------------

          const marsAxis = Cesium.Cartesian3.UNIT_Z;

          position = rotateVector(position, marsAxis, horizontalAngle);

          direction = rotateVector(direction, marsAxis, horizontalAngle);

          up = rotateVector(up, marsAxis, horizontalAngle);

          right = rotateVector(right, marsAxis, horizontalAngle);

          // ------------------------------------
          // VERTICAL ROTATION
          // Rotate around camera's right axis.
          // ------------------------------------

          position = rotateVector(position, right, verticalAngle);

          direction = rotateVector(direction, right, verticalAngle);

          up = rotateVector(up, right, verticalAngle);

          // ------------------------------------
          // APPLY CAMERA ROTATION
          // ------------------------------------

          camera.setView({
            destination: position,

            orientation: {
              direction,
              up,
            },
          });

          event.preventDefault();
        };

        // --------------------------------------
        // POINTER UP
        // --------------------------------------

        handlePointerUp = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;

          isDragging = false;

          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
        };

        // --------------------------------------
        // POINTER CANCEL
        // --------------------------------------

        handlePointerCancel = () => {
          isDragging = false;
        };

        // Register mouse events.
        canvas.addEventListener("pointerdown", handlePointerDown);

        canvas.addEventListener("pointermove", handlePointerMove);

        canvas.addEventListener("pointerup", handlePointerUp);

        canvas.addEventListener("pointercancel", handlePointerCancel);

        // ======================================
        // CUSTOM MOUSE / TRACKPAD WHEEL ZOOM
        // ======================================

        handleWheel = (event: WheelEvent) => {
          event.preventDefault();

          if (!viewer || viewer.isDestroyed()) return;

          const camera = viewer.camera;

          let delta = event.deltaY;

          // Normalize scroll values.
          if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            delta *= 16;
          } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            delta *= canvas.clientHeight;
          }

          if (Math.abs(delta) < 0.01) return;

          const distance = Cesium.Cartesian3.magnitude(camera.positionWC);

          const altitude = Math.max(distance - surfaceRadiusRef.current, 1);

          const sensitivity = 0.0015;

          const zoomFraction = 1 - Math.exp(-Math.abs(delta) * sensitivity);

          const minimumZoomStep = Math.min(altitude * 0.03, 10);

          const zoomAmount = Math.min(
            Math.max(altitude * zoomFraction, minimumZoomStep),
            altitude * 0.35,
          );

          if (delta < 0) {
            // Zoom IN.
            const maxZoomIn = Math.max(
              0,
              distance - surfaceRadiusRef.current - MIN_SURFACE_CLEARANCE,
            );

            camera.zoomIn(Math.min(zoomAmount, maxZoomIn));
          } else {
            // Zoom OUT.
            const maxZoomOut = Math.max(0, 50_000_000 - distance);

            camera.zoomOut(Math.min(zoomAmount, maxZoomOut));
          }
        };

        canvas.addEventListener("wheel", handleWheel, { passive: false });

        // ======================================
        // LOCATION VISIBILITY
        // ======================================

        const LABEL_VISIBLE_DISTANCE = 2_500_000;
        const MARKER_VISIBLE_DISTANCE = 8_000_000;

        // ======================================
        // LOAD MARS 3D TILES
        // ======================================

        // Allow more parallel tile downloads (default 6) so detail fills in faster
        Cesium.RequestScheduler.maximumRequestsPerServer = 18;

        // The local globe stays usable if optional ion imagery is unavailable.
        if (token) {
          const tileViewer = viewer;
          void (async () => {
            try {
              const mars = await Cesium.Cesium3DTileset.fromIonAssetId(
                Number(process.env.NEXT_PUBLIC_MARS_ION_ASSET_ID || 3644333),
                {
                  maximumScreenSpaceError: 6,
                  progressiveResolutionHeightFraction: 0.5,
                  foveatedScreenSpaceError: false,
                },
              );

              if (cancelled || tileViewer.isDestroyed()) {
                mars.destroy();
                return;
              }

              tileViewer.scene.primitives.add(mars);
              tileViewer.scene.globe.show = false;
            } catch (tileError) {
              console.warn("Mars tiles unavailable; using the base globe.", tileError);
            }
          })();
        }
        if (cancelled || viewer.isDestroyed()) return;

        // ======================================
        // SURFACE COLLISION
        // ======================================
        // Cast a ray from the camera to Mars' centre to find the real ground
        // below, and never let the camera go under it.

        const PROBE_RANGE = 80_000; // only probe when this close to the surface
        let probeFrame = 0;

        viewer.scene.preRender.addEventListener((scene) => {
          if (probeFrame++ % 3 !== 0) return;

          const camera = scene.camera;
          const distance = Cesium.Cartesian3.magnitude(camera.positionWC);

          if (distance > MARS_RADIUS + PROBE_RANGE) {
            surfaceRadiusRef.current = MARS_RADIUS;
            return;
          }

          const down = Cesium.Cartesian3.negate(
            Cesium.Cartesian3.normalize(camera.positionWC, new Cesium.Cartesian3()),
            new Cesium.Cartesian3(),
          );

          const hit = scene.pickFromRay(new Cesium.Ray(camera.positionWC, down));

          if (!hit?.position) return;

          const groundRadius = Cesium.Cartesian3.magnitude(hit.position);
          surfaceRadiusRef.current = groundRadius;

          const minDistance = groundRadius + MIN_SURFACE_CLEARANCE;

          if (distance < minDistance) {
            Cesium.Cartesian3.multiplyByScalar(
              Cesium.Cartesian3.normalize(camera.position, new Cesium.Cartesian3()),
              minDistance,
              camera.position,
            );
          }
        });

        // ======================================
        // ADD MARS LOCATIONS
        // ======================================

        MARS_LOCATIONS.forEach((location) => {
          viewer!.entities.add({
            name: location.name,

            position: Cesium.Cartesian3.fromDegrees(
              location.longitude,
              location.latitude,
              1000,
              MARS_ELLIPSOID,
            ),

            point: {
              pixelSize: 10,

              color: Cesium.Color.fromCssColorString("#ff7043"),

              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,

              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                MARKER_VISIBLE_DISTANCE,
              ),
            },

            label: {
              text: location.name,
              font: "14px sans-serif",

              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,

              style: Cesium.LabelStyle.FILL_AND_OUTLINE,

              pixelOffset: new Cesium.Cartesian2(0, -22),

              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
                0,
                LABEL_VISIBLE_DISTANCE,
              ),

              scaleByDistance: new Cesium.NearFarScalar(
                500_000,
                1.0,
                LABEL_VISIBLE_DISTANCE,
                0.5,
              ),
            },
          });
        });

        // ======================================
        // INITIAL CAMERA POSITION
        // ======================================

        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            77.58,
            18.38,
            4_000_000,
            MARS_ELLIPSOID,
          ),

          duration: 2,
        });


      } catch (err) {
        console.error("Mars initialization failed:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading Mars.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initializeMars();

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      cancelled = true;
      routeRequestRef.current++;

      if (inputCanvas) {
        cursorObserver?.disconnect();
        if (handleWheel) {
          inputCanvas.removeEventListener("wheel", handleWheel);
        }

        if (handlePointerDown) {
          inputCanvas.removeEventListener("pointerdown", handlePointerDown);
        }

        if (handlePointerMove) {
          inputCanvas.removeEventListener("pointermove", handlePointerMove);
        }

        if (handlePointerUp) {
          inputCanvas.removeEventListener("pointerup", handlePointerUp);
        }

        if (handlePointerCancel) {
          inputCanvas.removeEventListener("pointercancel", handlePointerCancel);
        }

      }

      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }

      viewerRef.current = null;
    };
  }, []);

  // ==========================================
  // CAMERA DISTANCE
  // ==========================================

  const getCameraDistance = () => {
    const camera = viewerRef.current?.camera;

    if (!camera) return null;

    return Cesium.Cartesian3.magnitude(camera.positionWC);
  };

  // ==========================================
  // ZOOM IN
  // ==========================================

  const zoomIn = () => {
    const camera = viewerRef.current?.camera;
    const distance = getCameraDistance();

    if (!camera || distance === null) return;

    const altitude = Math.max(distance - surfaceRadiusRef.current, 100);

    const zoomAmount = Math.max(Math.min(altitude * 0.2, 500_000), 25);

    const maxZoomIn = Math.max(
      0,
      distance - surfaceRadiusRef.current - MIN_SURFACE_CLEARANCE,
    );

    camera.zoomIn(Math.min(zoomAmount, maxZoomIn));
  };

  // ==========================================
  // ZOOM OUT
  // ==========================================

  const zoomOut = () => {
    const camera = viewerRef.current?.camera;
    const distance = getCameraDistance();

    if (!camera || distance === null) return;

    const altitude = Math.max(distance - surfaceRadiusRef.current, 100);

    const zoomAmount = Math.max(Math.min(altitude * 0.3, 500_000), 25);

    camera.zoomOut(zoomAmount);
  };

  // ==========================================
  // CAMERA ROTATION BUTTONS
  // ==========================================

  const rotateLeft = () => {
    viewerRef.current?.camera.rotateLeft(0.2);
  };

  const rotateRight = () => {
    viewerRef.current?.camera.rotateRight(0.2);
  };

  const rotateUp = () => {
    viewerRef.current?.camera.rotateUp(0.1);
  };

  const rotateDown = () => {
    viewerRef.current?.camera.rotateDown(0.1);
  };

  // ==========================================
  // RESET CAMERA
  // ==========================================

  const resetCamera = () => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        77.58,
        18.38,
        4_000_000,
        MARS_ELLIPSOID,
      ),

      duration: 2,
    });

    setSelectedLocation(null);
    setFactsOpen(false);
  };

  // ==========================================
  // FLY TO LOCATION
  // ==========================================

  const flyToLocation = (location: MarsLocation) => {
    const viewer = viewerRef.current;

    if (!viewer) return;

    setSelectedLocation(location);
    setFactsOpen(!onboardingSkipped);

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        location.longitude,
        location.latitude,
        150_000,
        MARS_ELLIPSOID,
      ),

      duration: 2,
    });

    setMenuOpen(false);
  };

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#080b16] text-white">
      {/* Cesium viewer */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Header */}
      <header className="absolute left-5 top-5 z-10">
        <h1 style={{ fontFamily: "MainFont, sans-serif", fontSize: "1.6rem", color: "white" }}>
          Mission: Mars
        </h1>
      </header>

      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen((open) => !open);
          if (menuHint) {
            setMenuHint(false);
            setMenuDialogueOpen(true);
          }
        }}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        className="absolute right-5 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#151a2a]/90 backdrop-blur-md transition hover:bg-orange-500"
      >
        <div className="flex w-5 flex-col gap-1.5">
          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />

          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "opacity-0" : ""
            }`}
          />

          <span
            className={`h-0.5 w-full bg-white transition-all ${
              menuOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </div>
      </button>

      {/* Menu hint: points at the hamburger after the dialogue */}
      {menuHint && !menuOpen && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-[72px] z-30 flex w-12 flex-col items-center text-white"
          style={{ fontFamily: "MainFont, sans-serif", animation: "menuHintBounce 1s ease-in-out infinite" }}
        >
          <svg width="28" height="36" viewBox="0 0 28 36" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
            <path d="M14 2 L26 16 H18 V34 H10 V16 H2 Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span className="mt-1 text-sm" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>menu</span>
        </div>
      )}

      {/* Backdrop */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 z-20 bg-black/40"
        />
      )}

      {/* Navigation drawer */}
      <aside
        style={{ fontFamily: "MainFont, sans-serif" }}
        className={`absolute right-0 top-0 z-20 flex h-full w-64 flex-col border-l border-neutral-200 bg-white text-neutral-900 transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-20 pb-6">
          <div className="mb-6 flex flex-col gap-2 text-sm">
            <h2>Route preview</h2>
            <label>From
              <select className="w-full border p-1" value={routeStart} onChange={(event) => setRouteStart(event.target.value)}>
                {MARS_LOCATIONS.map((location) => <option key={location.name}>{location.name}</option>)}
              </select>
            </label>
            <label>To
              <select className="w-full border p-1" value={routeEnd} onChange={(event) => setRouteEnd(event.target.value)}>
                {MARS_LOCATIONS.map((location) => <option key={location.name}>{location.name}</option>)}
              </select>
            </label>
            <button className="rounded bg-orange-600 p-2 text-white disabled:opacity-40" disabled={loading || routeBusy || !!error} onClick={planRoute}>
              {routeBusy ? "Planning…" : "Plan shortest route"}
            </button>
            <p className="text-xs text-neutral-500">Spherical distance preview. Terrain and hazards are not included.</p>
            <p role="status">{routeMessage}</p>
          </div>
          <h2 className="mb-3 text-xs text-neutral-400">Locations</h2>
          <ul className="flex flex-col">
            {MARS_LOCATIONS.map((location) => {
              const active = selectedLocation?.name === location.name;
              return (
                <li key={location.name}>
                  <button
                    type="button"
                    onClick={() => flyToLocation(location)}
                    disabled={loading}
                    className={`w-full border-b border-neutral-100 py-2.5 text-left text-sm transition-colors disabled:opacity-40 ${
                      active ? "text-black" : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    {active && <span className="mr-2">•</span>}
                    {location.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Bottom-left: selected location + move controls */}
      <div
        style={{ fontFamily: "MainFont, sans-serif" }}
        className="absolute bottom-6 left-5 z-10 flex flex-col items-start gap-2 text-neutral-900"
      >
        {/* Selected location */}
        {selectedLocation && !factsOpen && (
          <div className="max-w-xs rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="text-xl">{selectedLocation.name}</h2>
            <p className="mt-1 text-base text-neutral-500">{selectedLocation.description}</p>
            <p className="mt-2 text-sm text-neutral-400">
              {selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°
            </p>
          </div>
        )}

        {/* Move controls */}
        <div className="flex gap-2">
          <ButtonGroup>
            <ControlButton onClick={rotateLeft} disabled={loading} label="Rotate left">←</ControlButton>
            <ControlButton onClick={rotateUp} disabled={loading} label="Tilt up">↑</ControlButton>
            <ControlButton onClick={rotateDown} disabled={loading} label="Tilt down">↓</ControlButton>
            <ControlButton onClick={rotateRight} disabled={loading} label="Rotate right">→</ControlButton>
          </ButtonGroup>
          <ButtonGroup>
            <ControlButton onClick={resetCamera} disabled={loading} label="Reset view">Reset</ControlButton>
          </ButtonGroup>
          <ButtonGroup>
            <ControlButton onClick={zoomOut} disabled={loading} label="Zoom out">−</ControlButton>
            <ControlButton onClick={zoomIn} disabled={loading} label="Zoom in">+</ControlButton>
          </ButtonGroup>
        </div>
      </div>

      {/* Achievement toast */}
      <style>{`@font-face { font-family: 'MainFont'; src: url('/main.ttf'); } @keyframes menuHintBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } @keyframes achievementIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      {achievement && (
        <img
          src="/images/achievementinmars.png"
          alt="Achievement"
          style={{
            position: "absolute", top: 1, right: 72, zIndex: 50,
            width: 600, height: "auto",
            animation: "achievementIn 0.4s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        />
      )}

      {/* Post-load dialogue */}
      {dialogueOpen && <MarsDialogue onDone={() => { setDialogueOpen(false); setMenuHint(true); }} />}

      {/* Dialogue after the menu is first opened from the hint */}
      {menuDialogueOpen && (
        <MarsDialogue gifs={["/dialogues/mars/6.gif"]} onDone={() => setMenuDialogueOpen(false)} />
      )}

      {/* Location facts, Ren'Py style */}
      {factsOpen && !onboardingSkipped && selectedLocation && !dialogueOpen && !menuDialogueOpen && (
        <LocationDialogue
          key={selectedLocation.name}
          title={selectedLocation.name}
          lines={LOCATION_FACTS[selectedLocation.name] ?? [selectedLocation.description]}
          onDone={() => setFactsOpen(false)}
        />
      )}

      {/* Skip onboarding */}
      {onboardingActive && !onboardingSkipped && (
        <button
          type="button"
          onClick={skipOnboarding}
          style={{ fontFamily: "MainFont, sans-serif" }}
          className="absolute left-1/2 top-5 z-40 -translate-x-1/2 rounded-md border border-white/60 bg-black/50 px-4 py-1.5 text-sm text-white hover:bg-black/70"
        >
          Skip onboarding
        </button>
      )}

      {/* Loading overlay */}
      {!loaderDone && <MarsLoader ready={!loading} onFinish={finishLoading} />}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-x-5 bottom-5 z-50 mx-auto max-w-lg rounded-xl border border-red-500/30 bg-[#25151b] p-4">
          <p className="font-semibold text-red-400">Unable to load Mars</p>

          <p className="mt-2 break-words text-sm text-gray-300">{error}</p>
        </div>
      )}
    </main>
  );
}

// ==========================================
// REUSABLE CONTROL BUTTON
// ==========================================

function ButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex divide-x divide-neutral-200 overflow-hidden rounded bg-white shadow-sm">
      {children}
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 min-w-8 items-center justify-center px-2 text-sm text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
