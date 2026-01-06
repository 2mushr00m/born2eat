import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__wrap">
        <div className="footer__left">
          <img src="/assets/logo_light.png" alt="logo_foot" />
          <hr/>
          <p>본 사이트는 학습·교육 목적으로 제작된 비영리적 프로젝트로서,<br/>
          사용된 이미지 및 자료의 저작권은 각 권리자에게 있습니다.</p>
        </div>
        <div className="footer__right">
          <Link to='/about'><p>사이트소개</p></Link>
          <p>|</p>
          <Link to='/privacy'><p>개인정보처리방침</p></Link>
          <p>|</p>
          <Link to='/suggestion'><p>문의/제보</p></Link>
        </div>
      </div>
    </footer>
  );
}
