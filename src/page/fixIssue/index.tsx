import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

//import text here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

//import video here
import fixIssueVideo from "../../assets/video/234416_medium.mp4";

//import icons here
import { BiArrowBack } from "react-icons/bi";

const languages: Record<string, typeof en> = { en, bn };

function FixIssue() {
  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].fixIssue;

  const [goFix, setGoFix] = useState<boolean>(false);

  const navigate = useNavigate();

  const handelFixClick = () => {
    setGoFix(true);
    window.open(
      "https://myaccount.google.com/connections",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section className="min-h-[85vh] mt-20 flex flex-col justify-center items-center gap-6 p-4 w-full max-w-xl mx-auto">
      <div className="text-center w-full">
        <p className="text-base md:text-lg text-gray-300 font-medium leading-relaxed bg-gray-900/30 p-4 border border-gray-800 rounded-xl backdrop-blur-md shadow-xl">
          {t.issue}
        </p>
      </div>

      <div className="w-full bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative group">
        <video
          src={fixIssueVideo}
          className="w-full aspect-video object-cover"
          controls
          playsInline
        />
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center mt-2">
        <button
          type="button"
          onClick={handelFixClick}
          className="w-full sm:w-1/2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/10 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all cursor-pointer text-center"
        >
          {t.fixBtn}
        </button>

        <button
          type="button"
          onClick={() => {
            navigate("/sign-up");
            window.scrollTo(0, 0);
          }}
          disabled={!goFix}
          className="w-full sm:w-1/2 py-3 px-6 rounded-xl border border-gray-700 bg-gray-900/50 text-gray-200 font-bold text-sm shadow-lg hover:bg-gray-800 hover:border-gray-600 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none disabled:transform-none flex items-center justify-center gap-2 cursor-pointer"
        >
          <BiArrowBack className="text-lg" />
          <span>{t.backBtn}</span>
        </button>
      </div>
    </section>
  );
}

export default FixIssue;
