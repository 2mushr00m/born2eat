import { Link } from "react-router-dom";

export default function AdRestNew(){
  return(
    <div className="adMain">
      <section className="adMain__wrap">
        <article className="adMain__title">
          <h1><span>●</span> 식당 등록</h1>
          <Link to = "/admin/restaurant">
            <button type="button">→ 전체 식당 목록</button>
          </Link>
        </article>
        <article>
        </article>
      </section>
    </div>
  );
};
