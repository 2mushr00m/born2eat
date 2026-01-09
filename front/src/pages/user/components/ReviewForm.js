import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../../api/api';
import './ReviewForm.scss';

export default function ReviewForm({ restaurantId, onClose, onSaved }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      Swal.fire({
        text: '리뷰 내용을 입력해 주세요.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: { popup: 'custom-popup', confirmButton: 'custom-button' },
      });
      return;
    }
    try {
      await api.post(`/restaurants/${restaurantId}/reviews`, {
        rating,
        content,
      });
      onSaved?.();
      Swal.fire({
        text: '리뷰가 등록되었습니다.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: { popup: 'custom-popup', confirmButton: 'custom-button' },
      });
    } catch (err) {
      Swal.fire({
        text: err.response?.data?.message || '리뷰 등록 중 오류가 발생했습니다.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: { popup: 'custom-popup', confirmButton: 'custom-button' },
      });
    }
  };

  return (
    <div className="ReviewForm">
      <form className="ReviewForm__contents" onSubmit={handleSubmit}>
        <h3>😋 맛있는 식사를 하셨나요?</h3>
        <div className="rating-box">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="star" onClick={() => setRating(n)} style={{ cursor: 'pointer', fontSize: '24px' }}>
              {n <= rating ? '★' : '☆'}
            </span>
          ))}
          <p>{rating}점</p>
        </div>

        <textarea
          value={content}
          rows="4"
          onChange={(e) => setContent(e.target.value)}
          placeholder="어떤 점이 마음에 드셨나요?"
        />

        <div className="btn-box">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
