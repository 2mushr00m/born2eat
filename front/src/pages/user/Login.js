import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoginApi } from "../../api/auth";
import { useAuth } from "../../contexts/AuthContext";

import Swal from 'sweetalert2'
import './Login.scss'

export default function Login(){
  const [form, setForm] = useState({ email: '', password: '' });
  const emailRef = useRef(null);
  const { fetchMe } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      Swal.fire({
        text: '아이디와 비밀번호를 입력해 주세요.',
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
      await LoginApi(form);
      await fetchMe();
      nav('/');
    } catch {
      Swal.fire({
        text: '아이디 또는 비밀번호를 다시 확인해주세요.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: {
          popup: 'custom-popup',
          confirmButton: 'custom-button',
        },
      });
    }
  };

  return(
    <div className="login">
      <section className="login-form">
        <form className="login-form__form" onSubmit={handleSubmit}>
          <h1 className="login-form__title">LOGIN</h1>

          <ul className="login-form__field">
            <li className="login-form__label">ID</li>
            <li>
              <input
                ref={emailRef}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="이메일을 입력해주세요"
                className="login-form__input"
              />
            </li>
          </ul>

          <ul className="login-form__field">
            <li className="login-form__label">PASSWORD</li>
            <li>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력해 주세요"
                className="login-form__input"
              />
            </li>
          </ul>

          <label className="login-form__remember">
            <input type="checkbox" />
            <p>아이디 저장</p>
          </label>

          <button className="login-form__submit">로그인</button>
        </form>
      </section>

      <section className="login-links">
        <article className="login-links__item">
          <p>아이디/비밀번호를 잊었다면</p>
          <Link to="/login">아이디/비밀번호 찾기</Link>
        </article>

        <article className="login-links__item">
          <p>아직 회원이 아니라면</p>
          <Link to="/signup">회원가입</Link>
        </article>
      </section>
    </div>
  );
}
