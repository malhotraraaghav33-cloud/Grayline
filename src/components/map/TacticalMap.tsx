import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { CalculatedRoute } from '../../types';

interface TacticalMapProps {
  activeRoute?: CalculatedRoute | null;
  onSelectPatient?: (patientId: string) => void;
  onSelectFacility?: (facilityId: string) => void;
  heightClass?: string;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  activeRoute,
  onSelectPatient,
  onSelectFacility,
  heightClass = 'h-full'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const { 
    patients, 
    facilities, 
    hazards, 
    roadEdges, 
    roadNodes,
    selectedPatientId, 
    setSelectedPatientId,
    calculateRoute 
  } = useApp();

  // Layer toggles
  const [showPatients, setShowPatients] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [cursorCoords, setCursorCoords] = useState<{ lat: string; lng: string; elev: number }>({
    lat: '34°13\'44"N',
    lng: '118°27\'02"W',
    elev: 412
  });
  const [tileError, setTileError] = useState(false);

  // Sector 4 Center: ~34.215, -118.460
  const defaultCenter: [number, number] = [34.2150, -118.4600];
  const defaultZoom = 13;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Dark Matter tiles (tactical dark military styling)
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      // Attribution
      L.control.attribution({ position: 'bottomright', prefix: 'GRAYLINE Tactical Carto' }).addTo(map);

      // Cursor telemetry readout on mousemove
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        const latDeg = Math.floor(lat);
        const latMin = Math.floor((lat - latDeg) * 60);
        const latSec = Math.round(((lat - latDeg) * 60 - latMin) * 60);

        const absLng = Math.abs(lng);
        const lngDeg = Math.floor(absLng);
        const lngMin = Math.floor((absLng - lngDeg) * 60);
        const lngSec = Math.round(((absLng - lngDeg) * 60 - lngMin) * 60);

        // Approximate elevation derived from coords for tactical flavor
        const elev = Math.round(380 + (lat - 34.18) * 800 + Math.sin(lng * 100) * 40);

        setCursorCoords({
          lat: `${latDeg}°${latMin}'${latSec}"N`,
          lng: `${lngDeg}°${lngMin}'${lngSec}"W`,
          elev: Math.max(300, elev)
        });
      });

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Vector Overlays & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Draw Road Network
    const nodeMap = new Map(roadNodes.map(n => [n.id, n]));

    roadEdges.forEach(edge => {
      const from = nodeMap.get(edge.fromNodeId);
      const to = nodeMap.get(edge.toNodeId);
      if (!from || !to) return;

      const coords: [number, number][] = [[from.lat, from.lng], [to.lat, to.lng]];

      if (edge.isBlocked) {
        // Red dashed line for blocked road
        L.polyline(coords, {
          color: '#ffb4ab',
          weight: 4,
          dashArray: '6, 6',
          opacity: 0.9
        }).bindPopup(`
          <div style="font-family:'Space_Mono',monospace; font-size:11px;">
            <div style="color:#ffb4ab; font-weight:bold;">BLOCKED ROADWAY: ${edge.name}</div>
            <div style="color:#c6c7bc; margin-top:2px;">Reason: ${edge.blockedReason || 'Hazards impassable'}</div>
          </div>
        `).addTo(group);
      } else {
        // Normal tactical road
        L.polyline(coords, {
          color: '#45483f',
          weight: 3,
          opacity: 0.7
        }).addTo(group);

        L.polyline(coords, {
          color: '#909287',
          weight: 1,
          opacity: 0.5
        }).addTo(group);
      }
    });

    // 2. Draw Active Evac Route Corridor (Dijkstra route)
    const effectiveRoute = activeRoute || calculateRoute(selectedPatientId === 'P-112' ? 'CAS-112' : 'CAS-104', 'MED-01', true);
    if (effectiveRoute && effectiveRoute.isViable && effectiveRoute.pathCoordinates.length > 1) {
      // Animated dashed polyline
      L.polyline(effectiveRoute.pathCoordinates, {
        color: '#dbe7c3',
        weight: 3.5,
        dashArray: '8, 8',
        opacity: 0.95
      }).addTo(group);
    }

    // 3. Draw Hazard Overlays
    if (showHazards) {
      hazards.forEach(hazard => {
        if (hazard.status !== 'ACTIVE') return;

        const isCollapse = hazard.category === 'STRUCTURAL';
        const color = hazard.severity === 'HIGH' ? '#ffb4ab' : '#d2c6a4';
        const fillColor = hazard.severity === 'HIGH' ? '#93000a' : '#51482f';

        const circle = L.circle([hazard.lat, hazard.lng], {
          radius: hazard.radiusMeters,
          color,
          weight: 1.5,
          fillColor,
          fillOpacity: 0.35,
          dashArray: '4, 4'
        });

        circle.bindPopup(`
          <div style="font-family:'Space_Mono',monospace; font-size:11px;">
            <div style="color:${color}; font-weight:bold;">${hazard.code}: ${hazard.title}</div>
            <div style="color:#e0e4dc; margin:4px 0;">${hazard.description}</div>
            <div style="color:#909287; font-size:10px;">Status: ${hazard.verificationStatus} // ${hazard.severity} SEVERITY</div>
          </div>
        `);
        circle.addTo(group);

        // Custom Hazard Flag Marker
        const iconHtml = `
          <div style="
            background: rgba(11,15,11,0.9);
            border: 1px solid ${color};
            padding: 2px 4px;
            font-family: 'Space_Mono', monospace;
            font-size: 9px;
            color: ${color};
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.8);
          ">
            ⚠️ ${hazard.code}
          </div>
        `;
        const markerIcon = L.divIcon({
          html: iconHtml,
          className: 'tactical-hazard-label',
          iconSize: [60, 20],
          iconAnchor: [30, 25]
        });
        L.marker([hazard.lat, hazard.lng], { icon: markerIcon }).addTo(group);
      });
    }

    // 4. Draw Facilities
    if (showFacilities) {
      facilities.forEach(facility => {
        const isSelected = facility.id === 'MED-01';
        const capPercent = Math.round((facility.occupiedBeds / facility.totalCapacity) * 100);
        const freeBeds = facility.totalCapacity - facility.occupiedBeds;
        const color = facility.status === 'CRITICAL_CAPACITY' ? '#ffb4ab' : 
                      facility.status === 'SURGE_WARNING' ? '#d2c6a4' : '#bfcba8';

        const iconHtml = `
          <div style="
            background: #191d18;
            border: 2px solid ${color};
            padding: 3px 6px;
            font-family: 'Space_Mono', monospace;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.9);
            cursor: pointer;
          ">
            <span style="font-size: 14px;">🏥</span>
            <div>
              <div style="font-size: 9px; font-weight:bold; color: ${color}; white-space: nowrap;">${facility.id}: ${facility.code}</div>
              <div style="font-size: 8px; color: #c6c7bc; white-space: nowrap;">${freeBeds} BEDS FREE // ${capPercent}% CAP</div>
            </div>
          </div>
        `;

        const facIcon = L.divIcon({
          html: iconHtml,
          className: 'tactical-facility-marker',
          iconSize: [140, 36],
          iconAnchor: [70, 18]
        });

        const marker = L.marker([facility.lat, facility.lng], { icon: facIcon }).addTo(group);
        marker.on('click', () => {
          if (onSelectFacility) onSelectFacility(facility.id);
        });

        marker.bindPopup(`
          <div style="font-family:'Space_Mono',monospace; font-size:11px;">
            <div style="color:${color}; font-weight:bold;">${facility.name} (${facility.id})</div>
            <div style="color:#e0e4dc; margin:4px 0;">Occupancy: ${facility.occupiedBeds}/${facility.totalCapacity} (${capPercent}%)</div>
            <div style="color:#bfcba8;">ICU Beds: ${facility.icuOccupied}/${facility.icuCapacity} | Surg Theaters: ${facility.surgicalTheaters}</div>
            <div style="color:#909287; font-size:10px; margin-top:3px;">Specialties: ${facility.specialties.join(', ')}</div>
          </div>
        `);
      });
    }

    // 5. Draw Patient Markers
    if (showPatients) {
      patients.forEach(patient => {
        const isSelected = patient.id === selectedPatientId;
        const isCritical = patient.triagePriority === 'CRITICAL';
        const isPriority = patient.triagePriority === 'PRIORITY';
        const color = isCritical ? '#ffb4ab' : isPriority ? '#d2c6a4' : '#bfcba8';
        const bg = isCritical ? '#93000a' : isPriority ? '#51482f' : '#2a341b';

        // Pulse ring for critical or selected patient
        const pulseRing = (isCritical || isSelected) ? `
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 2px solid ${color};
            animation: pulse-ring 2s infinite;
            pointer-events: none;
          "></div>
        ` : '';

        const iconHtml = `
          <div style="position: relative; cursor: pointer;">
            ${pulseRing}
            <div style="
              width: 16px;
              height: 16px;
              background-color: ${bg};
              border: 2px solid ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Space_Mono', monospace;
              font-size: 9px;
              font-weight: bold;
              color: #ffffff;
            ">
              ${isCritical ? '!' : '●'}
            </div>
            <div style="
              position: absolute;
              left: 20px;
              top: -2px;
              background: #0b0f0b;
              border: 1px solid ${color};
              padding: 1px 4px;
              font-family: 'Space_Mono', monospace;
              font-size: 9px;
              color: ${color};
              font-weight: bold;
              white-space: nowrap;
            ">
              ${patient.id} [${patient.triagePriority.slice(0, 4)} / HR ${patient.heartRate}]
            </div>
          </div>
        `;

        const patIcon = L.divIcon({
          html: iconHtml,
          className: 'tactical-patient-marker',
          iconSize: [20, 20],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([patient.lat, patient.lng], { icon: patIcon }).addTo(group);
        marker.on('click', () => {
          setSelectedPatientId(patient.id);
          if (onSelectPatient) onSelectPatient(patient.id);
        });

        marker.bindPopup(`
          <div style="font-family:'Space_Mono',monospace; font-size:11px;">
            <div style="color:${color}; font-weight:bold; border-bottom: 1px solid #45483f; padding-bottom:3px;">
              CASUALTY: ${patient.id} (${patient.callsign || 'INFANTRY'})
            </div>
            <div style="color:#e0e4dc; font-size:10px; margin:4px 0;">
              ${patient.injurySummary}
            </div>
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 4px; background:#191d18; padding:4px; margin-top:4px; text-align:center;">
              <div><span style="font-size:8px; color:#909287;">HR</span><br/><strong style="color:${isCritical ? '#ffb4ab' : '#e0e4dc'};">${patient.heartRate}</strong></div>
              <div><span style="font-size:8px; color:#909287;">SpO2</span><br/><strong style="color:${patient.spO2 < 90 ? '#ffb4ab' : '#e0e4dc'};">${patient.spO2}%</strong></div>
              <div><span style="font-size:8px; color:#909287;">BP</span><br/><strong>${patient.systolicBP}/${patient.diastolicBP}</strong></div>
              <div><span style="font-size:8px; color:#909287;">RR</span><br/><strong>${patient.respiratoryRate}</strong></div>
            </div>
            <div style="color:#d2c6a4; font-size:9px; margin-top:4px;">
              Triage Hit: ${patient.triageRuleHits.join(', ') || 'RULE-09'}
            </div>
          </div>
        `);
      });
    }
  }, [
    patients, 
    facilities, 
    hazards, 
    roadEdges, 
    roadNodes, 
    showPatients, 
    showFacilities, 
    showHazards, 
    selectedPatientId, 
    activeRoute,
    calculateRoute,
    onSelectPatient,
    onSelectFacility,
    setSelectedPatientId
  ]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => mapInstanceRef.current?.setView(defaultCenter, defaultZoom);
  const handleFitBounds = () => {
    if (mapInstanceRef.current && roadNodes.length > 0) {
      const bounds = L.latLngBounds(roadNodes.map(n => [n.lat, n.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  return (
    <div className={`w-full ${heightClass} relative bg-[#121612] topo-grid overflow-hidden flex flex-col select-none`}>
      {/* Top Map Command Overlay Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-[400] flex flex-wrap justify-between items-center pointer-events-none gap-2">
        {/* Sector Legend Tag */}
        <div className="pointer-events-auto bg-[#1d211c]/95 border border-[#45483f] px-2.5 py-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#ffb4ab]"></span>
          <span className="font-['Space_Mono'] text-[11px] text-[#e0e4dc] font-bold">
            SECTOR 4: ORCHARD VALLEY / HWY 12 CORRIDOR
          </span>
          <span className="text-[#909287] text-[11px] hidden sm:inline">|</span>
          <span className="font-['Space_Mono'] text-[11px] text-[#bfcba8] hidden sm:inline">
            GRID: 34.201°N 118.470°W
          </span>
        </div>

        {/* Layer Toggles */}
        <div className="pointer-events-auto flex items-center bg-[#1d211c]/95 border border-[#45483f] shadow-sm">
          <button 
            onClick={() => setShowPatients(!showPatients)}
            className={`px-2 py-1 border-r border-[#45483f] font-['Space_Mono'] text-[10px] flex items-center gap-1 transition-colors ${
              showPatients ? 'text-[#bfcba8] bg-[#596447]/40 font-bold' : 'text-[#909287] hover:bg-[#272b26]'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">person_pin</span>
            PATIENTS [{patients.length}]
          </button>

          <button 
            onClick={() => setShowFacilities(!showFacilities)}
            className={`px-2 py-1 border-r border-[#45483f] font-['Space_Mono'] text-[10px] flex items-center gap-1 transition-colors ${
              showFacilities ? 'text-[#bfcba8] bg-[#596447]/40 font-bold' : 'text-[#909287] hover:bg-[#272b26]'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">local_hospital</span>
            FACILITIES [{facilities.length}]
          </button>

          <button 
            onClick={() => setShowHazards(!showHazards)}
            className={`px-2 py-1 border-r border-[#45483f] font-['Space_Mono'] text-[10px] flex items-center gap-1 transition-colors ${
              showHazards ? 'text-[#d2c6a4] bg-[#51482f]/40 font-bold' : 'text-[#909287] hover:bg-[#272b26]'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">warning</span>
            HAZARDS [{hazards.filter(h => h.status === 'ACTIVE').length}]
          </button>

          <button 
            onClick={() => setShowContours(!showContours)}
            className={`px-2 py-1 font-['Space_Mono'] text-[10px] flex items-center gap-1 transition-colors ${
              showContours ? 'text-[#e0e4dc] bg-[#272b26]' : 'text-[#909287] hover:bg-[#272b26]'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">layers</span>
            CONTOURS
          </button>
        </div>
      </div>

      {/* Primary Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Offline / Tile Fallback Banner if tile fetching fails */}
      {tileError && (
        <div className="absolute top-12 left-2 z-[400] bg-[#1d211c] border border-[#ffb4ab] p-2 text-[#ffb4ab] font-['Space_Mono'] text-[10px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">cloud_off</span>
          <span>External Map Tiles unreachable. Tactical Vector Layer active in offline demo mode.</span>
        </div>
      )}

      {/* SVG Contour Line Simulation Overlay (visible when contours toggled) */}
      {showContours && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#45483f]/30 z-[300]" xmlns="http://www.w3.org/2000/svg">
          <path d="M-50,150 Q180,80 340,190 T700,120 T1100,260" fill="none" opacity="0.3" strokeDasharray="2 3" strokeWidth="1" />
          <path d="M-50,220 Q220,150 420,240 T800,190 T1100,320" fill="none" opacity="0.3" strokeDasharray="2 3" strokeWidth="1" />
          <path d="M-50,340 Q150,290 380,360 T750,300 T1100,410" fill="none" opacity="0.3" strokeDasharray="2 3" strokeWidth="1" />
          <path d="M-50,460 Q260,390 510,480 T900,420 T1100,530" fill="none" opacity="0.3" strokeDasharray="2 3" strokeWidth="1" />
        </svg>
      )}

      {/* Bottom Left HUD: Tactical Reticle Coordinates & Scale */}
      <div className="absolute bottom-2 left-2 z-[400] bg-[#0b0f0b]/90 border border-[#45483f] p-2 font-['Space_Mono'] text-[10px] space-y-1 backdrop-blur-none">
        <div className="flex items-center gap-2">
          <span className="text-[#909287]">CURSOR:</span>
          <span className="text-[#bfcba8] font-bold">{cursorCoords.lat} {cursorCoords.lng}</span>
          <span className="text-[#909287]">ELEV: {cursorCoords.elev}M</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#909287]">CORRIDOR A*:</span>
          <span className="text-[#bfcba8]">CLEAR (VIA BYPASS 4C)</span>
          <span className="text-[#909287]">ETA: 14 MIN</span>
        </div>
        {/* Scale Bar */}
        <div className="flex items-center gap-2 pt-1 border-t border-[#45483f]">
          <div className="w-16 h-1 bg-[#909287] flex justify-between">
            <div className="w-0.5 h-2 bg-[#909287] -mt-0.5"></div>
            <div className="w-0.5 h-2 bg-[#909287] -mt-0.5"></div>
          </div>
          <span className="text-[9px] text-[#909287]">2.0 KM</span>
        </div>
      </div>

      {/* Bottom Right HUD: Map Navigation Quick Buttons */}
      <div className="absolute bottom-2 right-2 z-[400] flex flex-col gap-1">
        <button 
          onClick={handleZoomIn}
          className="w-7 h-7 bg-[#1d211c] border border-[#45483f] text-[#e0e4dc] hover:bg-[#272b26] flex items-center justify-center font-bold text-sm"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-7 h-7 bg-[#1d211c] border border-[#45483f] text-[#e0e4dc] hover:bg-[#272b26] flex items-center justify-center font-bold text-sm"
          title="Zoom Out"
        >
          -
        </button>
        <button 
          onClick={handleRecenter}
          className="w-7 h-7 bg-[#1d211c] border border-[#45483f] text-[#e0e4dc] hover:bg-[#272b26] flex items-center justify-center" 
          title="Recenter Sector 4"
        >
          <span className="material-symbols-outlined text-[16px]">filter_center_focus</span>
        </button>
        <button 
          onClick={handleFitBounds}
          className="w-7 h-7 bg-[#1d211c] border border-[#45483f] text-[#e0e4dc] hover:bg-[#272b26] flex items-center justify-center" 
          title="Fit All Casualties"
        >
          <span className="material-symbols-outlined text-[16px]">crop_free</span>
        </button>
      </div>
    </div>
  );
};
