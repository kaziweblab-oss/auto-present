import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useGoogleAuth } from "../../hooks/useAuth";

// import icons here
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { FaArrowRightLong } from "react-icons/fa6";

// import languages here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

const languages: Record<string, typeof en> = { en, bn };

function SignUp() {
  const currentLan = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLan].signin;
  const navigate = useNavigate();

  const { googleLogin, errorMessage, setErrorMessage } =
    useGoogleAuth(currentLan);
  //conditional icon base with message
  const isSuccess = errorMessage === t.hook.sucess;
  const isAccessIssue = errorMessage === t.hook.acessMessage;

  return (
    <div className="min-h-[75vh] mt-10 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-8 md:p-10 flex flex-col justify-center items-center gap-6 text-center shadow-2xl">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20"></div>
          <span className="relative flex justify-center items-center">
            <FiCheckCircle className="text-[3.5rem] text-emerald-400 bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20 shadow-inner" />
          </span>
        </div>

        <p className="text-gray-300 text-base md:text-lg leading-relaxed font-light">
          {t.massage}
        </p>

        <button
          className="w-full mt-2 py-3 px-6 rounded-xl flex justify-center items-center gap-3 text-gray-800 font-semibold bg-white border border-gray-200 shadow-md transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => googleLogin()}
        >
          <FcGoogle className="text-2xl" />
          <span>{t.btn}</span>
        </button>
      </div>

      {errorMessage && (
        <div className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-all animate-fadeIn">
          <div className="relative flex flex-col justify-end items-center w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-2xl min-h-[16rem]">
            <p
              className={`text-lg font-medium leading-snug mt-4 ${isSuccess ? "text-emerald-400" : "text-rose-500"}`}
            >
              {errorMessage}
            </p>

            <div className="w-full mt-6 flex justify-center">
              {isAccessIssue ? (
                <button
                  className="w-full flex gap-2 justify-center items-center text-base font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 px-6 rounded-xl transition duration-300 shadow-lg shadow-blue-600/20 group mt-8 cursor-pointer"
                  onClick={() => {
                    navigate("/fix-issue");
                    setErrorMessage(null);
                  }}
                >
                  <span>Fix This Issue</span>
                  <FaArrowRightLong className="mt-1 transition-transform group-hover:translate-x-1 " />
                </button>
              ) : isSuccess ? (
                <button
                  className="w-full flex gap-2 justify-center items-center text-base font-bold bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-3 px-6 rounded-xl transition duration-300 shadow-lg shadow-emerald-500/20 group cursor-pointer "
                  onClick={() => {
                    navigate("/login");
                    setErrorMessage(null);
                  }}
                >
                  <span>Go To Login Page</span>
                  <FaArrowRightLong className="transition-transform group-hover:translate-x-1" />
                </button>
              ) : (
                <button
                  onClick={() => setErrorMessage(null)}
                  className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-rose-400 transition-all duration-300 active:scale-90 cursor-pointer mt-7 "
                >
                  <FiXCircle className="text-3xl" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
