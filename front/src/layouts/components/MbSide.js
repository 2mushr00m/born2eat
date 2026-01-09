import { useEffect } from 'react';
// import { Link } from 'react-router-dom';

export default function MbSide({ isOpen, onClose }) {
  // ESC로 창 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <aside>
      <div className={`mbside ${isOpen ? "is-open" : ""}`}>
        <div className="mbside__backdrop" onClick={onClose} />

        <aside className="mbside__panel">
          <button
            type="button"
            className="mbside__close"
            onClick={onClose}
          >
            ✕
          </button>

          <nav className="mbside__nav">
            {/* 환영 문구, 메뉴, 로그아웃, 관리자 전환 등 */}
          </nav>
        </aside>
      </div>
    </aside>
  );
}
