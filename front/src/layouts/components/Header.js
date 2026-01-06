import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { loading, isLoggedIn, isAdmin, logout } = useAuth();

  const isAdminPage = pathname.startsWith("/admin");

  const handleLogoClick = () => {
    if (isAdminPage) {
      window.location.reload();
    } else {
      navigate({ pathname: "/", search: "" });
    }
  };

  // 로딩 중이면 메뉴 렌더링하지 않음
  if (loading) return null;
  //
  const handleLogout = async () => {
    await logout(); // user 상태 초기화
    navigate("/"); // 루트 페이지로 이동
  };

  // 메뉴 데이터 정의
  const menuItems = [];

  if (!isLoggedIn) {
    menuItems.push({ label: "로그인", to: "/login" });
    menuItems.push({ label: "회원가입", to: "/signup" });
  } else {
    if (!isAdminPage) {
      menuItems.push({ label: "마이페이지", to: "/mypage" });
    }
    menuItems.push({ label: "로그아웃", action: handleLogout });
    if (isAdmin) {
      if (isAdminPage) {
        menuItems.push({ label: "사용자", to: "/" }); // 관리자 페이지에서는 사용자 메뉴
      } else {
        menuItems.push({ label: "관리자", to: "/admin" }); // 사용자 페이지에서는 관리자 메뉴
      }
    }
  }

  const logoSrc = isAdminPage ? "/assets/logo_light.png" : "/assets/logo.png";

  return (
    <header className="header">
      <div className="header__wrap">
        {/* 로고 */}
        <div className="header__logo">
          <button type="button" className="header__logo-btn" onClick={handleLogoClick}>
            <img src={logoSrc} alt="logo" />
            {isAdminPage && <p>admin</p>}
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="header__nav">
          <ul className="header__menu">
            {/* {isLoggedIn && user?.nickname && (<li className="header__nickname"><span>어서오세요, {user.nickname}님!</span></li>)} */}

            {menuItems.map((item, idx) =>
              item.to ? (
                <li key={idx}>
                  <Link to={item.to}>{item.label}</Link>
                </li>
              ) : (
                <li key={idx}>
                  <button type="button" onClick={item.action}>
                    {item.label}
                  </button>
                </li>
              )
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
