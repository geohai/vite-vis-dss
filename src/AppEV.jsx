import {useEffect, useState} from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer, ColumnLayer} from '@deck.gl/layers';
import {H3HexagonLayer} from '@deck.gl/geo-layers';
import {HexagonLayer, HeatmapLayer, GridLayer} from '@deck.gl/aggregation-layers';
import {csv} from 'd3-fetch';
import {interpolateRdBu} from 'd3-scale-chromatic';

// style map
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const INITIAL_VIEW_STATE = {
  latitude: 37.2,
  longitude: -76.9,
  zoom: 9.5,
  maxZoom: 20,
  pitch: 60,
  bearing: 0
};
const toRGBArray = rgbStr => rgbStr.match(/\d+/g).map(Number);
const RDBU_COLOR_SCALE = v => toRGBArray(interpolateRdBu(v));
const getTooltip = ({object}) => JSON.stringify(object);

// primary component
export default function AppEV() {
  const [viewPoints, togglePoints] = useState(true);
  const [viewGlyphs, toggleGlyphs] = useState(false);
  const [viewColumns, toggleColumns] = useState(false);
  const [viewHex, toggleHex] = useState(false);
  const [viewH3, toggleH3] = useState(false);
  const [viewGrid, toggleGrid] = useState(false);
  const [viewHeatmap, toggleHeatmap] = useState(true);

  const [allLoads, setAllLoads] = useState([]);
  const [currentLoads, setCurrentLoads] = useState([]);
  
  const [timestep, setTimestep] = useState(24);
  const [animate, setAnimate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(16);

  let hour = timestep % 24;
  let day = Math.floor(timestep / 24) % 7 + 1;
  
  // effect to fetch all data at the start of the app
  useEffect(() => { 
    const fetchData = async () => {
      setLoading(true);

      const data = await csv('https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/hourly_load_timesteps.csv');
      // console.log("Fetched the full load data: ", data)
      setAllLoads(data);

      setLoading(false);
    };
    fetchData();
  }, []);

  // effect to fetch loads for current timestep
  useEffect(() => {
    const getLoadsByTimestep = (timestep) => {
      return allLoads.filter((l) => +l.timestep === timestep);
    };
    setCurrentLoads(getLoadsByTimestep(timestep));
  }, [allLoads, timestep]);
  
  // function to update the timestep when buttons are clicked
  const stepTime = (hours) => {
    setTimestep(timestep + hours % 168);
  };

  // effect to animate the timestep
  useEffect(() => {
    if (animate) {
      const interval = setInterval(() => {
        setTimestep((timestep + 1) % 168)
      }, 1000/speed)
      return () => clearInterval(interval)
    }
  }, [animate, timestep, speed])

  // layers
  const pointsLayer = new GeoJsonLayer({
    id: 'pointss',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.geo.json',
    pointType: 'circle',
    radiusUnits: 'meters',
    getPointRadius: 300,
    getFillColor: [255, 255, 255],
    getLineWidth: 0,
    visible: viewPoints
  })

  const glyphLayer = new GeoJsonLayer({
    id: 'glyphs',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.geo.json',
    pointType: 'circle',
    radiusUnits: 'meters',
    getPointRadius: s => {
      var power = +currentLoads.find(d => +d.school_id === s.properties.ID).power
      return 3 * (power + 100)
    },
    getFillColor: s => {
      var power = +currentLoads.find(d => +d.school_id === s.properties.ID).power
      return RDBU_COLOR_SCALE(1-power/800)
    },
    updateTriggers: {
      getFillColor: currentLoads,
      getPointRadius: currentLoads,
    },
    getLineWidth: 0,
    visible: viewGlyphs
  })

  const columnLayer = new ColumnLayer({
    id: 'column-layer',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.json',
    opacity: 0.9,
    diskResolution: 24,
    radius: 500,
    extruded: true,
    pickable: true,
    elevationScale: 10,
    getPosition: d => d.geometry.coordinates,
    getFillColor: s => {
      var power = +currentLoads.find(d => +d.school_id === s.ID).power
      // console.log(power);
      return RDBU_COLOR_SCALE(1-power/800)
    },
    getElevation: s => {
      var power = +currentLoads.find(d => +d.school_id === s.ID).power
      return power
    },
    updateTriggers: {
      getFillColor: currentLoads,
      getElevation: currentLoads,
    },
    getLineWidth: 0,
    visible: viewColumns
  })

  const hexLayer = new HexagonLayer({
    id: 'hex',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.json',
    opacity: 0.9,
    filled: true,
    extruded: true,
    radius: 3000,
    elevationDomain: [0, 1000],
    elevationScale: 10,
    getElevationWeight: point => {
      var power = +currentLoads.find(d => +d.school_id === point.ID).power;
      return power;
    },
    elevationAggregation: 'SUM',
    colorDomain: [0, 1000],
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
    getColorWeight: point => {
      var power = +currentLoads.find(d => +d.school_id === point.ID).power;
      // console.log(power);
      return power;
    },
    colorAggregation: 'SUM',
    getPosition: d => {
      var coord = d.geometry.coordinates;
      return coord
    },
    updateTriggers: {
      getColorWeight: currentLoads,
      getElevationValue: currentLoads,
    },
    getLineWidth: 0,
    visible: viewHex
  })

  const h3Layer = new H3HexagonLayer({
    id: 'h3',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools_h3.json',
    opacity: 0.1,
    filled: true,
    extruded: false,
    getHexagon: d => {
      var h3 = d.h3r7;
      return h3
    },
    getFillColor: [255, 255, 255],
    getLineWidth: 0,
    visible: viewH3
  })

  const gridLayer = new GridLayer({
    id: 'grid',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.json',
    opacity: 0.9,
    filled: true,
    extruded: true,
    cellSize: 5000,
    elevationDomain: [0, 1000],
    elevationScale: 10,
    getElevationWeight: point => {
      var power = +currentLoads.find(d => +d.school_id === point.ID).power;
      return power;
    },
    elevationAggregation: 'SUM',
    colorDomain: [0, 1000],
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
    getColorWeight: point => {
      var power = +currentLoads.find(d => +d.school_id === point.ID).power;
      return power;
    },
    colorAggregation: 'SUM',
    getPosition: d => {
      var coord = d.geometry.coordinates;
      return coord
    },
    updateTriggers: {
      getColorWeight: currentLoads,
      getElevationValue: currentLoads,
    },
    getLineWidth: 0,
    visible: viewGrid
  })

  const heatmapLayer = new HeatmapLayer({
    id: 'heatmap',
    data: 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/evsatscale/schools.json',
    radiusPixels: 150,
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
    colorDomain: [0.1, 5],
    weightsTextureSize: 256,
    getPosition: d => {
      var coord = d.geometry.coordinates;
      return coord
    },
    getWeight: s => {
      var power = +currentLoads.find(d => +d.school_id === s.ID).power;
      return power;
    },
    aggregation: 'SUM',
    updateTriggers: {
      getWeight: currentLoads,
    },
    visible: viewHeatmap
  })

  // button styles
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
          columnLayer,
          hexLayer,
          h3Layer,
          gridLayer,
          heatmapLayer,
          glyphLayer,
          pointsLayer
        ]}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={getTooltip}
      >
        <button 
          onClick = {() => togglePoints(!viewPoints)}
          style = {layerButtonStyle(viewPoints, 0.1)}> 
          Points
        </button>
        <button 
          onClick = {() => toggleGlyphs(!viewGlyphs)}
          style = {layerButtonStyle(viewGlyphs, 1)}> 
          Glyphs
        </button>
        <button 
          onClick = {() => toggleColumns(!viewColumns)}
          style = {layerButtonStyle(viewColumns, 2)}> 
          Columns
        </button>
        <button 
          onClick = {() => toggleHex(!viewHex)}
          style = {layerButtonStyle(viewHex, 3.1)}> 
          Hex
        </button>
        <button 
          onClick = {() => toggleH3(!viewH3)}
          style = {layerButtonStyle(viewH3, 3.8)}> 
          H3
        </button>
        <button 
          onClick = {() => toggleGrid(!viewGrid)}
          style = {layerButtonStyle(viewGrid, 4.4)}> 
          Grid
        </button>
        <button 
          onClick = {() => toggleHeatmap(!viewHeatmap)}
          style = {layerButtonStyle(viewHeatmap, 5.1)}> 
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
          Day: {day} 
        </button>
        <button 
          style = {infoButtonStyle(5.3)}> 
          Hour: {hour}
        </button>
        <img src="loading.gif" style={{position: 'absolute', left: '45%', top: '30%', width: 200, height: 200, opacity: 0.5, display: loading ? 'block' : 'none'}} />
        <Map reuseMaps mapLib={maplibregl} mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
  );
}