import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupApi } from "../../api/auth.js";
import Swal from "sweetalert2";

import TermsPage from "./components/TermsPage.js";
import "./Signup.scss";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
    nickname: "",
  });

  const [isAgree, setIsAgree] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // 모달 열렸을 때 배경 스크롤 고정
  useEffect(() => {
    if (showModal) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%"; // 가로 스크롤 방지
    } else {
      const scrollY = -parseInt(document.body.style.top || "0");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY); // 이전 위치로 스크롤 복원
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 추가 검증 로직 (C)
    if (!form.email) {
      Swal.fire({
        text: "이메일을 입력해 주세요.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" },
      });
      return;
    }

    if (!form.password) {
      Swal.fire({
        text: "비밀번호를 입력해 주세요.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" },
      });
      return;
    }

    if (!isAgree) {
      Swal.fire({
        text: "이용약관에 동의해주세요.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" },
      });
      return;
    }

    try {
      await signupApi(form);

      // navigate 방식으로 변경 (B)
      Swal.fire({
        text: "회원가입이 완료되었습니다.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" },
      }).then(() => {
        navigate("/login");
      });
    } catch (err) {
      console.error(err);

      Swal.fire({
        text: err.response?.data?.message || "회원가입 중 오류가 발생했습니다.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" },
      });
    }
  };

  return (
    <div className="page-static signup signup">
      <div className="page-static__wrap">
        <section className="signup-form">
          <form onSubmit={handleSubmit}>
            <h1>회원가입</h1>

            <ul>
              <li>이메일 아이디<span> *</span></li>
              <li>
                <input
                  ref={emailRef}
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="이메일을 입력해주세요"
                  onChange={handleChange}
                  required
                />
              </li>
            </ul>
        
            <ul>
              <li>비밀번호<span> *</span></li>
              <li>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  placeholder="비밀번호를 입력해주세요"
                  onChange={handleChange}
                  required
                />
              </li>
            </ul>
        
            <ul>
              <li>연락처</li>
              <li>
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  placeholder="연락처를 숫자만 입력해주세요"
                  onChange={handleChange}
                  pattern="[0-9]{10,11}"
                />
              </li>
            </ul>
        
            <ul>
              <li>닉네임</li>
              <li>
                <input
                  name="nickname"
                  value={form.nickname}
                  placeholder="사용하실 닉네임을 입력해주세요"
                  onChange={handleChange}
                />
              </li>
            </ul>
        
            <label>
              <p>
                <input
                  type="checkbox"
                  checked={isAgree}
                  onChange={(e) => setIsAgree(e.target.checked)}
                />
                이용약관에 동의합니다.
              </p>
              <span onClick={() => setShowModal(true)}>
                [이용약관 전문보기]
              </span>
            </label>
            {showModal && (
              <div className="modal">
                <div className="modal__overlay" onClick={() => setShowModal(false)} />
                <div className="modal__content">
                  <TermsPage />
                  <button onClick={() => setShowModal(false)}>닫기</button>
                </div>
              </div>
            )}
            <button type="submit">회원가입</button>
          </form>
        </section>
        
        <section className="login-links">
          <article className="login-links__item">
            <p>이미 회원이라면</p>
            <Link to="/login">로그인</Link>
          </article>
        </section>
      </div>
    </div>
  );
}
