

export default function AdMember(){
  return(
    <div className="adMain">
      <section className="adMain__wrap">

        {/* 타이틀 */}
        <article className="adMain__title">
          <h1><span>●</span> 회원 목록</h1>
        </article>

        {/* 필터/검색 + 로딩/정렬 */}
        <article className="adMain__nav">
          <div className="adMain__nav__search">
            <div className='filter-box-admin'>
              <span>검색범위</span>
              <span>(셀렉트)</span>
            
              <span>페이지당</span>
              <span>(셀렉트)</span>
            </div>
            <div className='search-box-admin'>
              <input
                placeholder="검색어를 입력해주세요."
              />
              <button type="button">
                검색
              </button>
              <button type="button">
                초기화
              </button>
            </div>
          </div>
          <div className="adMain__nav__sort">
            <div>
              로딩중 / 총 n개
            </div>

            <div>
              (sort 셀렉트)
            </div>
          </div>
        </article>

        {/* 테이블 */}
        <article className="adMain__table">
          <div>
            <table  className='adMain__table__MemberList'>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름(닉네임)</th>
                  <th>아이디</th>
                  <th>연락처</th>
                  <th>가입일</th>
                  <th>회원상태</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>1</td>
                  <td>홍길동</td>
                  <td>hong@mail.com</td>
                  <td>010-0000-0000</td>
                  <td>2000-00-00</td>
                  <td>일반회원</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
};
