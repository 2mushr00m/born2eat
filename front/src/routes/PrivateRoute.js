import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useEffect } from "react";

export default function PrivateRoute({ children }) {
  const { loading, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      Swal.fire({
        text: "로그인이 필요합니다.",
        confirmButtonText: "확인",
        scrollbarPadding: false,
        customClass: { popup: "custom-popup", confirmButton: "custom-button" }
      }).then(() => {
        navigate("/login", { replace: true });
      });
    }
  }, [loading, isLoggedIn, navigate]);

  if (loading) return null;

  return isLoggedIn ? children : null;
}
