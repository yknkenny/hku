import { config } from './mbconfig.js';
import { obj3D } from './model.js';
import { flyarray } from './fightpath.js';

mapboxgl.accessToken = config.accessToken;

// switcher variable
var mapStyleArr = [{
    name: "Color Map",
    url: 'mapbox://styles/yknkenny/cl14u3pd1008714l9hgf8o1ym'
}, {
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v11"
}, {
    name: "Chill Map",
    url: "mapbox://styles/yknkenny/cl1hk317i000z14qb9c6gnjl9"
}];
//console.log(mapStyleArr.length)

// add a map
var map = (window.map = new mapboxgl.Map({
    container: 'map', // container ID
    style: mapStyleArr[0].url, // style URL
    center: [114.156455, 22.299903],
    zoom: 16.5,
    bearing: 24,
    pitch: 45,
    hash: true,
    antialias: true,
}));

// add threebox view
window.tb = new Threebox(
    map,
    map.getCanvas().getContext('webgl'),
    {
        defaultLights: true,
        terrain: true,
        enableSelectingObjects: true,
        enableDraggingObjects: true,
        enableRotatingObjects: true,
        enableTooltips: true,
        multiLayer: true, // this will create a default custom layer that will manage a single tb.update
    }
);

let items = obj3D.length;
let minZoom = 15.5;
let maxZoom = 24;
let toggleableLayerIds = [];

// add zoom and rotation controls to the map
map.addControl(new mapboxgl.NavigationControl());

// add a full screen for map display
map.addControl(new mapboxgl.FullscreenControl());


// add map.on(load)
map.on('load', () => { 
    
    // Create a popup
    const popup = new mapboxgl.Popup({
        closeButton: false,
    });

    // source from tileset
    map.addSource('mapbox', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
    });

    // add extruded 3D buildings layer
    map.addLayer({
        'id': '3dbuildings',
        'source': 'mapbox',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'layout': {
            'visibility': 'visible',
        },
        'paint': {
            'fill-extrusion-height': ["get", "height"],
            'fill-extrusion-base': 0,
            'fill-extrusion-color': 'rgba(164,199,204,1)',
            'fill-extrusion-vertical-gradient': true,
            'fill-extrusion-opacity': 0.3,                    
        }
    });
    createButtons()
    

    // "SWITCHER" button
    let index = 0;
    const switcher = document.querySelector("#switcher");
    switcher.addEventListener("click", ()=> {
        map.setStyle(mapStyleArr[++index % mapStyleArr.length].url);
        const button = switcher.querySelector("button");
        button.textContent = mapStyleArr[(index + 1) % mapStyleArr.length].name;
    })

    // load "SWITCHER" on map div
    const container = document.querySelector(".mapboxgl-ctrl-top-left");
    //console.log(container)
    container.append(switcher);


    // "MAPFLY" button
    let flyindex = 0; // copy initial status in the 1st row 
    const mapfly = document.querySelector("#mapfly");
    mapfly.addEventListener('click', ()=> {
        ++flyindex;
        map.flyTo({
            center: flyarray[flyindex % flyarray.length].slice(1,3),
            zoom: flyarray[flyindex % flyarray.length][3],
            bearing: flyarray[flyindex % flyarray.length][4],
            pitch: flyarray[flyindex % flyarray.length][5],
            speed: flyarray[flyindex % flyarray.length][6],
            minZoom: flyarray[flyindex % flyarray.length][7],
            essential: true,
        });
    });    
    
    // load "SWITCHER" on map div
    container.append(mapfly);


    // inital config for loading 3D objects
    for (let j = 1; j <= items; j++) {
        let l = {
            oid: obj3D[j-1][0],
            layer: obj3D[j-1][5] + obj3D[j-1][0],
            origin: obj3D[j-1].slice(1,3),
            height: obj3D[j-1][3],
            rY: obj3D[j-1][4],
            featype: obj3D[j-1][5],
            path: obj3D[j-1][6],
        }
        toggleableLayerIds.push(l); //append in array
    }
    
    let i = 0;
    toggleableLayerIds.forEach((l) => { //call each element in array
        i++;
        map.addLayer(createCustomLayer(l.oid, l.layer, l.origin, l.height, l.rY, l.featype, l.path), 'waterway-label');
        tb.setLayerZoomRange(l.layer, minZoom, maxZoom);
    });

    function createCustomLayer(oid, layerId, origin, height, rY, featype, path) {
        //create the layer
        let customLayer3D = {
            id: layerId,
            type: 'custom',
            renderingMode: '3d',
            onAdd: function (map, gl) {
                addModel(oid, layerId, origin, height, rY, featype, path);
            },
            render: function (gl, matrix) {
                //tb.update(); is not needed anymore if multiLayer : true
            }
        };
        return customLayer3D;
    };

    function addModel(oid, layerId, origin, height, rY, featype, path) {
        let options = {
            type: 'gltf',
            obj: path, //model url
            units: 'meters', //units in the default values are always in meters
            scale: height, // set scale using height
            rotation: { x: 90, y: rY, z: 0}, //default rotation
            anchor: 'center'
        }
        tb.loadObj(options, function (model) {
            model.setCoords(origin);
            let l = map.getLayer(layerId);
            model.addTooltip(
               "<table id='tooltip3d'>" +
                "<tr><th class='th1'>Type:</th>" + "<th class='th2'>" + featype + "</th></tr>" +
                "<tr><th class='th1'>Object ID:</th>" + "<th class='th2'>" + oid + "</th></tr>" +
                "<tr><th class='th1'>Height:</th>" + "<th class='th2'>" + height + " meters" + "</th></tr>" +
                "<tr><th class='th1'>Coordinates:</th>" + "<th class='th2'>" + origin[0] + ", " + origin[1] + "</th></tr>" +
                "</table>", true);
            tb.add(model, layerId);
        });
    }
});

// button function for toggle 3D buildings
function createButtons() {
    var link = document.createElement('a');
    link.href = '#';
    link.className = 'active';
    link.textContent = '3D Building';

    link.onclick = function (e) {
        var clickedLayer = '3dbuildings';
        e.preventDefault();
        e.stopPropagation();

        var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

        // toggle layer visibility by changing the layout object's visibility property
        if (visibility === 'visible') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            this.className = '';
            tb.toggleLayer(clickedLayer, false);

        } else {
            this.className = 'active';
            map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
            tb.toggleLayer(clickedLayer, true);
        }
    };

    var layers = document.getElementById('menu');
    layers.appendChild(link);

     // load "MENU" on map div
    const container = document.querySelector(".mapboxgl-ctrl-top-left");
    container.append(menu)
}