import React from 'react';
import { Map, TileLayer, GeoJSON, ZoomControl} from 'react-leaflet';
import L from 'leaflet';

import Legend from './components/Legend';
import InventoryBox from './components/InventoryBox';

import './App.scss'

const INITIAL_MAP_BOUNDS = L.latLngBounds(
  L.latLng(36.923548,-123.895569),
  L.latLng(38.328730,-120.470581)
);

const getColorTotal = function(d) {
  return d < 1 ? '#FAEFDA' :
         d < 3 ? '#F4E0BB' :
         d < 6 ? '#FCD07E' :
         d < 10 ? '#F4B030' :
         '#e49d1b';
};

const getColor = function(d) {
  return !d || d.slice(0,2).toUpperCase() === 'NO' ? '#E2DDCF' : 
  '#F9BB56';
}


class App extends React.Component {

constructor() {
  super()
  this.state = {
    lat: 37.7,
    lng: -122.6,
    zoom: 9,
    mapData: null,

    focusCity: null,
    focusPolicy: "total",

    style: function (geoJsonFeature) {
      return {
        fillColor: getColorTotal(geoJsonFeature.properties.total),
        weight: 1,
        opacity: 0.5,
        color: '#fff',
        fillOpacity: 0.9
      } ;
    },

    cityList: null,
    policyList: [
     {code: "justcause", name:"Just Cause Eviction Ordinance"},
     {code: "stabilizat", name:"Rent Stabilization or Rent Control"},
     {code: "reviewboar", name:"Rent Review Board and/or Mediation"},
     {code: "mobilehome", name:"Mobile home rent control"},
     {code: "sropres", name:"SRO preservation"},
     {code: "condoconv", name:"Condominium conversion regulations"},
     {code: "foreclosur", name:"Foreclosure assistance"},
     {code: "jobshousin", name:"Jobs-housing linkage fee"},
     {code: "commercial", name:"Commerical linkage fee"},
     {code: "trustfund", name:"Housing trust fund"},
     {code: "inclusiona", name:"Inclusionary zoning"},
     {code: "densitybon", name:"Density bonus ordinance"},
     {code: "landtrust", name:"Community Land Trusts"},
     {code: "firstsourc", name:"First source hiring"}
    ]
  }
}

/** Load map data from github */
componentDidMount() {

  fetch('https://raw.githubusercontent.com/cci-ucb/baypolicydata/master/mapData.json')
     .then((response) => response.json())
     .then((responseJson) => {
        this.setState({ mapData: responseJson });
     })
     .catch((error) => {
        console.error(error);
     });
}

/** Calculate total policies count for each city and create list of cities */
componentDidUpdate(prevProps, prevState) {
  if (!prevState.mapData && this.state.mapData) {
    for (const feature of this.state.mapData.features) {
      var total = 0;
      for (const policy of this.state.policyList) {
        if (feature.properties[policy.code] && 
            feature.properties[policy.code].slice(0,2).toUpperCase() !== 'NO') {
              total++ 
            }
      }
      feature.properties.total = total;
    }

    const cityList = this.state.mapData.features.reduce((list, feature) => {
      list.push(feature.properties.city);
      return list; 
    }, []).sort();

    this.setState({
      cityList: cityList
    });
  }
}

resetPosition = () => {
  const map = this.refs.map.leafletElement;
  map.flyToBounds(INITIAL_MAP_BOUNDS,
    {
      paddingTopLeft: [250,0],
      duration: 0.5, 
      easeLinearity: 0.5
    });
}

bringLayerToFront = (layer) => {
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

updateStyle = (focusCity, focusPolicy) => {
  //.find( (element) => (element.feature.properties.city === focusCity) ) )
  this.setState({
    focusCity: focusCity,
    focusPolicy: focusPolicy,
    style: function (geoJsonFeature) {
      return {
        fillColor: (focusPolicy === "total" ? getColorTotal(geoJsonFeature.properties.total) : getColor(geoJsonFeature.properties[focusPolicy])),
        weight: (geoJsonFeature.properties.city === focusCity ? 2 : 1),
        opacity: (geoJsonFeature.properties.city === focusCity ? 1 : 0.5),
        color: (geoJsonFeature.properties.city === focusCity ? "#000" : "#FFF"),
        fillOpacity: 0.9
      } ;
    }
  });

}

zoomToFeature = (focusCity) => {
  const map = this.refs.map.leafletElement,
        data = this.refs.data.leafletElement,
        focusElement = Object.values(data._layers).find( (element) => (element.feature.properties.city === focusCity) ); 
  this.bringLayerToFront(focusElement);
  map.flyToBounds(focusElement._bounds, 
    { 
      paddingTopLeft: [250,0],
      duration: 0.25, 
      easeLinearity: 0.5, 
      maxZoom: 10
    });
}

handleFeatureClick = (e) => {
  var layer = e.target;
  this.updateStyle(e.target.feature.properties.city, this.state.focusPolicy);
  this.bringLayerToFront(layer);
}

onEachFeature = (feature, layer) => {
  layer.on({
    click: this.handleFeatureClick.bind(this)
  });
}

render() {
  const position = [this.state.lat, this.state.lng];
  const focusCityData = this.state.mapData && this.state.mapData.features.find( (feature) =>
    (feature.properties.city === this.state.focusCity)
  );
  const focusPolicyObject = this.state.policyList.find( (policy) =>
    (policy.code === this.state.focusPolicy) 
  );

  return (
    (!this.state.mapData ? 
    <div className="uk-position-center">
      <span uk-spinner="ratio: 2" />
      <p>Loading...</p>
    </div> :
    <div>
      <Map ref='map' center={position} zoom={this.state.zoom} zoomControl={false} scrollWheelZoom={true} className="map-container">
        <TileLayer 
          className="basemap-layer"
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />
        <TileLayer 
          className="reference-layer"
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png" 
          pane="shadowPane" />        
        <GeoJSON 
          ref='data' 
          data={this.state.mapData} 
          style={this.state.style} 
          onEachFeature={this.onEachFeature} />
        <ZoomControl position='topright' />
      </Map>
      <div className="overlay-container">
        <button className="uk-button uk-button-default policy-selector" type="button">Map a specific policy... </button>
        <div uk-dropdown="pos: bottom-right; mode: click">
          <div className="uk-height-medium uk-overflow-auto">
            <ul className="uk-nav uk-dropdown-nav">
              <li>
                <a href='#' 
                   className={(this.state.focusPolicy === "total" ? "active" : "")}
                   onClick={() => this.updateStyle(this.state.focusCity, "total")}>
                     Count of anti-displacement policies
                </a>
              </li>
              <li className="uk-nav-divider"></li>
              {this.state.policyList.map( (policy) => 
                <li key={policy.code}>
                  <a href='#' 
                     className={(this.state.focusPolicy === policy.code ? "active" : "")}
                     onClick={() => this.updateStyle(this.state.focusCity, policy.code)}>
                       {policy.name}
                  </a>
                </li> )}
            </ul>
          </div>
        </div>
        <button className="uk-button uk-button-default city-selector" type="button">Find a city... </button>
        <div uk-dropdown="pos: bottom-right; mode: click">
          <div className="uk-height-medium uk-overflow-auto">
            <ul className="uk-nav uk-dropdown-nav">
                <li>
                  <a href='#' onClick={() => {this.updateStyle(null, this.state.focusPolicy); this.resetPosition();}}>Show All</a>
                </li>
                <li className="uk-nav-divider"></li>
                {this.state.cityList && this.state.cityList.map( (cityName) => 
                <li key={cityName}>
                  <a href='#' 
                     className={(this.state.focusCity === cityName ? "active" : "")}
                     onClick={() => {this.updateStyle(cityName, this.state.focusPolicy); this.zoomToFeature(cityName);}}>
                      {cityName}
                  </a>
                </li> )}
            </ul>
          </div>
        </div>
        <Legend 
          policy={(focusPolicyObject && focusPolicyObject.name ? focusPolicyObject.name : "Count of anti-displacement policies")} />
        <InventoryBox
          policyList={this.state.policyList} 
          cityData={focusCityData && focusCityData.properties} />
      </div>
    </div>)
    );

  }
}

export default App;
