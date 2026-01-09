import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AdminUserDetailApi } from '../../api/admin';

export default function AdMemDetail() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function fetchUser() {
      try {
        const { data } = await AdminUserDetailApi(userId);
        if (!alive) return;
        setUser(data.result);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchUser();
    return () => { alive = false; };
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>회원 정보를 찾을 수 없습니다.</p>;

  return (
    <div className="adMain">
      <section className="adMain__wrap">

        <article className="adMain__title">
          <h1><span>●</span> 회원 상세</h1>
        </article>

        <article className="adMain__table">
          <table>
            <tbody>
              <tr>
                <th>ID</th>
                <td>{user.userId}</td>
              </tr>
              <tr>
                <th>이메일</th>
                <td>{user.email}</td>
              </tr>
              <tr>
                <th>닉네임</th>
                <td>{user.nickname}</td>
              </tr>
              <tr>
                <th>권한</th>
                <td>{user.role}</td>
              </tr>
              <tr>
                <th>상태</th>
                <td>{user.status}</td>
              </tr>
              <tr>
                <th>가입일</th>
                <td>{user.createdAt?.slice(0, 10) || '-'}</td>
              </tr>
            </tbody>
          </table>
        </article>

      </section>
    </div>
  );
}
