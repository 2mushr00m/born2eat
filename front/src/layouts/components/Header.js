import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { loading, isLoggedIn, isAdmin, logout, user } = useAuth();
  const isAdminPage = pathname.startsWith("/admin");

  // 로고 클릭
  const handleLogoClick = () => {
    if (isAdminPage) {
      navigate("/admin");
    } else {
      navigate({ pathname: "/", search: "" });
    }
  };

  // 관리자페이지 전환
  const handleToggleClick = () => {
    if (isAdminPage) {
      navigate("/");
    } else {
      navigate("/admin");
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // 메뉴 순서
  const menuItems = [];
  if (!isLoggedIn) {
    menuItems.push({ label: "로그인", to: "/login" });
    menuItems.push({ label: "회원가입", to: "/signup" });
  } else {
    if (!isAdminPage) {
      menuItems.push({ label: "마이페이지", to: "/mypage" });
    }
  }

  const logoSrc = isAdminPage ? "/assets/logo_light.png" : "/assets/logo.png";

  if (loading) return null;

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
          <p className="header__welcome">
            {user?.nickname ? `${user.nickname}님, 어서 오세요!` : null}
          </p>
          <ul className="header__menu">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
          {isLoggedIn && (
            <button type="button" onClick={handleLogout}>
              로그아웃
            </button>
          )}
          {isLoggedIn && isAdmin && (
            <button
              type="button"
              className="toggle-click"
              onClick={handleToggleClick}>
              {isAdminPage ? "사용자" : "관리자"}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
