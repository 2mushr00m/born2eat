import React from 'react';
import { Link } from 'react-router-dom';
import KakaoMap from './KakaoMap';

export default function HomeMap({ list }) {
  return (
    <div className="home-content">
      <div className="slider-wrapper">
        <ul className="slider-list">
          {list.map((t, i) => (
            <li key={t.restaurantId} className="slider-item">
              <article className="card">
                <div
                  className="card-image"
                  style={{
                    backgroundImage: `url(${t.mainPhoto || `https://picsum.photos/800/600?random=${i}`})`,
                  }}
                />
                <div className="card-body">
                  <div>
                    <h3>{t.name}</h3>
                    <p>
                      {t.region?.depth1} {t.region?.depth2}
                    </p>
                  </div>
                  <Link to={`/restaurant/${t.restaurantId}`}>
                    <img src="/assets/icon_arrow.png" alt="icon_arrow" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <div id="map-wrap">
        <KakaoMap />
      </div>
    </div>
  );
}
