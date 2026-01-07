import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, patchMe } from "../../api/me";
import "./MypageEdit.scss";

export default function MyPageEdit() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 기존정보 조회
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await getMe();
        const user = res.data?.result ?? res.result ?? res;

        setMe(user);

        setNickname(user?.nickname ?? "");
        setPhone(user?.phone ?? "");
        setProfileUrl(user?.profileUrl ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);
  if (loading) return null;

  // 연락처 수정
  const handlePhoneChange = (e) => {
    const onlyNumber = e.target.value.replace(/\D/g, "");
    setPhone(onlyNumber);
  };

  // 프로필사진 수정
  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfileFile(file);
    setProfileUrl(URL.createObjectURL(file)); // 미리보기용
  };

  // 회원정보 수정
  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("nickname", nickname);
    formData.append("phone", phone);

    if (profileFile) {
      formData.append("profileImage", profileFile);
    }

    await patchMe(formData);
    navigate("/mypage");
  };

  return (
    <div className="mypage">
      <section className="mypage__edit">
        <article className="mypage__edit__contents">
          <h2>회원정보수정</h2>
          <form onSubmit={(e) => {e.preventDefault(); handleSubmit();}}>
            <div>
              <ul>
                <li><h4>ID</h4></li>
                <li>{me.email}</li>
              </ul>
          
              <ul>
                <li><h4>연락처</h4></li>
                <li>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="숫자만 입력하세요."
                    maxLength={11}
                  />
                </li>
              </ul>
          
              <ul>
                <li><h4>닉네임</h4></li>
                <li>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="닉네임을 입력하세요"
                  />
                </li>
              </ul>
          
              <ul>
                <li><h4>프로필 사진 업로드</h4></li>
                <li>
                  {profileUrl ? (
                    <img
                      src={profileUrl}
                      alt="profile"
                      className="mypage__profile-img"
                    />
                  ) : (
                    <span>등록된 사진이 없습니다.</span>
                  )}
                </li>
                <li>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileChange}
                  />
                </li>
              </ul>
            </div>
          
            <div className="btn-box">
              <button type="button" onClick={() => navigate("/mypage")}>취소</button>
              <button type="submit">저장</button>
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}
