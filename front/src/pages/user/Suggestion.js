import { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { postInquiry } from '../../api/inquiries';
import './Suggestion.scss';

const INQUIRY_TYPES = [
  { value: 'GENERAL', label: '일반 문의' },
  { value: 'BUG', label: '버그 신고' },
  { value: 'RESTAURANT', label: '음식점 관련' },
  { value: 'ACCOUNT', label: '계정 관련' },
  { value: 'OTHER', label: '기타' },
];

export default function Suggestion(){
  const [form, setForm] = useState({
    type: 'GENERAL',
    title: '',
    content: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
      Swal.fire({
        text: '제목과 내용을 입력해 주세요.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: {
          popup: 'custom-popup',
          confirmButton: 'custom-button',
        },
      });
      return;
    }

    try {
      setLoading(true);

      await postInquiry(form);

      Swal.fire({
        text: '문의가 등록되었습니다.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: {
          popup: 'custom-popup',
          confirmButton: 'custom-button',
        },
      });

      setForm({
        type: 'GENERAL',
        title: '',
        content: '',
      });
    } catch (err) {
      console.error(err);

      Swal.fire({
        text:
          err.response?.data?.message ??
          '문의 등록 중 오류가 발생했습니다.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: {
          popup: 'custom-popup',
          confirmButton: 'custom-button',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return(
    <div className="page-static">
      <section className="page-static__wrap inquiry">
        <div className="inquiry__title">
          <h1>📝 문의하기</h1>
          <p>사이트 이용에 궁금하신 사항이나<br/>
          제보해주실 맛집 정보가 있으신가요?</p>
        </div>
        <div className="inquiry__nav">
          <Link to="/mypage"><p>내 문의내역/답변확인</p></Link>
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              문의 유형
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                {INQUIRY_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            
            <label>
              제목
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="제목을 입력하세요"
              />
            </label>
          </div>
        
          <div>
            <label>
              내용
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="문의 내용을 입력하세요"
                rows={6}
              />
            </label>
          </div>
        
          <button type="submit" disabled={loading}>
            {loading ? '등록 중...' : '문의 등록'}
          </button>
        </form>
      </section>
    </div>
  );
};
