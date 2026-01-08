import './AboutPage.scss';

export default function About() {
  return (
    <div className="page-static">
      <div className="page-static__wrap about">
        <section className="about__title">
          <h1>About Born2Eat</h1>
          <p>
            Born2Eat은 <b>검증된 방송 맛집 데이터</b>와 사용자 맞춤형 정보로,<br/>
            매 순간 완벽한 식사를 위한 최적의 선택을 돕는 맛집 플랫폼입니다.<br/><br/>
            복잡한 검색 없이 지역별, 종류별, 상황별 <b>스마트 필터링</b>으로<br/>
            여러분의 취향에 딱 맞는 맛집을 손쉽게 찾아보세요!
          </p>
        </section>
        
        <section className="about__intro">
          <h2>사이트 소개</h2>
          <p>
            저희 Born2Eat은 <b>신뢰할 수 있는 맛집 정보와 개인화된 미식 경험을 통해 사용자 여러분의 식탁에 즐거움을 더하는 것</b>을 목표로 하고 있습니다.
            다양한 방송 맛집 데이터와 진솔한 사용자 리뷰를 기반으로, 단순한 맛집 탐색을 넘어 여러분의 취향과 상황에 꼭 맞는 완벽한 선택을 제안해드립니다.
            모든 이가 매 순간 즐겁고 만족스러운 식사를 경험할 수 있도록, 끊임없이 연구하고 혁신하며 최고의 서비스를 제공하고 있습니다.
          </p>
        </section>

        <section className="about__contact">
          <h2>연락처</h2>
          <p>이메일: support@born2eat.com</p>
          <p>전화: 02-1234-5678</p>
        </section>
      </div>
    </div>
  );
}
