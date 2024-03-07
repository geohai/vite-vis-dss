import {useState, useEffect} from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer} from '@deck.gl/layers';
import {H3HexagonLayer, S2Layer} from '@deck.gl/geo-layers';
import {GridLayer, HeatmapLayer} from '@deck.gl/aggregation-layers';
import {interpolateRdBu, interpolateRdPu} from 'd3-scale-chromatic';
import {csv} from 'd3-fetch';


// const DATA_URL = 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/';
const DATA_URL = 'data/';
const EVERYTHING_URL = DATA_URL + 'json/P13U.json'
const LINES_URL = DATA_URL + 'json/lines.geo.json';
const BUSES_URL = DATA_URL + 'json/buses.geo.json';
const BUSES_URL_2 = DATA_URL + 'json/buses.json';
const H3_URL = DATA_URL + 'json/h3r10.json';
const S2_URL = DATA_URL + 'json/s2r17.json';
const VORONOI_URL = DATA_URL + 'json/voronoi.geo.json';
const CONTOUR_URL = DATA_URL + 'json/contours.json'
const EV_STATIONS_URL = DATA_URL + 'json/evstations.geo.json'
const PV_URL = DATA_URL + 'json/pv.geo.json'
const STORAGE_URL = DATA_URL + 'json/storage.geo.json'
const TX_URL = DATA_URL + 'json/tx.geo.json'
const BUS_VOLTAGE_URL = DATA_URL + 'csv/bus_voltages_all.csv';
const TIMESTEPS_URL = DATA_URL + 'csv/time_steps.csv';

// style map
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = {
  latitude: 37.78,
  longitude: -122.242,
  zoom: 12.6,
  maxZoom: 20,
  pitch: 60,
  bearing: 0
};
const toRGBArray = rgbStr => rgbStr.match(/\d+/g).map(Number);
const RDBU_COLOR_SCALE = v => toRGBArray(interpolateRdBu(v));
const RDPU_COLOR_SCALE = v => toRGBArray(interpolateRdPu(v));
const getTooltip = ({object}) => JSON.stringify(object);
const range = n => [...Array(n).keys()]
const RdBuDiscrete = range(102).map(i => RDBU_COLOR_SCALE(1-i/101));

// primary component
export default function App() {
  const [viewLines, toggleLines] = useState(false);
  const [viewBuses, toggleBuses] = useState(false);
  const [viewGlyphs, toggleGlyphs] = useState(false);
  const [viewH3, toggleH3] = useState(false);
  const [viewS2, toggleS2] = useState(false);
  const [viewVoronoi, toggleVoronoi] = useState(false);
  const [viewContours, toggleContours] = useState(false);
  const [viewHeatmap, toggleHeatmap] = useState(false);
  const [viewCurrents, toggleCurrents] = useState(false);
  const [viewEVStations, toggleEVStations] = useState(false);
  const [viewPV, togglePV] = useState(false);
  const [viewStorage, toggleStorage] = useState(false);
  const [viewTX, toggleTX] = useState(false);
  
  const [timestep, setTimestep] = useState(0);
  const [allVoltages, setAllVoltages] = useState([]);
  const [datetimes, setDatetimes] = useState([]);
  const [currentVoltages, setCurrentVoltages] = useState([]);
  
  const [animate, setAnimate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(16);

  // effect to fetch all data at the start of the app
  useEffect(() => { 
    const fetchData = async () => {
      setLoading(true);
      const v = await csv(BUS_VOLTAGE_URL);
      console.log("Fetched the full voltage data: ", v)
      setAllVoltages(v);

      const t = await csv(TIMESTEPS_URL);
      console.log("Fetched timesteps", t)
      setDatetimes(t);
      setLoading(false);
    };
    fetchData();
  }, []);

  // effect to fetch Voltages for current timestep
  useEffect(() => {
    const getVoltagesByTimestep = (timestep) => {
      return allVoltages[timestep];
    };
    setCurrentVoltages(getVoltagesByTimestep(timestep));
  }, [allVoltages, timestep]);
  
  // function to update the timestep when buttons are clicked
  const stepTime = (hours) => {
    const mod = datetimes.length;
    const new_timestep = (timestep + hours) % mod;
    const new_positive_timestep = (new_timestep + mod) % mod
    setTimestep(new_positive_timestep);
  };

  // effect to animate the timestep
  useEffect(() => {
    if (animate) {
      const interval = setInterval(() => {
        setTimestep((timestep + 1) % 288)
      }, 1000/speed)
      return () => clearInterval(interval)
    }
  }, [animate, timestep, speed])

  // layers
  const everythingLayer = new GeoJsonLayer({
    // types: Node, Load, Capacitor, Line, Storage, PVSystem, Transformer
    id: 'everything',
    data: EVERYTHING_URL,
    opacity: 1.0,
    getLineColor: [255, 255, 255, 63],
    getLineWidth: f => {
      if (f.properties.type == "Line") {
        return 2
      }
      return 0
    },
    filled: true,
    pointType: 'circle',
    radiusUnits: 'meters',
    getPointRadius: f => {
      if (f.properties.bus == "Node") {
        var voltage = +f.properties.peak_voltage
        return 10000 * Math.abs(voltage-1)
      }
      return 2
    },
    getFillColor: f => {
      if (f.properties.type == "Node") {
        var voltage = +f.properties.peak_voltage;
        return RDBU_COLOR_SCALE(-20*(voltage-1) + 0.5)
      }
      return [0, 0, 0, 0]
    },
    pickable: true,
    visible: true
  })

  const lineLayer = new GeoJsonLayer({
    id: 'lines',
    data: LINES_URL,
    opacity: 0.1,
    getLineColor: [255, 255, 255],
    getLineWidth: 2,
    pickable: true,
    visible: viewLines
  })

  const busLayer = new GeoJsonLayer({
    id: 'buses',
    data: BUSES_URL,
    opacity: 0.1,
    filled: true,
    pointType: 'circle',
    radiusUnits: 'meters',
    getPointRadius: 4,
    getFillColor: [255, 255, 255],
    getLineWidth: 0,
    pickable: true,
    visible: viewBuses
  })

  const glyphLayer = new GeoJsonLayer({
      id: 'glyphs',
      data: BUSES_URL,
      opacity: 0.8,
      filled: true,
      pointType: 'circle',
      pointRadiusMaxPixels: 50,
      radiusUnits: 'meters',
      getPointRadius: f => {
        var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
        return 400 * Math.abs(voltage-1.01)
      },
      getFillColor: f => {
        var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
        return RDBU_COLOR_SCALE(-20*(voltage-1) + 0.5)
      },
      updateTriggers: {
        getFillColor: [currentVoltages, loading],
        getPointRadius: [currentVoltages, loading]
      },
      getLineWidth: 0,
      pickable: true,
      visible: viewGlyphs
    })

  const h3Layer = new H3HexagonLayer({
    id: 'h3-1',
    data: H3_URL,
    opacity: 0.6,
    filled: true,
    extruded: false,
    getHexagon: d => d.h3,
    getFillColor: d => RDBU_COLOR_SCALE(-20*(d.voltage-1) + 0.5),
    getLineWidth: 0,
    visible: viewH3
  })

  const s2Layer = new S2Layer({
    id: 's2-1',
    data: S2_URL,
    opacity: 0.6,
    filled: true,
    extruded: false,
    getS2Token: d => d.s2,
    getFillColor: d => RDBU_COLOR_SCALE(-20*(d.voltage-1) + 0.5),
    getLineWidth: 0,
    visible: viewS2
  })

  const voronoiLayer = new GeoJsonLayer({
    id: 'voronoi',
    data: VORONOI_URL,
    opacity: 0.6,
    filled: true,
    getFillColor: f => {
      var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
      return RDBU_COLOR_SCALE(-20*(voltage-1) + 0.5)
    },
    updateTriggers: {
      getFillColor: [currentVoltages, loading],
    },
    getLineWidth: 0,
    pickable: true,
    visible: viewVoronoi
  })

  const contourLayer = new GridLayer({
    id: 'contours',
    data: CONTOUR_URL,
    opacity: 0.8,
    cellSize: 14,
    getPosition: d => d.geometry.coordinates,
    getColorWeight: d => d.properties.voltage,
    colorDomain: [0.975, 1.025],
    colorRange: RdBuDiscrete,
    colorAggregation: 'MEAN',
    pickable: true,
    visible: viewContours
  })

  const heatmapLayer = new HeatmapLayer({
    id: 'heatmap',
    data: BUSES_URL_2,
    radiusPixels: 100,
    colorRange: [
      [5,48,97],
      [33,102,172],
      [67,147,195],
      [146,197,222],
      [209,229,240],
      [247,247,247],
      [253,219,199],
      [244,165,130],
      [214,96,77],
      [178,24,43],
      [103,0,31]
    ],
    intensity: 1,
    colorDomain: [0, 5],
    weightsTextureSize: 256,
    getPosition: d => {
      var coord = d.geometry.coordinates;
      return coord
    },
    getWeight: f => {
      var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
      // console.log(voltage)
      return voltage
    },
    aggregation: 'SUM',
    updateTriggers: {
      getWeight: currentVoltages,
    },
    visible: viewHeatmap
  })

  const currentLayer = new GeoJsonLayer({
    id: 'currents',
    data: LINES_URL,
    opacity: 1,
    getLineColor: f => RDPU_COLOR_SCALE(f.properties.current),
    getLineWidth: 2,
    pickable: true,
    visible: viewCurrents
  })

  const evStationLayer = new GeoJsonLayer({
    id: 'evStations',
    data: EV_STATIONS_URL,
    opacity: 0.5,
    pointType: 'icon',
    iconAtlas: 'ev-charge-icon.png',
    iconMapping: {marker: {
      x: 0, 
      y: 0, 
      width: 250, 
      height: 337, 
      mask: false,
      anchorY: 337,
    }},
    getIcon: () => 'marker',
    getIconSize: 2,
    iconSizeScale: 30,
    iconSizeUnits: 'meters',
    iconBillboard: true,
    pickable: true,
    visible: viewEVStations
  })

  const pvLayer = new GeoJsonLayer({
    id: 'pv',
    data: PV_URL,
    opacity: 0.5,
    pointType: 'icon',
    iconAtlas: 'pv.png',
    iconMapping: {marker: {
      x: 0, 
      y: 0, 
      width: 512, 
      height: 412, 
      mask: false,
      anchorY: 412,
    }},
    getIcon: () => 'marker',
    getIconSize: 0.3,
    iconSizeScale: 30,
    iconSizeUnits: 'meters',
    iconBillboard: true,
    pickable: true,
    visible: viewPV
  })

  const storageLayer = new GeoJsonLayer({
    id: 'storage',
    data: STORAGE_URL,
    opacity: 0.5,
    pointType: 'icon',
    iconAtlas: 'storage.png',
    iconMapping: {marker: {
      x: 0, 
      y: 0, 
      width: 512, 
      height: 390, 
      mask: false,
      anchorY: 390,
    }},
    getIcon: () => 'marker',
    getIconSize: 0.7,
    iconSizeScale: 30,
    iconSizeUnits: 'meters',
    iconBillboard: true,
    pickable: true,
    visible: viewStorage
  })

  const txLayer = new GeoJsonLayer({
    id: 'tx',
    data: TX_URL,
    opacity: 0.5,
    pointType: 'icon',
    iconAtlas: 'tx.png',
    iconMapping: {marker: {
      x: 0, 
      y: 0, 
      width: 800, 
      height: 600, 
      mask: false,
      anchorY: 600,
    }},
    getIcon: () => 'marker',
    getIconSize: 0.3,
    iconSizeScale: 30,
    iconSizeUnits: 'meters',
    iconBillboard: true,
    pickable: true,
    visible: viewTX
  })

  const layerButtonStyle = (view, n) => {
    return ({
    position: 'absolute', 
    left: 5 + 75*n, 
    top: 5,
    color: 'white',
    backgroundColor: view ? 'blue' : 'gray',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0px 0px 10px 0 rgba(255, 255, 255, 0.2)'
  })};

  const infoButtonStyle = (n) => {
    return ({
    position: 'absolute', 
    right: 5 + 75*n, 
    top: 5,
    color: 'white',
    backgroundColor: 'black',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0px 0px 10px 0 rgba(255, 255, 255, 0.2)'
  })};

  const skipButtonStyle = (n) => {
    return ({
    position: 'absolute', 
    right: 5 + 75*n, 
    top: 5,
    color: 'white',
    backgroundColor: 'green',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0px 0px 10px 0 rgba(255, 255, 255, 0.2)'
  })};

  const playButtonStyle = (n) => {
    return ({
    position: 'absolute', 
    right: 5 + 75*n, 
    top: 5,
    color: 'white',
    backgroundColor: animate ? 'red' : 'green',
    border: 'none',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0px 0px 10px 0 rgba(255, 255, 255, 0.2)'
  })};

  return (
      <DeckGL
        layers={[
          heatmapLayer,
          contourLayer,
          voronoiLayer,
          s2Layer,
          h3Layer,
          glyphLayer,
          busLayer,
          evStationLayer,
          storageLayer,
          pvLayer,
          txLayer,
          currentLayer,
          lineLayer,
          everythingLayer
        ]}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={getTooltip}
      >
        <button 
          onClick = {() => toggleLines(!viewLines)}
          style = {layerButtonStyle(viewLines, 0)}> 
          Lines
        </button>
        <button 
          onClick = {() => toggleBuses(!viewBuses)}
          style = {layerButtonStyle(viewBuses, 0.9)}> 
          Buses
        </button>
        <button 
          onClick = {() => toggleGlyphs(!viewGlyphs)}
          style = {layerButtonStyle(viewGlyphs, 1.9)}> 
          Glyphs*
        </button>
        <button 
          onClick = {() => toggleH3(!viewH3)}
          style = {layerButtonStyle(viewH3, 2.9)}> 
          H3 Hexes
        </button>
        <button 
          onClick = {() => toggleS2(!viewS2)}
          style = {layerButtonStyle(viewS2, 4.2)}> 
          S2 Tiles
        </button>
        <button 
          onClick = {() => toggleVoronoi(!viewVoronoi)}
          style = {layerButtonStyle(viewVoronoi, 5.3)}> 
          Voronoi*
        </button>
        <button 
          onClick = {() => toggleContours(!viewContours)}
          style = {layerButtonStyle(viewContours, 6.4)}> 
          Contours
        </button>
        <button 
          onClick = {() => toggleCurrents(!viewCurrents)}
          style = {layerButtonStyle(viewCurrents, 7.6)}> 
          Currents
        </button>
        <button 
          onClick = {() => toggleEVStations(!viewEVStations)}
          style = {layerButtonStyle(viewEVStations, 8.8)}> 
          EV Stations
        </button>
        <button 
          onClick = {() => togglePV(!viewPV)}
          style = {layerButtonStyle(viewPV, 10.2)}> 
          PV
        </button>
        <button 
          onClick = {() => toggleStorage(!viewStorage)}
          style = {layerButtonStyle(viewStorage, 10.9)}> 
          Storage
        </button>
        <button 
          onClick = {() => toggleTX(!viewTX)}
          style = {layerButtonStyle(viewTX, 12)}> 
          Transformers
        </button>
        <button 
          onClick = {() => toggleTX(!viewHeatmap)}
          style = {layerButtonStyle(viewHeatmap, 13.4)}> 
          Heatmap
        </button>
        <button 
          onClick = {() => stepTime(1)}
          style = {skipButtonStyle(0)}> 
          ►►
        </button>
        <button 
          onClick = {() => setAnimate(!animate)}
          style = {playButtonStyle(0.7)}> 
          {animate ? "■" : "►"}
        </button>
        <button 
         onClick = {() => stepTime(-1)}
          style = {skipButtonStyle(1.25)}> 
          ◄◄
        </button>
        <button 
         onClick = {() => setSpeed(speed === 1 ? speed : speed / 2)}
          style = {skipButtonStyle(1.97)}> 
          ▼
        </button>
        <button 
         onClick = {() => setSpeed(speed * 2)}
          style = {skipButtonStyle(2.5)}> 
          ▲
        </button>
        <button 
          style = {infoButtonStyle(3.1)}> 
          Speed: {speed}x
        </button>
        <button 
          style = {infoButtonStyle(4.4)}> 
          Timestep: {timestep}
        </button>
        <button 
          style = {infoButtonStyle(5.8)}> 
          {loading ? "Loading..." : datetimes[timestep].time}
        </button>
        <img src="loading.gif" style={{position: 'absolute', left: '45%', top: '30%', width: 200, height: 200, opacity: 0.5, display: loading ? 'block' : 'none'}} />
        <Map reuseMaps mapLib={maplibregl} mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
  );
}