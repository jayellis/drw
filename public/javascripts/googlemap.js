var googleMaps = {
  init: function( config ) {
    this.config = config;
    this.latLng = this.config.map.getAttribute('data-latlng') || '';
    this.type = this.config.map.getAttribute( 'data-type' ) || '';
    this.idAttr = this.config.map.getAttribute( 'data-id' ) || '';
    this.displayAttr = this.config.map.getAttribute( 'data-display_address' ) || '';
    this.priceAttr = this.config.map.getAttribute( 'data-price' ) || '';
    this.summaryAttr = this.config.map.getAttribute( 'data-summary' ) || '';
    this.imageAttr = this.config.map.getAttribute( 'data-image' ) || '';
    this.id = this.idAttr.split(',');
    this.displayAddress = this.displayAttr.split(',');
    this.price = this.priceAttr.split(',');
    this.summary = this.summaryAttr.split(',');
    this.image = this.imageAttr.split(',');
    this.api_key = 'AIzaSyCg0Gu_SI-qWuTob9_QIP2vNRlHJREOXo4';
    this.latlngArray = this.latLng.split(',');
    this.loadScript();
  },

  setUp: function() {
    var self = googleMaps;
    (this.price != '') ? self.multiMarker() : self.marker() ;
  },

  multiMarker: function() {
    var meanLat = 0,
        meanLng = 0,
        maxLat = 0,
        minLat = 0,
        maxLng = 0,
        minLng = 0,
        infowindow = null,
        markerOpts = [];
        latlnglength = this.latlngArray.length;

    for(var i=0; i< this.id.length; i++) {
      markerOpts.push({ 
        id: this.id[i],
        title: this.displayAddress[i],
        price: this.price[i],
        image: this.image[i],
        loc: this.latlngArray[i].split(':'),
        icon: this.type.split(',')[i],
        summary: this.summary[i]
      });
    }

    // get mean latitude and longitude
    for(var i=0; i<latlnglength; i++) {
      var newLat = parseFloat(this.latlngArray[i].split(':')[1])/latlnglength;
      var newLng = parseFloat(this.latlngArray[i].split(':')[0])/latlnglength;
      if(newLat < maxLat) maxLat = newLat;
      if(newLng < maxLng) maxLng = newLng;
      if(newLat > minLat) minLat = newLat;
      if(newLng > minLng) minLng = newLng;
      meanLat += newLat;
      meanLng += newLng;
    }
    var googleLatLng = new google.maps.LatLng((meanLat*1), (meanLng*1));
    var mapOptions = {
      zoom: 10,
      center: googleLatLng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
      };
    var map = new google.maps.Map(this.config.map, mapOptions);
    var bounds = new google.maps.LatLngBounds();
    infowindow = new google.maps.InfoWindow({
      boxStyle: {
        opacity:0.75
      },
      content: 'holding...'
    });
    setMarkers(map, markerOpts);
    function setMarkers(map, markers) {
      for(var i=0; i<markers.length; i++) {
        var sites = markers[i];
        var icon = '/images/arrow.png';
        var position = new google.maps.LatLng(sites.loc[1],sites.loc[0]);
        var html = '<a href="/search/property/' + sites.id + '"><img src="http://yourwayhome.s3.amazonaws.com/images/thumbs/' + sites.image + '" style="width:100px;float:left;margin:10px 10px 5px 0px;" />' +
          '<p><b>' + sites.title + '</b> £' + sites.price + '</p>' +
          '<p>' + sites.summary + '</p>' +
          '</a>';

        (sites.icon === 'For Sale') ? icon = '/images/sale_icon.png' : icon = '/images/let_icon.png';

        var marker = new google.maps.Marker({
          position: position,
          map: map,
          title: sites.title,
          html: html,
          icon: icon
        }); 
        var contentString = "Some content";

        google.maps.event.addListener(marker, 'click', function() {
          infowindow.setContent(this.html);
          infowindow.open(map, this);
        });
        bounds.extend(position);
      };
    }

    map.fitBounds(bounds);
  },

  marker: function() {
    var latLng = this.latLng.split(':');
    var googleLatLng = new google.maps.LatLng((parseFloat(latLng[0])), (parseFloat(latLng[1])));
    var mapOptions = {
      zoom: 14,
      center: googleLatLng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
      };
    var map = new google.maps.Map(this.config.map, mapOptions);
    
    var myMarker = new google.maps.Marker({
      position: googleLatLng,
      map: map
    });
  },
    
  loadScript: function() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'http://maps.googleapis.com/maps/api/js?key='+ this.api_key +'&sensor=false&callback=googleMaps.setUp';
    document.body.appendChild(script);
  }
};

googleMaps.init({
  map: document.getElementById('googlemap'),
});


