import { useState } from "react";
import Swal from "sweetalert2";
import api from "../../../api/api";
import "./ReviewForm.scss";

export default function ReviewForm({ restaurantId, onClose, onSaved }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      Swal.fire({
        text: "리뷰 내용을 입력해 주세요.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" }
      });
      return;
    }

    try {
      await api.post(`/restaurants/${restaurantId}/reviews`, {
        rating,
        content
      });

      onSaved?.();

      Swal.fire({
        text: "리뷰가 등록되었습니다.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" }
      });

    } catch (err) {
      Swal.fire({
        text: err.response?.data?.message || "리뷰 등록 중 오류가 발생했습니다.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" }
      });
    }
  };

  return (
    <div className="ReviewForm">
      <form className="ReviewForm__contents" onSubmit={handleSubmit}>

        <h3>리뷰 작성</h3>

        <div className="rating-box">
          {[1,2,3,4,5].map(n => (
            <span
              key={n}
              className={n <= rating ? "star is-active" : "star"}
              onClick={() => setRating(n)}
            >
              ★
            </span>
          ))}
          <p>{rating} 점</p>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="리뷰를 작성해 주세요"
        />

        <div className="btn-box">
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
