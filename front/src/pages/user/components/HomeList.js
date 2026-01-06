import { Link } from "react-router-dom";

export default function HomeList({ list }) {
  return (
    <div className="home-content">
      <ul className="gallery-list">
        {list.map((t, i) => (
          <li key={t.restaurantId} className="gallery-card">
            <Link to={`/restaurant/${t.restaurantId}`}>
              <div
                className="card-image"
                style={{ 
                  backgroundImage: `url(${t.mainPhoto || `https://picsum.photos/800/600?random=${i}`})` 
                }}
              />
              <div className="card-content">
                <h3>{t.name}</h3>
                <p>{t.foodCategory} 전문점</p>
                <p className="card-content-small">{t.address}</p>
                <div className="card-content-tag">
                  {t.tags.map((tag, index) => (
                    <span key={index} className="tag-item">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
