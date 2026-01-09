import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRest } from '../../api/admin';

export default function AdRestNew() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    kakaoPlaceId: '',
    description: '',
    regionCode: '',
    foodTagCode: '',
    mainFood: '',
    phone: '',
    address: '',
    longitude: '',
    latitude: '',
    dataStatus: 'RAW',
    isPublished: true,
  });

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  async function onSubmit() {
    setLoading(true);
    setErrMsg('');
    try {
      const { data } = await createRest(form);
      const restaurantId = data?.result?.restaurantId;
      if (restaurantId) {
        navigate(`/admin/restaurants/${restaurantId}`);
      } else {
        navigate('/admin/restaurant');
      }
    } catch {
      setErrMsg('식당 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const tdLabelStyle = { width: 120 };
  const inputStyle = { width: '90%' };

  return (
    <div className="adMain">
      <section className="adMain__wrap">
        <article className="adMain__title">
          <h1>
            <span>●</span> 식당 등록
          </h1>
          <Link to="/admin/restaurant">
            <button type="button">→ 전체 식당 목록</button>
          </Link>
        </article>

        <article>
          {errMsg && <p>{errMsg}</p>}

          <div style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>■ 기본 정보</h2>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <tbody>
                <tr>
                  <td style={tdLabelStyle}>공개</td>
                  <td>
                    <select
                      value={String(form.isPublished)}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, isPublished: e.target.value === 'true' }))
                      }
                      style={inputStyle}
                    >
                      <option value="true">공개</option>
                      <option value="false">비공개</option>
                    </select>
                  </td>

                  <td style={tdLabelStyle}>상태</td>
                  <td>
                    <select
                      value={form.dataStatus}
                      onChange={(e) => setForm((s) => ({ ...s, dataStatus: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="RAW">RAW</option>
                      <option value="BASIC">BASIC</option>
                      <option value="VERIFIED">VERIFIED</option>
                    </select>
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>가게명</td>
                  <td>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder="가게명"
                      style={inputStyle}
                    />
                  </td>

                  <td style={tdLabelStyle}>대표메뉴</td>
                  <td>
                    <input
                      value={form.mainFood}
                      onChange={(e) => setForm((s) => ({ ...s, mainFood: e.target.value }))}
                      placeholder="대표 음식"
                      style={inputStyle}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>전화</td>
                  <td>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder="전화번호"
                      style={inputStyle}
                    />
                  </td>

                  <td style={tdLabelStyle}>카카오맵 ID</td>
                  <td>
                    <input
                      value={form.kakaoPlaceId}
                      onChange={(e) => setForm((s) => ({ ...s, kakaoPlaceId: e.target.value }))}
                      placeholder="kakaoPlaceId"
                      style={inputStyle}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>주소</td>
                  <td colSpan={3}>
                    <input
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      placeholder="주소"
                      style={{ width: '95%' }}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>법정동코드</td>
                  <td>
                    <input
                      value={form.regionCode}
                      onChange={(e) => setForm((s) => ({ ...s, regionCode: e.target.value }))}
                      placeholder="regionCode"
                      style={inputStyle}
                    />
                  </td>

                  <td style={tdLabelStyle}>위도</td>
                  <td>
                    <input
                      value={form.latitude}
                      onChange={(e) => setForm((s) => ({ ...s, latitude: e.target.value }))}
                      placeholder="예: 37.5665"
                      style={inputStyle}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>경도</td>
                  <td>
                    <input
                      value={form.longitude}
                      onChange={(e) => setForm((s) => ({ ...s, longitude: e.target.value }))}
                      placeholder="예: 126.9780"
                      style={inputStyle}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={tdLabelStyle}>설명</td>
                  <td colSpan={3}>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                      placeholder="설명"
                      style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={onSubmit} disabled={loading}>
                등록
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
