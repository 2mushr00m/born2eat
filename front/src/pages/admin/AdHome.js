import Adboard from './Adboard';
import './Admin.scss';

export default function AdHome(){
  return(
    <div className="adMain">
      <section className="adMain__wrap adHome">
        <article className="adMain__title">
          <h1><span>●</span> 관리자 대시보드</h1>
        </article>
        <article>
          <Adboard />
        </article>
      </section>
    </div>
  );
};
