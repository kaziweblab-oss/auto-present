import { FaFacebook, FaGithub, FaLinkedin, FaYoutube } from "react-icons/fa";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import appLogo from "../../assets/appLogo.png";
import { handelSignUpBtn, handelLogOutBtn } from "../../utils/helper";
import { logoutSuccess } from "../../app/states/authSlice";

// languages ইম্পোর্ট
import bn from "../../lang/bn.json";
import en from "../../lang/en.json";

const languages: Record<string, typeof en> = { en, bn };

function Footer() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].footer;

  const loggedIn = useSelector((state: any) => state.authR.isLoggedIn);

  const isAuthOrHomePage =
    location.pathname === "/" ||
    location.pathname === "/sign-up" ||
    location.pathname === "/login";

  const shouldShowLogout = loggedIn && !isAuthOrHomePage;

  // লগআউট ফাংশন (ক্লিক করলে স্টোর ও লোকাল স্টোরেজ ক্লিয়ার হয়ে টপে যাবে)
  const handleLogout = () => {
    handelLogOutBtn(navigate);
    dispatch(logoutSuccess());
    window.scrollTo(0, 0);
  };

  // লগইন/সাইনআপ নেভিগেশন
  const handleLoginClick = () => {
    handelSignUpBtn(navigate);
    window.scrollTo(0, 0);
  };

  // যেকোনো সাধারণ পেজে নেভিগেট করার কমন ফাংশন
  const handleNavigate = (path: string, stateData?: any) => {
    navigate(path, stateData ? { state: stateData } : undefined);
    window.scrollTo(0, 0);
  };

  return (
    <footer className="bg-[#111827] text-gray-300 rounded-[0.5rem] w-full p-6 md:p-10 flex flex-col gap-10">
      <div className="flex flex-col gap-10 justify-between items-center w-full sm:flex-row sm:flex-wrap sm:items-start lg:justify-between">
        {/* লোগো ও ব্র্যান্ডিং সেকশন */}
        <div className="flex flex-col justify-center items-center sm:items-start w-full sm:w-[35%] lg:w-[25%] gap-4 text-center sm:text-left">
          <div
            className="flex flex-col sm:flex-row justify-center items-center gap-3 cursor-pointer"
            onClick={() => handleNavigate("/")}
          >
            <img
              src={appLogo}
              alt="app logo"
              className="w-[3.5rem] h-[3.5rem] rounded-full object-cover"
            />
            <h2 className="text-2xl font-bold text-white">{t.appName}</h2>
          </div>
          <p className="text-sm text-gray-400">{t.appDetails}</p>

          {/* সোশ্যাল লিংকস */}
          <div className="flex justify-center sm:justify-start items-center gap-4 mt-2">
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-gray-400 text-2xl transition cursor-pointer"
            >
              <FaGithub />
            </a>
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="text-[#0a66c2] hover:opacity-80 text-2xl transition cursor-pointer"
            >
              <FaLinkedin />
            </a>
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="text-[#1877f2] hover:opacity-80 text-2xl transition cursor-pointer"
            >
              <FaFacebook />
            </a>
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="text-[#ff0000] hover:opacity-80 text-2xl transition cursor-pointer"
            >
              <FaYoutube />
            </a>
          </div>
        </div>

        {/* Quick Links সেকশন */}
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <p className="text-white font-semibold text-lg border-b border-gray-700 pb-1">
            {t.quickLinks.title}
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <button
                onClick={shouldShowLogout ? handleLogout : handleLoginClick}
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {shouldShowLogout ? t.quickLinks.logOut : t.quickLinks.logIn}
              </button>
            </li>
            <li>
              {/* Home / Dashboard লিংক */}
              <button
                onClick={() => handleNavigate(loggedIn ? "/dashboard" : "/")}
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {loggedIn
                  ? currentLang === "bn"
                    ? "ড্যাশবোর্ড"
                    : "Dashboard"
                  : t.quickLinks.l1}
              </button>
            </li>
            <li>
              {/* About / Account Info লিংক */}
              <button
                onClick={() =>
                  handleNavigate(loggedIn ? "/about-info" : "/about-info")
                }
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {t.quickLinks.l2}
              </button>
            </li>
          </ul>
        </div>

        {/* Support সেকশন */}
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <p className="text-white font-semibold text-lg border-b border-gray-700 pb-1">
            {t.support.tite}
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <a
                href="mailto:support@email.com"
                className="hover:text-white transition cursor-pointer block"
              >
                {t.support.l1}
              </a>
            </li>
            <li>
              <a
                href="mailto:support@email.com?subject=Auto Present Bug Report"
                className="hover:text-white transition cursor-pointer block"
              >
                {t.support.l2}
              </a>
            </li>
            <li>
              {/* 🌟 গাইড বাটনটির অ্যালাইনমেন্ট ও ডিসপ্লে ফিক্স করা হয়েছে */}
              <button
                onClick={() =>
                  handleNavigate("/guide", {
                    fromPath: location.pathname,
                    type: "general",
                  })
                }
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {t.support.l3}
              </button>
            </li>
          </ul>
        </div>

        {/* Policy সেকশন */}
        <div className="flex flex-col gap-3 text-center sm:text-left">
          <p className="text-white font-semibold text-lg border-b border-gray-700 pb-1">
            {t.policy.title}
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              {/* Privacy Policy লিংক */}
              <button
                onClick={() => handleNavigate("/terms-of-service")}
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {t.policy.l1}
              </button>
            </li>
            <li>
              {/* Fix Issue লিংক */}
              <button
                onClick={() => handleNavigate("/privacy-policy")}
                className="hover:text-white transition cursor-pointer text-center sm:text-left w-full block"
              >
                {t.policy.l2}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <hr className="border-gray-800" />

      <div className="flex flex-col gap-1 justify-center items-center text-xs md:text-sm text-gray-500 text-center">
        <p>{t.copyRight.message1}</p>
        <p>{t.copyRight.message2}</p>
      </div>
    </footer>
  );
}

export default Footer;
