import {useState, useEffect} from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import {ScatterplotLayer} from '@deck.gl/layers';
// import {H3HexagonLayer, S2Layer} from '@deck.gl/geo-layers';
// import {GridLayer, HeatmapLayer} from '@deck.gl/aggregation-layers';
import {interpolateRdBu, interpolateRdPu} from 'd3-scale-chromatic';
import {csv} from 'd3-fetch';


// const DATA_URL = 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/';
const DATA_URL = 'data/10x/';
// const LINES_URL = DATA_URL + 'lines_df.csv';
const BUSES_URL = DATA_URL + 'buses_df.csv';
// const TX_URL = DATA_URL + 'tx_df.csv';

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
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState([]);
  // const [lines, setLines] = useState({});
  // const [tx, setTX] = useState({});
  
  // const [viewLines, toggleLines] = useState(false);
  const [viewBuses, toggleBuses] = useState(true);
  // const [viewGlyphs, toggleGlyphs] = useState(false);
  // const [viewTX, toggleTX] = useState(false);


  // effect to fetch all data at the start of the app
  useEffect(() => { 
    const fetchData = async () => {
      setLoading(true);
      console.log("Fetching the data...")
      const resp_bus = await csv(BUSES_URL);
      console.log("Fetched the buses: ", resp_bus)
      setBuses(resp_bus);
      
      // // lines
      // const resp_lines = await csv(LINES_URL);
      // console.log("Fetched the lines: ", resp_lines)
      // setLines(resp_lines);
      // // transformers
      // const resp_tx = await csv(TX_URL);
      // console.log("Fetched the transformers: ", resp_tx)
      // setTX(resp_tx);

      setLoading(false);
    };
    fetchData();
  }, []);

  // const lineLayer = new GeoJsonLayer({
  //   id: 'lines',
  //   data: lines,
  //   opacity: 0.1,
  //   getLineColor: [255, 255, 255],
  //   getLineWidth: 2,
  //   pickable: true,
  //   visible: viewLines
  // })

  const busLayer = new ScatterplotLayer({
    id: 'buses',
    data: buses,
    opacity: 0.1,
    filled: true,
    pointType: 'circle',
    radiusUnits: 'meters',
    getPosition: d => [d.lng, d.lat],
    getRadius: 4,
    getFillColor: [255, 255, 255],
    getLineWidth: 0,
    pickable: true,
    visible: viewBuses,
    updateTriggers: {
      getFillColor: [buses],
      getPosition: [buses]
    }
  })

  // const glyphLayer = new GeoJsonLayer({
  //     id: 'glyphs',
  //     data: BUSES_URL,
  //     opacity: 0.8,
  //     filled: true,
  //     pointType: 'circle',
  //     pointRadiusMaxPixels: 50,
  //     radiusUnits: 'meters',
  //     getPointRadius: f => {
  //       var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
  //       return 400 * Math.abs(voltage-1.01)
  //     },
  //     getFillColor: f => {
  //       var voltage = loading ? 1 : +currentVoltages[f.properties.bus]
  //       return RDBU_COLOR_SCALE(-20*(voltage-1) + 0.5)
  //     },
  //     updateTriggers: {
  //       getFillColor: [currentVoltages, loading],
  //       getPointRadius: [currentVoltages, loading]
  //     },
  //     getLineWidth: 0,
  //     pickable: true,
  //     visible: viewGlyphs
  //   })

  // const txLayer = new GeoJsonLayer({
  //   id: 'tx',
  //   data: TX_URL,
  //   opacity: 0.5,
  //   pointType: 'icon',
  //   iconAtlas: 'tx.png',
  //   iconMapping: {marker: {
  //     x: 0, 
  //     y: 0, 
  //     width: 800, 
  //     height: 600, 
  //     mask: false,
  //     anchorY: 600,
  //   }},
  //   getIcon: () => 'marker',
  //   getIconSize: 0.3,
  //   iconSizeScale: 30,
  //   iconSizeUnits: 'meters',
  //   iconBillboard: true,
  //   pickable: true,
  //   visible: viewTX
  // })

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

  return (
      <DeckGL
        layers={[
          busLayer,
        ]}
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        getTooltip={getTooltip}
      >
        <button 
          onClick = {() => toggleBuses(!viewBuses)}
          style = {layerButtonStyle(viewBuses, 0.9)}> 
          Buses
        </button>
        <img src="loading.gif" style={{position: 'absolute', left: '45%', top: '30%', width: 200, height: 200, opacity: 0.5, display: loading ? 'block' : 'none'}} />
        <Map reuseMaps mapLib={maplibregl} mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
  );
}