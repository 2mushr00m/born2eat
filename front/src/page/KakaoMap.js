import { useState } from 'react';
import { Map, MapMarker, CustomOverlayMap, ZoomControl } from 'react-kakao-maps-sdk';

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
            <div>Hello World!</div>
            어떻게 이걸 꾸밀까요
          </MapMarker>
          <CustomOverlayMap position={{ lat: 33.55735, lng: 126.795941 }}>어어엉?</CustomOverlayMap>

          {/* <MapTypeControl position={"TOPRIGHT"} /> */}
          <ZoomControl position={'RIGHT'} />
        </Map>

        <div>이거를 커스텀 컨트롤러로 사용</div>
        <div
          style={{ position: 'absolute', top: '10px', left: '10px', overflow: 'hidden', zIndex: 1 }}
          onClick={() => alert('ㅇㅇ')}>
          커스텀 버튼
        </div>
      </div>
      <p>
        <button
          onClick={() =>
            setMap({
              center: { lat: 33.55635, lng: 126.795841 },
              isPanto: false,
            })
          }>
          지도 중심좌표 이동시키기
        </button>{' '}
        <button
          onClick={() =>
            setMap({
              center: { lat: 33.55735, lng: 126.795941 },
              isPanto: true,
            })
          }>
          지도 중심좌표 부드럽게 이동시키기
        </button>
      </p>
    </>
  );
}
