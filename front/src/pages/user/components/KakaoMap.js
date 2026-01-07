import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map, MapMarker, MarkerClusterer, ZoomControl } from 'react-kakao-maps-sdk';

const CLUSTER_FROM_LEVEL = 9;

function isValidLatLng(it) {
  const lat = Number(it?.latitude);
  const lng = Number(it?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export default function KakaoMap({ items, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const validItems = useMemo(() => (items || []).filter(isValidLatLng), [items]);

  const selected = useMemo(() => {
    if (!validItems.length) return null;
    if (selectedId == null) return validItems[0];
    return validItems.find((x) => Number(x.restaurantId) === Number(selectedId)) ?? validItems[0];
  }, [validItems, selectedId]);

  const [level, setLevel] = useState(3);
  const [center, setCenter] = useState({ lat: 33.450701, lng: 126.570667 });

  // 초기/선택 변경 시 center 갱신 + panTo
  useEffect(() => {
    if (!selected) return;

    const lat = Number(selected.latitude);
    const lng = Number(selected.longitude);

    setCenter({ lat, lng });

    const map = mapRef.current;
    const kakao = window?.kakao;
    if (map && kakao?.maps?.LatLng) {
      map.panTo(new kakao.maps.LatLng(lat, lng));
    }
  }, [selected]);

  const useCluster = level >= CLUSTER_FROM_LEVEL;

  // validItems가 비어있으면 지도만 기본 center로 표시(마커 없음)
  return (
    <div id="map-wrap">
      <Map
        center={center}
        isPanto={true}
        style={{ width: '100%', height: '500px', position: 'relative' }}
        level={level}
        onCreate={(map) => {
          mapRef.current = map;
          if (typeof map.getLevel === 'function') setLevel(map.getLevel());
        }}
        onZoomChanged={(map) => {
          setLevel(map.getLevel());
        }}>
        {useCluster ? (
          <MarkerClusterer averageCenter minLevel={CLUSTER_FROM_LEVEL}>
            {validItems.map((t) => (
              <MapMarker key={t.restaurantId} position={{ lat: Number(t.latitude), lng: Number(t.longitude) }} />
            ))}
          </MarkerClusterer>
        ) : (
          validItems.map((t) => {
            const isSelected = Number(t.restaurantId) === Number(selected?.restaurantId);
            return (
              <MapMarker
                key={t.restaurantId}
                position={{ lat: Number(t.latitude), lng: Number(t.longitude) }}
                clickable
                onClick={() => onSelect?.(t.restaurantId)}>
                {isSelected ? (
                  <div style={{ padding: 8, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {t.address || `${t.region?.depth1 ?? ''} ${t.region?.depth2 ?? ''}`}
                    </div>
                  </div>
                ) : null}
              </MapMarker>
            );
          })
        )}

        <ZoomControl position="RIGHT" />
      </Map>
    </div>
  );
}
