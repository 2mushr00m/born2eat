import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMe, getMyLikes, getMyReviews, getMyInquiries } from '../../api/me';
import { apiImageUrl } from '../../api/upload';
import NoPhoto from './components/NoPhoto';
import './Mypage.scss';

export default function MyPage() {
  const [me, setMe] = useState(null);
  const [likes, setLikes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyPageData = async () => {
      try {
        const [meRes, likesRes, reviewsRes, inquiriesRes] = await Promise.all([
          getMe(),
          getMyLikes(),
          getMyReviews(),
          getMyInquiries(),
        ]);
        setMe(meRes.data.result);
        setLikes(likesRes.data.result.items);
        setReviews(reviewsRes.data.result.items);
        setInquiries(inquiriesRes.data.result.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyPageData();
  }, []);
  if (loading) return null;

  return (
    <div className="mypage">
      <section className="mypage__profile">
        <article>
          <div className="mypage__profile__img">
            <img src={me.profileUrl ? apiImageUrl(me.profileUrl) : '/assets/default_profile.png'} alt="profile" />
          </div>
          <h4>{me.nickname}님</h4>
          <Link to="/mypage/edit">
            <div className="mypage__profile__edit">
              <p>회원정보 수정</p>
            </div>
          </Link>
        </article>
      </section>
      <section className="mypage__contents">
        <article className="mypage__contents__likes">
          <h2>🍽️ 나의 찜 식당</h2>
          {likes?.length === 0 && (
            <div className="mypage__contents__null">
              <p>아직 찜한 식당이 없습니다.</p>
            </div>
          )}
          <div className="slider-wrapper">
            <ul className="slider-list">
              {likes?.map((i) => (
                <li key={i.restaurantId} className="slider-item">
                  <Link to={`/restaurant/${i.restaurantId}`}>
                    <div className="card">
                      {i.mainPhoto ? (
                        <div className="card-image" style={{ backgroundImage: `url(${apiImageUrl(i.mainPhoto)})` }} />
                      ) : (
                        <div className="card-image">
                          <NoPhoto />
                        </div>
                      )}
                      <div className="card-body-small">
                        <div>
                          <h3>{i.name}</h3>
                          <p>
                            {i.region?.depth1} {i.region?.depth2}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </article>
        <article className="mypage__contents__reviews">
          <h2>📝 나의 리뷰</h2>
          {reviews?.length === 0 && (
            <div className="mypage__contents__null">
              <p>아직 작성한 리뷰가 없습니다.</p>
            </div>
          )}
          {reviews?.map((i) => (
            <div key={i.reviewId}>
              <ul>
                <li>
                  <h4>{i.restaurantId}</h4>
                  <p>작성일: {new Date(i.createdAt).toLocaleDateString('ko-KR')}</p>
                </li>
                <li>
                  <span>
                    {'★'.repeat(i.rating)}
                    {'☆'.repeat(5 - i.rating)}
                  </span>{' '}
                  {i.rating}점
                </li>
                <li className="tag-list">
                  {i.tags?.map((name) => (
                    <span key={name} className="tag-item">
                      #{name}
                    </span>
                  ))}
                </li>
                <li className="content-box">{i.content}</li>
                {i.photos?.length > 0 && (
                  <li className="photo-box">
                    <div className="photo-gallery">
                      {i.photos.map((photo) => (
                        <img key={photo.id} src={photo.path} alt={photo.caption || '리뷰 사진'} />
                      ))}
                    </div>
                  </li>
                )}
              </ul>
              <div className="btn-box">
                <button>수정</button>
                <button>삭제</button>
              </div>
            </div>
          ))}
        </article>
        <article className="mypage__contents__inquiries">
          <h2>📋 나의 문의</h2>
          {inquiries?.length === 0 && (
            <div className="mypage__contents__null">
              <p>아직 작성한 문의가 없습니다.</p>
            </div>
          )}
          {inquiries?.map((i) => (
            <div key={i.inquiryId}>
              <ul>
                <li>
                  <h4>Q. {i.title}</h4>
                  <p>작성일: {new Date(i.createdAt).toLocaleDateString('ko-KR')}</p>
                </li>
                <li>{i.content}</li>
                <li>A. {i.answer == null ? '답변을 기다리는 중···' : i.answer}</li>
              </ul>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
