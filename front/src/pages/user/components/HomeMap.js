import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import KakaoMap from './KakaoMap';
import NoPhoto from './NoPhoto';
import { apiImageUrl } from '../../../api/upload';

function isValidLatLng(it) {
  const lat = Number(it?.latitude);
  const lng = Number(it?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function CoordErrorPage({ item }) {
  return (
    <div className="main">
      <section className="main__wrap">
        <h2 style={{ margin: 0 }}>위치 정보가 없는 음식점입니다.</h2>
        <p style={{ marginTop: 8 }}>
          {item?.name ? `"${item.name}"` : '선택한 음식점'}에 위치 정보가 없어서 지도를 표시할 수 없습니다.
        </p>
      </section>
    </div>
  );
}

export default function HomeMap({ list }) {
  const [selectedId, setSelectedId] = useState(null);

  const onSelect = useCallback((restaurantId) => {
    setSelectedId(Number(restaurantId));
  }, []);

  // list 변경 시: 첫 번째를 자동 선택
  useEffect(() => {
    const first = Array.isArray(list) && list.length ? list[0] : null;
    setSelectedId(first?.restaurantId ?? null);
  }, [list]);

  const selected = useMemo(() => {
    if (!Array.isArray(list) || !list.length) return null;
    if (selectedId == null) return list[0] ?? null;
    return list.find((x) => Number(x.restaurantId) === Number(selectedId)) ?? list[0] ?? null;
  }, [list, selectedId]);

  // 선택된 항목에 좌표가 없으면 "오류 페이지"
  if (selected && !isValidLatLng(selected)) {
    return <CoordErrorPage item={selected} />;
  }

  return (
    <div className="home-content">
      <div className="slider-wrapper">
        <ul className="slider-list">
          {(list || []).map((t, i) => {
            const isSelected = Number(t.restaurantId) === Number(selectedId);
            return (
              <li key={t.restaurantId} className="slider-item">
                <article
                  className="card"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(t.restaurantId)}>
                  {t.mainPhoto ? (
                    <div className="card-image" style={{ backgroundImage: `url(${apiImageUrl(t.mainPhoto)})` }} />
                  ) : (
                    <div className="card-image">
                      <NoPhoto />
                    </div>
                  )}
                  <div className="card-body">
                    <div>
                      <h3 style={{ margin: 0 }}>{t.name}</h3>
                      <p style={{ margin: '6px 0 0' }}>
                        {t.region?.depth1} {t.region?.depth2}
                      </p>
                    </div>

                    <Link to={`/restaurant/${t.restaurantId}`} onClick={(e) => e.stopPropagation()}>
                      <img src="/assets/icon_arrow.png" alt="icon_arrow" />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>

      <div id="map-wrap">
        <KakaoMap items={list || []} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
}
