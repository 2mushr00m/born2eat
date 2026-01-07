// import './AboutPage.scss';

// export default function About(){
//   return(
//     <div className="main">
//       <section>
//         <p>사이트 소개 페이지입니다.</p>
//       </section>
//     </div>
//   );
// };
// AboutPage.js
import './AboutPage.scss';

export default function About() {
  return (
    <div className="about-container">
      <h1>BORN2EAT에 오신 것을 환영합니다!</h1>
      <section className="intro">
        <p>
          Born2Eat은 <b>검증된 방송 맛집 데이터</b>와 사용자 맞춤형 정보로,<br/>
          매 순간 완벽한 식사를 위한 최적의 선택을 돕는 맛집 플랫폼입니다.<br/><br/>
          복잡한 검색 없이 지역별, 종류별, 상황별 <b>스마트 필터링</b>으로<br/>
          여러분의 취향에 딱 맞는 맛집을 손쉽게 찾아보세요.<br/><br/>
          오늘, Born2Eat과 함께 잊지 못할 미식의 즐거움을 경험할 시간입니다.
        </p>
      </section>

      <section className="mission">
        <h2>우리의 미션</h2>
        <p>
          저희 Born2Eat의 미션은<br/>
          <h4>"신뢰할 수 있는 맛집 정보와 개인화된 미식 경험을 통해 사용자 여러분의 식탁에 즐거움을 더하는 것"</h4>
          입니다.<br />
          다양한 방송 맛집 데이터와 진솔한 사용자 리뷰를 기반으로, 단순한 맛집 탐색을 넘어 여러분의 취향과 상황에 꼭 맞는 완벽한 선택을 제안합니다.<br />
          모든 이가 매 순간 즐겁고 만족스러운 식사를 경험할 수 있도록, 끊임없이 연구하고 혁신하며 최고의 서비스를 제공하겠습니다.
        </p>
      </section>

      <section className="team">
        <h2>개발팀 소개</h2>
        <p>
          Born2Eat 개발팀은 소프트웨어 엔지니어, 데이터 분석가, UX 디자이너로 구성되어 있으며, 
          사용자 중심의 서비스 개발에 최선을 다하고 있습니다.
        </p>
      </section>

      <section className="contact">
        <h2>연락처</h2>
        <p>이메일: support@born2eat.com</p>
        <p>전화: 02-1234-5678</p>
      </section>
    </div>
  );
}