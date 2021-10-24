import './style.css';

let map: google.maps.Map;

var mode = 'create';
var zoom = 6;
var latitude = 34.703214;
var longitude = 39.26412412;
var startedCoordinates = [];
var currentCoordinates = [];

var drawingManager;
var defaultShape;
var currentShape;
var selectedShape;
var colors = ['#1E90FF', '#FF1493', '#32CD32', '#FF8C00', '#4B0082'];
var selectedColor;
var colorButtons = {};

function clearSelection() {
  if (selectedShape) {
    selectedShape.setEditable(false);
    selectedShape = null;
  }
}

function setSelection(shape) {
  if (shape.type !== 'marker') {
    clearSelection();
    shape.setEditable(true);
    selectColor(shape.get('fillColor') || shape.get('strokeColor'));
  }

  selectedShape = shape;
  currentShape = shape;
}

function deleteSelectedShape() {
  if (selectedShape) {
    selectedShape.setMap(null);
  }
}

function selectColor(color) {
  selectedColor = color;
  for (var i = 0; i < colors.length; ++i) {
    var currColor = colors[i];
    colorButtons[currColor].style.border =
      currColor == color ? '2px solid #789' : '2px solid #fff';
  }

  var polylineOptions = drawingManager.get('polylineOptions');
  polylineOptions.strokeColor = color;
  drawingManager.set('polylineOptions', polylineOptions);

  var rectangleOptions = drawingManager.get('rectangleOptions');
  rectangleOptions.fillColor = color;
  drawingManager.set('rectangleOptions', rectangleOptions);

  var circleOptions = drawingManager.get('circleOptions');
  circleOptions.fillColor = color;
  drawingManager.set('circleOptions', circleOptions);

  var polygonOptions = drawingManager.get('polygonOptions');
  polygonOptions.fillColor = color;
  drawingManager.set('polygonOptions', polygonOptions);
}

function setSelectedShapeColor(color) {
  if (selectedShape) {
    if (selectedShape.type == google.maps.drawing.OverlayType.POLYLINE) {
      selectedShape.set('strokeColor', color);
    } else {
      selectedShape.set('fillColor', color);
    }
  }
}

function makeColorButton(color) {
  var button = document.createElement('span');
  button.className = 'color-button';
  button.style.backgroundColor = color;
  google.maps.event.addDomListener(button, 'click', function () {
    selectColor(color);
    setSelectedShapeColor(color);
  });

  return button;
}

function buildColorPalette() {
  var colorPalette = document.getElementById('color-palette')!;
  for (var i = 0; i < colors.length; ++i) {
    var currColor = colors[i];
    var colorButton = makeColorButton(currColor);
    colorPalette.appendChild(colorButton);
    colorButtons[currColor] = colorButton;
  }
  selectColor(colors[0]);
}

function initMap(): void {
  console.log('Init');

  document
    .getElementById('submitButton')!
    .addEventListener('click', (event) => {
      console.log('submitButton');

      if (selectedShape || currentShape) {
        // activeCreateMode();

        saveCoordinates();
      } else {
        //drawingManager.setDrawingMode = false;
        drawingManager.setMap(map);
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

        updateLabel('create');
      }
    });

  document.getElementById('resetButton')!.addEventListener('click', (event) => {
    console.log('resetButton');

    if (selectedShape) {
      selectedShape.setMap(null);
      selectedShape = null;
    }

    if (currentShape) {
      currentShape.setMap(null);
      currentShape = null;
    }

    drawingManager.setMap(null);

    updateLabel('create');
  });

  map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
    zoom: zoom,
    center: new google.maps.LatLng(latitude, longitude),
    mapTypeId: google.maps.MapTypeId.HYBRID,
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
  });

  var polyOptions = {
    strokeWeight: 0,
    fillOpacity: 0.45,
    editable: true,
    draggable: true,
  };

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    markerOptions: {
      draggable: true,
    },
    polylineOptions: {
      editable: true,
      draggable: true,
    },
    rectangleOptions: polyOptions,
    circleOptions: polyOptions,
    polygonOptions: polyOptions,
    map: map,
  });

  google.maps.event.addListener(
    drawingManager,
    'overlaycomplete',
    function (e) {
      var newShape = e.overlay;

      google.maps.event.addListener(newShape, 'dragend', (e) => {
        updateCoordinates(newShape.latLngs.i[0].i);
      });

      var path = newShape.getPath();

      google.maps.event.addListener(path, 'insert_at', (e) => {
        updateCoordinates(newShape.latLngs.i[0].i);
      });

      google.maps.event.addListener(path, 'set_at', (e) => {
        updateCoordinates(newShape.latLngs.i[0].i);
      });

      newShape.type = e.type;

      if (e.type === google.maps.drawing.OverlayType.POLYGON) {
        drawingManager.setDrawingMode(null);

        google.maps.event.addListener(newShape, 'click', function (e) {
          if (e.vertex !== undefined) {
            if (newShape.type === google.maps.drawing.OverlayType.POLYGON) {
              var path = newShape.getPaths().getAt(e.path);
              path.removeAt(e.vertex);
              if (path.length < 3) {
                newShape.setMap(null);
              }
            }
            if (newShape.type === google.maps.drawing.OverlayType.POLYLINE) {
              var path = newShape.getPath();
              path.removeAt(e.vertex);
              if (path.length < 2) {
                newShape.setMap(null);
              }
            }
          }
          setSelection(newShape);
        });
        setSelection(newShape);
      }

      if (newShape) {
        updateCoordinates(newShape.latLngs.i[0].i);
        updateLabel('edit');
        drawingManager.setMap(null);
      }
    }
  );

  drawingManager.setMap(null);

  google.maps.event.addListener(
    drawingManager,
    'drawingmode_changed',
    clearSelection
  );

  google.maps.event.addListener(map, 'click', clearSelection);

  google.maps.event.addDomListener(
    document.getElementById('deleteButton')!,
    'click',
    deleteSelectedShape
  );

  buildColorPalette();

  if (startedCoordinates.length > 0) {
    var currentCoordinates = startedCoordinates.map((coordinate) => {
      return {
        lat: coordinate[0],
        lng: coordinate[1],
      };
    });

    defaultShape = new google.maps.Polygon({
      paths: currentCoordinates,
      strokeColor: colors[0],
      strokeWeight: 0,
      fillColor: colors[0],
      fillOpacity: 0.45,
      editable: true,
      draggable: true,
    });

    defaultShape.setMap(map);

    clearSelection();
    // setSelection(defaultShape);

    google.maps.event.addListener(defaultShape, 'click', function (e) {
      setSelection(currentShape);
    });

    google.maps.event.addListener(defaultShape, 'dragend', (e) => {
      updateCoordinates(defaultShape.latLngs.i[0].i);
    });

    var path = defaultShape.getPath();

    google.maps.event.addListener(path, 'insert_at', (e) => {
      updateCoordinates(defaultShape.latLngs.i[0].i);
    });

    google.maps.event.addListener(path, 'set_at', (e) => {
      updateCoordinates(defaultShape.latLngs.i[0].i);
    });

    currentShape = defaultShape;

    updateLabel('edit');
  }
}

function activeCreateMode() {
  drawingManager.drawingControl = false;

  if (selectedShape) {
    selectedShape.setMap(null);
  }

  drawingManager.drawingControl = true;
  drawingManager.setMap(map);
  drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
}

function updateLabel(mode = 'create') {
  if (mode === 'create') {
    document.getElementById('submitButton')!.innerHTML = 'Start Drawing';
  } else if (mode === 'edit') {
    document.getElementById('submitButton')!.innerHTML = 'Save';
  }
}

function updateCoordinates(coordinates) {
  var currentCoordinates = [];
  coordinates.map((point) => {
    /*currentCoordinates.push({
      lat: point.lat(),
      lng: point.lng(),
    });*/
  });
}

function saveCoordinates() {
  /*if (window.Print !== undefined) {
    Print.postMessage(
      JSON.stringify({
        event: 'polygonCreated',
        coordinates: currentCoordinates.map(function (currentCoordinate) {
          return [currentCoordinate.lat, currentCoordinate.lng];
        }),
      })
    );
  } else {
    alert('Kaydedilmeye çalışırken bir hatayla karşılaşıldı');
  }*/
}

google.maps.event.addDomListener(window, 'load', initMap);

//export { initMap };
