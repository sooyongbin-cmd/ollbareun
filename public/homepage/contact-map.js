// The contact map runs in its own document, including on Safari 13.
window.__ollbareunKakaoMapSdkLoaded = function () {
  var maps = window.kakao && window.kakao.maps;
  if (!maps) return;

  maps.load(function () {
    var canvas = document.getElementById("map");
    var position = new maps.LatLng(Number(canvas.dataset.latitude), Number(canvas.dataset.longitude));
    var map = new maps.Map(canvas, { center: position, level: 3 });
    var marker = { position: position, map: map };
    if (maps.MarkerImage && maps.Size) {
      marker.image = new maps.MarkerImage(
        "/homepage/archive/map-pin.svg",
        new maps.Size(55, 68),
        maps.Point ? { offset: new maps.Point(27, 68) } : undefined
      );
    }
    new maps.Marker(marker);
    document.getElementById("fallback").hidden = true;
  });
};
