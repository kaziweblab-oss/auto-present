//import functions from helper
import { handelSignUpBtn } from "../../utils/helper";

//import langueages here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

const languages: Record<string, typeof en> = { en, bn };

import bpiLogo from "../../assets/359844176_651933030290720_444162366615771219_n.jpg";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Home() {
  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].home;

  const navigate = useNavigate();
  const { token, sheetID } = useSelector((state: any) => state.authR);

  useEffect(() => {
    const savedSheetID = localStorage.getItem("sheetID") || sheetID;
    const savedToken = localStorage.getItem("token") || token;
    if (savedSheetID && savedToken) {
      navigate("/dashboard");
    } else if (savedToken && !savedSheetID) {
      navigate("/login");
    }
  }, [navigate, token, sheetID]);

  return (
    <section className="min-h-[75vh] mt-25 flex flex-col justify-center items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-8 md:p-12 flex flex-col justify-center items-center gap-6 text-center shadow-2xl">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
          <img
            src={bpiLogo}
            alt="Institute Logo"
            className="relative w-32 h-32 rounded-full border-2 border-emerald-500/50 object-cover shadow-lg"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-gray-100 text-3xl md:text-4xl font-extrabold tracking-wide">
            {t.welcome}
          </h1>
          <h2 className="text-gray-100 text-2xl md:text-3xl font-bold">
            {currentLang === "en" && (
              <span className="text-emerald-400 font-medium">to </span>
            )}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t.institute}
            </span>
          </h2>
        </div>

        <div className="space-y-3 max-w-md">
          <p className="text-emerald-400 font-medium text-lg tracking-wider uppercase">
            {t.department}
          </p>
          <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">
            {t.massage}
          </p>
        </div>

        <button
          className="mt-4 px-8 py-3 text-lg font-bold text-gray-900 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all duration-300 hover:from-emerald-500 hover:to-teal-600 hover:scale-105 active:scale-95 text-white cursor-pointer"
          onClick={() => handelSignUpBtn(navigate)}
        >
          {t.signUpBtn}
        </button>
      </div>
    </section>
  );
}

export default Home;
