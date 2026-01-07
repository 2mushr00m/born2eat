import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../../api/api";
import { apiImageUrl } from "../../api/upload";
import ReviewForm from "./components/ReviewForm";
import KakaoMap from "./components/KakaoMap";

import './Restaurant.scss';

export default function Restaurant() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantReview, setRestaurantReview] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    // 음식점 상세 조회
    api.get(`/restaurants/${id}`)
      .then(res => {
        setRestaurant(res.data.result);
      })
      .catch(err => {
        console.error(err);
        setError("데이터 로딩 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });

    // 리뷰만 따로 조회
    api.get(`/restaurants/${id}/reviews`)
      .then(res => {
        setRestaurantReview(res.data.result?.items || []);
      })
      .catch(err => {
        console.error("리뷰 로딩 실패:", err);
        setRestaurantReview([]);
      });

  }, [id]);

  if (loading) return null;
  if (error) return <div>{error}</div>;
  if (!restaurant) return <div>해당 음식점 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="rest">
      <section className="rest__top">
        <article>
          <div>
            <img src={restaurant.mainPhoto} alt={restaurant.name} />
          </div>
        </article>
        <article>
          <div>
            <h2>{restaurant.name}</h2>
            <div className=" rest__top__star">
              <p><span>{restaurant.ratingSum}</span></p>
              <p>({restaurant.reviewCount || "0"}개)</p>
            </div>
          </div>
          <div className="rest__top__desc">
            <p>{restaurant.address}</p>
            <p>{restaurant.foodCategory} 전문점</p>
            <p>대표메뉴: {restaurant.mainFood}</p>
          </div>
          {restaurant.tags?.length > 0 && (
            <ul className="tag-list">
              {restaurant.tags.map((tag) => (
                <li key={tag} className="tag-item-color">
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <section className="rest__contents">
        <div className="tabBox">
          <div className="tabBox__nav">
            <button
              className={`tabBox__tab ${activeTab === 0 ? "is-active" : ""}`}
              onClick={() => setActiveTab(0)}
            >
              소개
            </button>
            <button
              className={`tabBox__tab ${activeTab === 1 ? "is-active" : ""}`}
              onClick={() => setActiveTab(1)}
            >
              사진
            </button>
            <button
              className={`tabBox__tab ${activeTab === 2 ? "is-active" : ""}`}
              onClick={() => setActiveTab(2)}
            >
              리뷰
            </button>
            <button
              className={`tabBox__tab ${activeTab === 3 ? "is-active" : ""}`}
              onClick={() => setActiveTab(3)}
            >
              방송
            </button>
          </div>
          <div className="tabBox__contents">
            {activeTab === 0 && (
              <div className="tabBox__contents__desc">
                <div>
                  <h2>📌 맛집 정보</h2>
                  <p>{restaurant.name}은(는) {restaurant.region.depth1} {restaurant.region.depth2 || "(DB: region depth2 추가)"}에 위치한 {restaurant.foodCategory} 전문점으로, </p>
                  <p>대표 메뉴는 {restaurant.mainFood || "(DB: mainFood 추가)"}입니다.</p><br/>
                  <p>{restaurant.description || "(DB: description 추가)"}</p>
                </div>
                <div>
                  <KakaoMap />
                </div>
              </div>
            )}
            {activeTab === 1 && (
              <div className="tabBox__contents__img">
                <p>두번째탭</p>
              </div>
            )}
            {activeTab === 2 && (
              <div className="tabBox__contents__review">
                <h2>📝 맛집탐험가들의 솔직 리뷰 </h2>
                <button onClick={() => setShowModal(true)}>리뷰 쓰기</button>
                {showModal && (
                  <div className="modal">
                    <div className="modal__overlay" onClick={() => setShowModal(false)} />
                    <div className="modal__content">
                      <ReviewForm
                        restaurantId={id}
                        onClose={() => setShowModal(false)}
                        onSaved={() => {
                          api.get(`/restaurants/${id}/reviews`)
                            .then(res => {
                              setRestaurantReview(res.data.result?.items || []);
                              setShowModal(false);
                            })
                            .catch(() => {
                              setRestaurantReview([]);
                              setShowModal(false);
                            });
                        }}
                      />
                    </div>
                  </div>
                )}
                {restaurantReview.length > 0 ? (
                  restaurantReview.map(i => (
                    <div key={i.reviewId} className="review-box">
                      <ul>
                        <li>
                          <p>{i.userNickname}</p>
                          <span>작성일: {new Date(i.createdAt).toLocaleDateString("ko-KR")}</span>
                        </li>
                        <li>
                          <p><span>{"★".repeat(i.rating)}{"☆".repeat(5 - i.rating)}</span> {i.rating}점</p>
                        </li>
                        <li className="tag-list">
                          {i.tags?.map((name) => (
                            <span key={name} className="tag-item">
                              #{name}
                            </span>
                          ))}
                        </li>
                        <li>{i.content}</li>
                        {i.photos?.length > 0 && (
                          <li className="photo-box">
                            <div className="photo-gallery">
                              {i.photos.map((photo) => (
                                <img
                                  key={photo.id}
                                  ssrc={apiImageUrl(photo.path)}
                                  alt={photo.caption || "리뷰 사진"}
                                />
                              ))}
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="tabBox__contents__empty">
                    <p>등록된 리뷰가 없습니다.</p>
                    <button>리뷰 쓰기</button>
                  </div>
                )}
              </div>
            )}
            {activeTab === 3 && (
              <div className="tabBox__contents__broadcast">
                <h2>▶️ 방송 보러가기</h2>
                <div className="broadcastBox">
                  <div className="broadcastBox__in">
                    <a href={restaurant.broadcasts?.ott?.NETFLIX || "https://www.netflix.com/kr/"} target="_blank" rel="noopener noreferrer">
                      <div>
                        <img src="/assets/broadcast_netflix.png" alt="netflix" />
                        <p>넷플릭스에서 보기</p>
                      </div>
                    </a>
                  </div>
                  <div className="broadcastBox__in">
                    <a href={restaurant.broadcasts?.ott?.TVING || "https://www.tving.com/onboarding"} target="_blank" rel="noopener noreferrer">
                      <div>
                        <img src="/assets/broadcast_tving.png" alt="tving" />
                        <p>티빙에서 보기</p>
                      </div>
                    </a>
                  </div>
                  <div className="broadcastBox__in">
                    <a href={restaurant.broadcasts?.ott?.WAVVE || "https://www.wavve.com/"} target="_blank" rel="noopener noreferrer">
                      <div>
                        <img src="/assets/broadcast_wavve.png" alt="wavve" />
                        <p>웨이브에서 보기</p>
                      </div>
                    </a>
                  </div>
                  <div className="broadcastBox__in">
                    <a href={restaurant.broadcasts?.ott?.WATCHA || "https://watcha.com/browse/theater"} target="_blank" rel="noopener noreferrer">
                      <div>
                        <img src="/assets/broadcast_watcha.png" alt="watcha" />
                        <p>왓챠에서 보기</p>
                      </div>
                    </a>
                  </div>
                </div>
                <h2>▶️ 유튜브 클립 모음</h2>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
