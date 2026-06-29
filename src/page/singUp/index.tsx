import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { useGoogleAuth } from "../../hooks/useAuth";

//import icons here
import { FiCheckCircle, FiXCircle } from "react-icons/fi";
import { FaArrowRightLong } from "react-icons/fa6";

//import langueages here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

const languages: Record<string, typeof en> = { en, bn };

function SignUp() {
  const currentLan = useSelector((state: any) => state.langueageR.lang);

  const t = languages[currentLan].signin;

  const navigate = useNavigate();

  const { googleLogin, errorMessage, setErrorMessage } =
    useGoogleAuth(currentLan);

  return (
    <div className="h-[70vh]">
      <div className=" h-[100%] flex flex-col justify-center items-center">
        <div className="flex flex-col gap-4 justify-center items-center text-[1.3rem] w-[30rem] h-[20rem] bg-[#2a2a32a6] backdrop-blur-[10px] border-[1px] border-[rgba(255,255,255,0.1)] rounded-[1.2rem] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.4),0_0_1px_rgba(255,255,255,0.1)]">
          <span>
            <FiCheckCircle className="text-[3rem] text-[#34d399] bg-[rgba(16,185,129,0.15)] p-3 rounded-[50%]" />
          </span>

          <p className="text-center ">{t.massage}</p>
          <button
            className="p-2 rounded-[0.5rem] flex justify-center items-center gap-[0.2rem] text-[#1f1f1f] bg-white transition duration-300 ease-in-out cursor-pointer hover:bg-[rgb(67,64,99)] hover:shadow-[0_0_10px_rgb(21,22,29)] hover:text-[#fff] hover:scale-[1.05] "
            onClick={() => googleLogin()}
          >
            <i>
              <FcGoogle />
            </i>{" "}
            {t.btn}
          </button>
        </div>
      </div>
      {errorMessage && (
        <div className="flex fixed top-0 left-0 w-[100vw] h-[100vh] bg-[rgba(0,0,0,0.45)] backdrop-blur-[8px] justify-center items-center z-999 ">
          <div className="flex justify-end pb-[2.3rem] items-center flex-col gap-[3rem] w-[25rem] h-[15rem] bg-[#fff] rounded-[1.5rem] ">
            <p
              className={`${"text-[1.1rem] text-center "} ${errorMessage === t.hook.sucess ? "text-[green]" : "text-[red]"}`}
            >
              {errorMessage}
            </p>

            {errorMessage === t.hook.acessMessage ? (
              <>
                <button
                  className="flex gap-[0.5rem] justify-center items-center text-[1.1rem] font-semibold border-2 border-[#1a3681] p-[0.4rem_1.2rem] rounded-[0.5rem] cursor-pointer bg-[#1a3681] text-white transition duration-300 ease-in-out hover:bg-[#12265c] hover:border-[#12265c] hover:scale-[1.02] shadow-sm group "
                  onClick={() => {
                    navigate("/fix-issue");
                    setErrorMessage(null);
                  }}
                >
                  <span className="flex justify-center items-center  ">
                    Fix This Issue
                  </span>
                  <FaArrowRightLong className="flex justify-center items-center transition-all group-hover:translate-x-1 " />
                </button>
              </>
            ) : (
              <>
                {errorMessage === t.hook.sucess ? (
                  <>
                    <button
                      className="flex gap-[0.5rem] justify-center items-center text-[1.1rem] font-semibold border-2 border-[#10b981] p-[0.4rem_1.2rem] rounded-[0.5rem] cursor-pointer bg-[#10b981] text-white transition duration-300 ease-in-out hover:bg-[#059669] hover:border-[#059669] hover:scale-[1.02] shadow-sm group "
                      onClick={() => {
                        navigate("/login");
                        setErrorMessage(null);
                      }}
                    >
                      <span className="flex justify-center items-center  ">
                        Go To Login Page
                      </span>
                      <FaArrowRightLong className="flex justify-center items-center transition-all group-hover:translate-x-1 " />
                    </button>
                  </>
                ) : (
                  <>
                    <FiXCircle
                      className="text-[#d9363e] text-[2rem] cursor-pointer hover:text-red-500 transition-all duration-300 hover:scale-[1.1] "
                      onClick={() => {
                        setErrorMessage(null);
                      }}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SignUp;
