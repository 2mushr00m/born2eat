import { Link } from 'react-router-dom';
import NoPhoto from './NoPhoto';
import { apiImageUrl } from '../../../api/upload';

export default function HomeList({ list }) {
  return (
    <div className="home-content">
      <ul className="gallery-list">
        {list.map((t, i) => (
          <li key={t.restaurantId} className="gallery-card">
            <Link to={`/restaurant/${t.restaurantId}`}>
              {t.mainPhoto ? (
                <div className="card-image" style={{ backgroundImage: `url(${apiImageUrl(t.mainPhoto)})` }} />
              ) : (
                <div className="card-image">
                  <NoPhoto />
                </div>
              )}
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
