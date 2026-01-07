import { Routes, Route } from 'react-router-dom';
import PrivateRoute from "./routes/PrivateRoute";
import AdminRoute from "./routes/AdminRoute";

import UsLayout from './layouts/UserLayout';
import AdLayout from './layouts/AdminLayout';

import Home from './pages/user/Home';
import Login from './pages/user/Login';
import Signup from './pages/user/Signup';
import MyPage from './pages/user/Mypage';
import MyPageEdit from './pages/user/MypageEdit';
import Restaurant from './pages/user/Restaurant';
import Suggestion from './pages/user/Suggestion';
import About from './pages/user/AboutPage';
import Privacy from './pages/user/PrivacyPolicyPage';

import AdHome from './pages/admin/AdHome';
import AdMember from './pages/admin/Member';
import AdSugg from './pages/admin/Suggestion';
import AdRest from './pages/admin/Restaurant';
import AdRestNew from './pages/admin/RestaurantNew';
import AdReview from './pages/admin/Review';
import AdTag from './pages/admin/Tag';
import AdMemDetail from './pages/admin/MemberDetail';
import AdSuggDetail from './pages/admin/SuggestionDetail';
import AdRestDetail from './pages/admin/RestaurantDetail';
import AdReviewDetail from './pages/admin/ReviewDetail';

// import NotFound from './pages/NotFound';
import ScrollToTop from './layouts/components/ScrollToTop';

import "./App.scss";
import "./styles/theme.scss";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* 사용자 페이지 */}
        <Route element={<UsLayout />}>
          <Route index element={<Home />} />
          <Route path="/restaurant/:id" element={<Restaurant />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/mypage"
            element={
              <PrivateRoute>
                <MyPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/mypage/edit"
            element={
              <PrivateRoute>
                <MyPageEdit />
              </PrivateRoute>
            }
          />
          <Route path="/suggestion" element={<Suggestion />}/>
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>
        
        {/* 관리자 페이지 */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdHome />} />
          <Route index element={<AdHome />} />
          <Route path="member" element={<AdMember />} />
          <Route path="member/:userId" element={<AdMemDetail />} />
          <Route path="suggestion" element={<AdSugg />} />
          <Route path="suggestion/:inquiryId" element={<AdSuggDetail />} />
          <Route path="restaurant" element={<AdRest />} />
          <Route path="restaurant/new" element={<AdRestNew />} />
          <Route path="restaurant/:restaurantId" element={<AdRestDetail />} />
          <Route path="review" element={<AdReview />} />
          <Route path="review/:reviewId" element={<AdReviewDetail />} />
          <Route path="tag" element={<AdTag />} />
        </Route>
      
        {/* 공통 */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </>
  );
}
