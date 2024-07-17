import {useEffect, useState} from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import {ScatterplotLayer} from '@deck.gl/layers';
import {interpolateRdBu} from 'd3-scale-chromatic';
import {csv} from 'd3-fetch';


// const DATA_URL = 'https://raw.githubusercontent.com/geohai/vite-vis-dss/main/data/';
const DATA_URL = 'data/10x/';
const BUSES_URL = DATA_URL + 'buses_df.csv';

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
const getTooltip = ({object}) => JSON.stringify(object);

// primary component
export default function App() {
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState([]);
  const [viewBuses, toggleBuses] = useState(true);
  // effect to fetch all data at the start of the app
  
  useEffect(() => {
    const fetchData = async () => {
      if (!loading) {
        console.log("Data already loaded, skipping...")  
        return;
      } 
      console.log("Fetching the data...")
      try {
        const resp_bus = await csv(BUSES_URL);
        console.log("Fetched the buses: ", resp_bus)
        setBuses(resp_bus);
      } catch (error) {
        console.error("Error fetching data:", error);
      }   
      setLoading(false);
    };
    fetchData();
  }, [loading]);

  const busLayer = new ScatterplotLayer({
    id: 'buses',
    data: buses,
    opacity: 0.8,
    filled: true,
    pointType: 'circle',
    radiusUnits: 'meters',
    getPosition: d => [+d.lng, +d.lat],
    getRadius: 20,
    // getPointRadius: f => {
    //   var voltage = loading ? 1 : +f.voltage
    //   return 400 * Math.abs(voltage-1.01)
    // },
    // getFillColor: [255, 255, 255],
    getFillColor: f => {
      var voltage = loading ? 1 : +f.voltage
      return RDBU_COLOR_SCALE(-20*(voltage-1) + 0.5)
    },
    getLineWidth: 0,
    pickable: true,
    visible: viewBuses,
    updateTriggers: {
      getFillColor: [loading],
      getPosition: [loading]
    }
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
          style = {layerButtonStyle(viewBuses, 0.0)}> 
          Buses
        </button>
        <img src="loading.gif" style={{position: 'absolute', left: '45%', top: '30%', width: 200, height: 200, opacity: 0.5, display: loading ? 'block' : 'none'}} />
        <Map reuseMaps mapLib={maplibregl} mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
  );
}