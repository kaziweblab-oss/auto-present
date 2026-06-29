import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import axiosInstance from "../../api/axiousInstance";
import { extractId } from "../../utils/helper";
import { googleLogout } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

//import icons here
import { MdOutlineCancel } from "react-icons/md";
import { RiResetLeftFill } from "react-icons/ri";

//import functions here
import { loginSuccess, logoutSuccess } from "../../app/states/authSlice";

//import image here
import image from "../../assets/Gemini_Generated_Image_8duj9s8duj9s8duj.png";

//import langueages Here
import bn from "../../lang/bn.json";
import en from "../../lang/en.json";

const langueges: Record<string, typeof en> = { en, bn };

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentLan = useSelector((state: any) => state.langueageR.lang);

  const t = langueges[currentLan].login;

  const [sheetLink, setSheetLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const { token } = useSelector((state: any) => state.authR);
  const userMail = useSelector((state: any) => state.authR.user.email);

  useEffect(() => {
    const savedSheetID = localStorage.getItem("sheetID");
    if (savedSheetID) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handelLogInandFetchSubjectCodes = async (e: React.FormEvent) => {
    e.preventDefault();

    //check token
    if (!token) {
      setMessage(t.messages.acessLimitMessage);
      return;
    }

    //sheet link check
    const trimmedLink = sheetLink.trim();

    if (!trimmedLink) {
      setMessage(t.messages.linkBLankErrorMessage);
      return;
    }

    setIsLoading(true);
    setMessage(t.messages.acessCheckingMessage);

    const sheetID = extractId(trimmedLink);

    if (!sheetID) {
      setMessage(t.messages.linkFalseMessage);
      setIsLoading(false);
      return;
    }

    try {
      //sheet api call
      const res = await axiosInstance.get(
        `/${sheetID}?fields=sheets.properties.title`,
      );

      const subjectCodes = res.data.sheets.map(
        (sheet: any) => sheet.properties.title,
      );

      setMessage(t.messages.editAcessCheckinMessage);

      const driveRes = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${sheetID}?fields=capabilities/canEdit`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (driveRes.data && driveRes.data.capabilities) {
        const canEdit = driveRes.data.capabilities.canEdit;

        if (!canEdit) {
          setMessage(t.messages.wrongMailMessage);
          setIsLoading(false);
          return;
        }
      }

      dispatch(loginSuccess({ sheetID: sheetID, subjectCodes }));

      setMessage(t.messages.successMessage);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 403) {
        setMessage(t.messages.acessDeniedMessage);
      } else if (err.response?.status === 404) {
        setMessage(t.messages.sheetNotFoundMessage);
      } else {
        setMessage(t.messages.loadingFailMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handelResetSession = () => {
    googleLogout();
    setSheetLink("");

    setMessage(t.messages.sessionClearMessage);
    dispatch(logoutSuccess());
    navigate("/");
  };

  return (
    <section className="flex flex-col justify-center items-center gap-8 ">
      <div className="flex flex-col gap-4 justify-center items-center ">
        <img
          src={image}
          alt="logo"
          className="w-[6rem] rounded-[1rem] shadow-[0_0_10px_#4c5a7479] sm:w-[8rem] "
        />
        <p className="text-[1.1rem] text-center font-semibold sm:text-[1.3rem] ">
          Auto Present
        </p>
      </div>
      <form
        onSubmit={handelLogInandFetchSubjectCodes}
        className="flex flex-col gap-6 w-[60%] max-w-[30rem]  justify-center items-center "
      >
        <div className="flex flex-col gap-4 text-[1.2rem] justify-center items-center w-full ">
          <div className="flex justify-between  w-full border p-2 text-[0.8rem] sm:text-[1rem] rounded-[0.7rem] border-slate-600 ">
            <p className="gap-[0.1rem] flex flex-col ml-2 ">
              <span>{t.text.loginAs} </span>
              <span>{userMail}</span>
            </p>
            <button
              type="button"
              onClick={handelResetSession}
              className="text-[0.8rem] sm:text-[1rem] flex flex-col mr-2 justify-center items-center text-[red] cursor-pointer hover:text-[#ff0000c2]  group "
            >
              <span className="flex items-center justify-center gap-[0.2rem]  ">
                {" "}
                <RiResetLeftFill className="transition-transform duration-700 ease group-hover:rotate-[-360deg] " />{" "}
                Reset{" "}
              </span>
              <span>Session</span>
            </button>
          </div>
          <div className="text-[0.9rem] flex flex-col gap-1 sm:text-[1rem] w-full ">
            <label className=" w-full ">
              <span>{t.text.inputMessage}</span>{" "}
            </label>
            <div className=" border  rounded border-slate-600 ">
              <input
                id="sheetLink"
                type="text"
                name="sheetLink"
                value={sheetLink}
                onChange={(e) => setSheetLink(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                required
                className="focus:outline-none p-2 pr-1 w-[70%] h-full sm:w-[75%] md:w-[80%] "
              />

              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setSheetLink(text);
                  } catch (err) {
                    setMessage(t.messages.pastLinDenied);
                  }
                }}
                className="text-center w-[30%] h-[2.1rem] text-center bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 rounded cursor-pointer sm:w-[25%] md:w-[20%] "
              >
                Paste Link
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="text-[1.1rem] border w-full h-[2rem] rounded bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] border-slate-600 cursor-pointer transition-all hover:scale-[1.05] mb-[2rem] sm:mb-[5rem] "
        >
          {isLoading ? t.verify.verifying : t.verify.loading}
        </button>
      </form>
      {message && (
        <>
          <div className="fixed inset-0 w-screen h-screen bg-black/40 backdrop-blur-md flex justify-center items-center z-[9999] animate-[fadeIn_0.3s_ease-outG] ">
            <div className="flex flex-col justify-center items-center gap-4 bg-white/85 border border-red-500/20 backdrop-blur-sm p-5 sm:p-6 rounded-2xl w-[90%] max-w-[420px] shadow-[0_10px_30px_rgba(0,0,0,0.2)] animate-[scaleUp_0.3s_cubic-bezier(0.34,1.56,0.64,64,1)]   ">
              <p className="text-[1.2rem] text-center font-medium text-[#dc3545] leading-relaxed m-0 flex-1 ">
                {message}
              </p>
              <MdOutlineCancel
                onClick={() => setMessage("")}
                className="text-[2rem] text-gray-500 cursor-pointer transition-all duration-200 ease-in-out hover:text-[#dc3545] hover:scale-115 flex-shrink-0 "
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default Login;
