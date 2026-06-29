import { BrowserRouter, Route, Routes } from "react-router-dom";

//import style here
import style from "./routes.module.css";

//import element here
import Nav from "../layouts/nav";
import Footer from "../layouts/footer";
import Home from "../page/home";
import Dashboard from "../page/dashboard";
import FixIssue from "../page/fixIssue";
import AboutInfo from "../page/aboutInfo";
import Guide from "../page/guide";
import PrivacyPolicy from "../page/privacyPolicy";
import Err from "../page/err";
import Login from "../page/login";
import SignUp from "../page/singUp";
import TermsOfService from "../page/termsOfService";
import AccountInfo from "../page/account";

function Router() {
  return (
    <>
      <div className={style.main}>
        <BrowserRouter>
          <Nav />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/account-info" element={<AccountInfo />} />
            <Route path="/fix-issue" element={<FixIssue />} />
            <Route path="/about-info" element={<AboutInfo />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />G
            <Route path="*" element={<Err />} />
          </Routes>
          <Footer />
        </BrowserRouter>
      </div>
    </>
  );
}

export default Router;
