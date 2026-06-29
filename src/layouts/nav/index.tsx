import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleLang } from "../../app/states/langueageSlice";
import { CgProfile } from "react-icons/cg";

import en from "../../lang/en.json";
import bn from "../../lang/bn.json";
import { useLocation, useNavigate } from "react-router-dom";

import { handelSignUpBtn, handelLogOutBtn } from "../../utils/helper";
import { logoutSuccess } from "../../app/states/authSlice";

const languages: Record<string, typeof en> = { en, bn };

function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const user = useSelector((state: any) => state.authR.user);

  const handelLanToggle = () => {
    dispatch(toggleLang());
  };

  const t = languages[currentLang].nav;
  const path = location.pathname;
  const userImage = user?.picture;

  const handelAccountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  // বাইরে ক্লিক করলে বা স্ক্রোল করলে ড্রপডাউন বন্ধ করার লজিক
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  // 🌟 অ্যাকাউন্ট ইনফো পেজে নেভিগেট করার ফাংশন
  const handleGoToAccount = () => {
    navigate("/account-info"); // আপনার রাউট অনুযায়ী /about-info তে পাঠানো হলো
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  // গাইড পেজে ডাটা সহ নেভিগেট করার ফাংশน
  const handleNavigateToGuide = (type: string) => {
    navigate("/guide", { state: { fromPath: path, type: type } });
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <section
      ref={menuRef}
      className="fixed top-0 left-0 right-0 h-16 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/60 px-4 md:px-8 flex items-center justify-between z-50 w-full"
    >
      {/* ল্যাঙ্গুয়েজ টগল বাটন */}
      <div
        onClick={handelLanToggle}
        className="relative flex items-center w-28 h-10 bg-gray-900 border border-gray-800 rounded-full p-1 cursor-pointer select-none overflow-hidden"
      >
        <div
          className={`absolute top-[3px] bottom-[3px] left-[3px] w-[50px] bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-transform duration-300 ease-out shadow-md shadow-blue-500/15 ${
            currentLang === "en" ? "translate-x-0" : "translate-x-[54px]"
          }`}
        ></div>

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors duration-300 ${currentLang === "en" ? "text-white" : "text-gray-500"}`}
        >
          En
        </span>
        <span
          className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors duration-300 ${currentLang === "bn" ? "text-white" : "text-gray-500"}`}
        >
          বাং
        </span>
      </div>

      {/* প্রোফাইল ও মেনু কন্টেইনার */}
      <div className="relative">
        <button
          type="button"
          onClick={handelAccountClick}
          className="cursor-pointer flex items-center justify-center focus:outline-none"
        >
          {userImage ? (
            <img
              src={userImage}
              alt="User Profile"
              className="w-9 h-9 rounded-full object-cover border border-gray-700 shadow-md hover:scale-105 transition-all"
            />
          ) : (
            <CgProfile className="text-3xl text-cyan-400 hover:text-cyan-300 hover:scale-105 transition-all" />
          )}
        </button>

        {/* ড্রপডাউন মেনু */}
        <div
          className={`absolute right-0 mt-3 w-52 bg-gray-900/95 backdrop-blur-lg border border-gray-800 rounded-2xl p-2 shadow-2xl transition-all duration-200 transform origin-top-right ${
            isMenuOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <ul className="flex flex-col gap-1">
            {/* ১. হোম পেজ কন্ডিশন (/, /home) */}
            {["/", "/home"].includes(path) && (
              <>
                <li
                  className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                  onClick={() => handleNavigateToGuide("signIn")}
                >
                  {t.howtoSignIn}
                </li>
                <li
                  className="px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors mt-1 border-t border-gray-800/50 pt-2.5"
                  onClick={() => {
                    handelSignUpBtn(navigate);
                    setIsMenuOpen(false);
                  }}
                >
                  {t.signInBtn}
                </li>
              </>
            )}

            {/* ২. সাইন আপ পেজ কন্ডিশন (/sign-up) */}
            {path === "/sign-up" && (
              <li
                className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                onClick={() => handleNavigateToGuide("signIn")}
              >
                {t.howtoSignIn}
              </li>
            )}

            {/* ৩. লগইন পেজ কন্ডিশন (/login) */}
            {path === "/login" && (
              <li
                className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                onClick={() => handleNavigateToGuide("login")}
              >
                {t.howtologin}
              </li>
            )}

            {/* ৪. ড্যাশবোর্ড বা অন্যান্য ইন্টারনাল পেজ কন্ডিশন (যেমন: /dashboard, /guide, /fix-issue, /about-info) */}
            {!["/", "/home", "/sign-up", "/login"].includes(path) && (
              <>
                <li
                  className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                  onClick={handleGoToAccount}
                >
                  {currentLang === "bn" ? "অ্যাকাউন্ট ইনফো" : "Account Info"}
                </li>

                {/* 🌟 হোম/ড্যাশবোর্ডে সরাসরি ফিরে যাওয়ার জন্য আরেকটি অপশন যোগ করা হলো */}
                <li
                  className="px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                  onClick={() => {
                    navigate("/dashboard");
                    setIsMenuOpen(false);
                  }}
                >
                  {currentLang === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}
                </li>

                <li className="px-4 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors">
                  {t.linkChange}
                </li>

                <li
                  className="px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors mt-1 border-t border-gray-800/50 pt-2.5"
                  onClick={() => {
                    handelLogOutBtn(navigate);
                    setIsMenuOpen(false);
                    dispatch(logoutSuccess());
                  }}
                >
                  {t.logOut}
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default Nav;
