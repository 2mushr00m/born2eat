import React, { useState } from 'react';
import { Map, MapMarker, ZoomControl } from 'react-kakao-maps-sdk';

export default function KakaoMap() {
  const [map, setMap] = useState({
    center: { lat: 33.450701, lng: 126.570667 },
    isPanto: false,
  });

  return (
    <>
      <div id="map-wrap">
        <Map
          center={map.center}
          isPanto={map.isPanto}
          style={{ width: '100%', height: '500px', position: 'relative' }}
          // isPanto가 언제든 동작 가능하게 만들어줌.
          onCenterChanged={(map) => {
            const pos = map.getCenter();
            setMap((prev) => ({
              ...prev,
              center: { lat: pos.getLat(), lng: pos.getLng() },
            }));
          }}
          level={3}>
          <MapMarker position={{ lat: 33.55635, lng: 126.795841 }}>
            <div>
              <p>가게 이름</p>
              <p>가게 주소</p>
            </div>
          </MapMarker>
          <ZoomControl position={'RIGHT'} />
        </Map>
      </div>
      <div>
        <button
          onClick={() =>
            setMap({
              center: { lat: 33.55735, lng: 126.795941 },
              isPanto: true,
            })
          }>
          중심으로
        </button>
      </div>
    </>
  );
}
