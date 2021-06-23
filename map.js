fetch('index.json').then(function(data) {
    data.json().then(function(resposta) {
        let stores = resposta.stores;

        if (!('remove' in Element.prototype)) {
            Element.prototype.remove = function() {
                if (this.parentNode) {
                    this.parentNode.removeChild(this);
                }
            };
        }
        /* Chave */
        mapboxgl.accessToken = 'pk.eyJ1IjoibGVhbmRyb2NpcmlsbyIsImEiOiJja25pMHcxeWEwMGtzMm9zMHVycTl5cGUxIn0.un3ysV-V4HyL6tQNZZqgWA';
        /* mapbox://styles/mapbox/streets-v11
        mapbox://styles/mapbox/outdoors-v11
        mapbox://styles/mapbox/light-v10
        mapbox://styles/mapbox/dark-v10
        mapbox://styles/mapbox/satellite-v9
        mapbox://styles/mapbox/satellite-streets-v11
        mapbox://styles/mapbox/navigation-day-v1
        mapbox://styles/mapbox/navigation-night-v1 */

        /* Criando Mapa */
        var map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-46.6012504, -23.5221877],
            zoom: 11,
            scrollZoom: true
        });
        /* JSON */


        console.log(stores);

        /* Atribuindo Id aos Store */
        stores.features.forEach(function(store, i) {
            store.properties.id = i;
        });


        /* Aguarde até que o mapa seja carregado para fazer alterações nele. */

        map.on('load', function(e) {

            /* Geocodificador */

            var geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken, // Set the access token
                mapboxgl: mapboxgl, // Set the mapbox-gl instance
                marker: true, // Use the geocoder's default marker style
                bbox: [-46.8754915, -23.6821604, -46.0754915, -23.0821604] // Set the bounding box coordinates
            });

            map.addControl(geocoder, 'top-left');

            /* Geocodificador */


            /*  É aqui que o seu '.addLayer ()' costumava ficar.
                adicione apenas a fonte sem estilizar uma camada
             */
            map.addSource('places', {
                'type': 'geojson',
                'data': stores
            });


            /* Resulado da Pesquisa */
            geocoder.on('result', function(ev) {
                var searchResult = ev.result.geometry;
                var options = { units: 'miles' };
                stores.features.forEach(function(store) {
                    Object.defineProperty(store.properties, 'distance', {
                        value: turf.distance(searchResult, store.geometry, options),
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                });

                /* Classificar lista de lojas por distância */
                stores.features.sort(function(a, b) {
                    if (a.properties.distance > b.properties.distance) {
                        return 1;
                    }
                    if (a.properties.distance < b.properties.distance) {
                        return -1;
                    }
                    return 0; // a must be equal to b
                });


                /* reconstrua a lista usando a matriz reordenada que você criou.  */
                var listings = document.getElementById('listings');
                while (listings.firstChild) {
                    listings.removeChild(listings.firstChild);
                }
                buildLocationList(stores);

            });

            /* Resulado da Pesquisa */


            /*    Adicione tudo à página:
             As listagens de locais na lateral da página
             Os marcadores no mapa */
            buildLocationList(stores);
            addMarkers();
        });


        function buildLocationList(data) {
            data.features.forEach(function(store, i) {
                /**
                 * Create a shortcut for `store.properties`,
                 * which will be used several times below.
                 **/
                var prop = store.properties;

                /* Add a new listing section to the sidebar. */
                var listings = document.getElementById('listings');
                var listing = listings.appendChild(document.createElement('div'));
                /* Assign a unique `id` to the listing. */
                listing.id = 'listing-' + prop.id;
                /* Assign the `item` class to each listing for styling. */
                listing.className = 'item';

                /* Add the link to the individual listing created above. */
                var link = listing.appendChild(document.createElement('a'));
                link.href = '#';
                link.className = 'title';
                link.id = 'link-' + prop.id;
                link.innerHTML = `<img src="${prop.icone}"/>`
                link.innerHTML += `${prop.nome.slice(0, 30)}`
                link.onclick = () => {
                    var sidebar = document.querySelector(".sidebar")
                    var burguer = document.querySelector(".hamburguer")
                    sidebar.style.display = "none";
                    burguer.style.display = "block";
                }

                /* Add details to the individual listing. */
                var details = listing.appendChild(document.createElement('div'));
                details.className = "placa"
                details.innerHTML = `<p>${prop.placa}</p>`;
                /*  if (prop.phone) {
                     details.innerHTML += ' &middot; ' + prop.phoneFormatted;

                 } */
                /* ============================================================================================ */
                /* Controle de KM */
                if (prop.distance) {
                    var roundedDistance = Math.round(prop.distance * 250)
                        /* Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k': Math.sign(num) * Math.abs(num)*/

                    roundedDistance <= 99 ?
                        details.innerHTML += `<p style="color: gray">${Math.sign(roundedDistance) * Math.abs(roundedDistance / 100).toFixed(3)} Metros</p>` :
                        details.innerHTML += `<p style="color: gray">${Math.sign(roundedDistance) * Math.abs(roundedDistance / 100).toFixed(3)} Km</p>`;
                }

                link.addEventListener('click', function(e) {
                    for (var i = 0; i < data.features.length; i++) {
                        if (this.id === 'link-' + data.features[i].properties.id) {
                            var clickedListing = data.features[i];
                            flyToStore(clickedListing);
                            createPopUp(clickedListing);
                        }
                    }
                    var activeItem = document.getElementsByClassName('active');
                    if (activeItem[0]) {
                        activeItem[0].classList.remove('active');
                    }
                    this.parentNode.classList.add('active');
                });
            });
        }

        /**
         * Add a marker to the map for every store listing.
         **/
        function addMarkers() {
            /* For each feature in the GeoJSON object above: */
            stores.features.forEach(function(marker) {
                /* Create a div element for the marker. */
                var el = document.createElement('div');
                /* Assign a unique `id` to the marker. */
                el.id = 'marker-' + marker.properties.id;
                /* Assign the `marker` class to each marker for styling. */
                el.style.backgroundImage = `url("${marker.properties.icone}")`;
                el.className = 'marker';

                /**
                 * Create a marker using the div element
                 * defined above and add it to the map.
                 **/
                new mapboxgl.Marker(el, { offset: [0, -23] })
                    .setLngLat(marker.geometry.coordinates)
                    .addTo(map);

                /**
                 * Listen to the element and when it is clicked, do three things:
                 * 1. Fly to the point
                 * 2. Close all other popups and display popup for clicked store
                 * 3. Highlight listing in sidebar (and remove highlight for all other listings)
                 **/
                el.addEventListener('click', function(e) {
                    /* Fly to the point */
                    flyToStore(marker);
                    /* Close all other popups and display popup for clicked store */
                    createPopUp(marker);
                    /* Highlight listing in sidebar */
                    var activeItem = document.getElementsByClassName('active');
                    e.stopPropagation();
                    if (activeItem[0]) {
                        activeItem[0].classList.remove('active');
                    }
                    var listing = document.getElementById(
                        'listing-' + marker.properties.id
                    );
                    listing.classList.add('active');
                });
            });
        }

        /**
         * Add a listing for each store to the sidebar.
         **/

        /**
         * Use Mapbox GL JS's `flyTo` to move the camera smoothly
         * a given center point.
         **/
        function flyToStore(currentFeature) {
            map.flyTo({
                center: currentFeature.geometry.coordinates,
                zoom: 12
            });
        }


        var draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            },
            defaultMode: 'draw_polygon'
        });
        map.addControl(draw);

        map.on('draw.create', updateArea);
        map.on('draw.delete', updateArea);
        map.on('draw.update', updateArea);

        /*   function updateArea(e) {
              var data = draw.getAll();
              var answer = document.getElementById('calculated-area');
              if (data.features.length > 0) {
                  var area = turf.area(data);
                  // restrict to area to 2 decimal points
                  var rounded_area = Math.round(area * 100) / 100;
                  answer.innerHTML =
                      '<p><strong>' +
                      rounded_area +
                      '</strong></p><p>square meters</p>';
              } else {
                  answer.innerHTML = '';
                  if (e.type !== 'draw.delete')
                      alert('Use the draw tools to draw a polygon!');
              }
          } */

        /**
         * Create a Mapbox GL JS `Popup`.
         **/
        function createPopUp(currentFeature) {
            var popUps = document.getElementsByClassName('mapboxgl-popup');
            if (popUps[0]) popUps[0].remove();
            var popup = new mapboxgl.Popup({ closeOnClick: false })
                .setLngLat(currentFeature.geometry.coordinates)
                .setHTML(`
               <h3>${currentFeature.properties.nome}: ${currentFeature.properties.placa}</h3>
                <h4>${currentFeature.properties.endereco}</h4>
                <a target="blanck" href="${currentFeature.properties.link}">Google Maps<img src="${currentFeature.properties.mapIcon}" alt=""></a>
               `)
                /* <img style="width: 30px;" src="${currentFeature.properties.icone}"/> */
                .addTo(map);
        }


    })
})
