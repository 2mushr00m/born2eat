import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signup } from "../../api/auth";
import Swal from 'sweetalert2'
import './Signup.scss'

export default function Signup(){
  const [form, setForm] = useState({
    email: '',
    password: '',
    phone: '',
    nickname: '',
  });

  const [isAgree, setIsAgree] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAgree) {
      Swal.fire({
        text: '이용약관에 동의해주세요.',
        confirmButtonText: '확인',
        scrollbarPadding: false,
        customClass: { popup: 'custom-popup', confirmButton: 'custom-button'}
      });
      return;
    }

    try {
      await signup({ ...form, isAgree });
    } catch (err) {
      console.error(err);
    }
  };

  return(
    <div className="signup_wrap">
      <section>
        <form id="signup" onSubmit={handleSubmit}>
          <h1>회원가입</h1>
          <ul id="signup_rel">
            <li>이메일 아이디<span> *</span></li>
            <li>
              <input
                name="email"
                type="email"
                value={form.email}
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
                onChange={handleChange}
                required
              />
            </li>
          </ul>

          <ul>
            <li>연락처<span> *</span></li>
            <li>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </li>
          </ul>

          <ul>
            <li>별명</li>
            <li>
              <input
                name="name"
                value={form.name}
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
            <Link to="/signup">[이용약관 전문보기]</Link>
          </label>

          <button type="submit">회원가입</button>
        </form>
      </section>
      <section className="link">
        <article>
          <p>이미 회원이라면</p><Link to='/login'>로그인</Link>
        </article>
      </section>
    </div>
  );
}
