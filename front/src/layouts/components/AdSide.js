import { Link } from 'react-router-dom';

export default function AdSide() {
  return (
    <aside className="aside">
      <div className='aside__wrap'>
        <h3><Link to="/admin">관리자페이지 홈</Link></h3>
        <ul>
          <li><h3>회원관리</h3></li>
          <li><Link to="/admin/member">→ 회원목록</Link></li>
          <li><Link to="/admin/suggestion">→ 회원문의</Link></li>

          <li><h3>식당관리</h3></li>
          <li><Link to="/admin/restaurant">→ 식당목록</Link></li>
          <li><Link to="/admin/restaurant/new">→ 식당등록</Link></li>
          <li><Link to="/admin/review">→ 리뷰목록</Link></li>

          <li><h3>태그관리</h3></li>
          <li><Link to="/admin/tag">→ 태그목록</Link></li>

          <li><h3>사이트관리</h3></li>
          <li><Link to="/admin">→ 유입통계</Link></li>
        </ul>
      </div>
    </aside>
  );
}
