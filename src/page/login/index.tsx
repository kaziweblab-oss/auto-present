import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import axiosInstance from "../../api/axiousInstance";
import { extractId } from "../../utils/helper";
import { googleLogout } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

// import icons here
import { MdOutlineCancel } from "react-icons/md";
import { RiResetLeftFill } from "react-icons/ri";

// import functions here
import { loginSuccess, logoutSuccess } from "../../app/states/authSlice";

// import image here
import image from "../../assets/Gemini_Generated_Image_8duj9s8duj9s8duj.png";

// import languages Here
import bn from "../../lang/bn.json";
import en from "../../lang/en.json";

const languages: Record<string, typeof en> = { en, bn };

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentLan = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLan].login;

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

    if (!token) {
      setMessage(t.messages.acessLimitMessage);
      return;
    }

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
    <section className="min-h-[80vh] mt-25 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-10 flex flex-col justify-center items-center gap-6 shadow-2xl">
        <div className="flex flex-col gap-3 justify-center items-center text-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <img
              src={image}
              alt="logo"
              className="relative w-24 h-24 rounded-2xl border border-gray-700/50 object-cover shadow-lg"
            />
          </div>
          <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
            Auto Present
          </p>
        </div>

        <form
          onSubmit={handelLogInandFetchSubjectCodes}
          className="w-full flex flex-col gap-5"
        >
          <div className="flex justify-between items-center w-full p-3 bg-gray-900/60 border border-gray-800 rounded-xl text-xs md:text-sm">
            <div className="flex flex-col ml-1 text-left gap-0.5">
              <span className="text-gray-500 font-medium">
                {t.text.loginAs}
              </span>
              <span className="text-gray-300 truncate max-w-[12rem] sm:max-w-[14rem] font-mono">
                {userMail}
              </span>
            </div>
            <button
              type="button"
              onClick={handelResetSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 font-semibold hover:bg-rose-500/10 transition-colors duration-200 group cursor-pointer"
            >
              <RiResetLeftFill className="text-base transition-transform duration-500 group-hover:rotate-[-180deg]" />
              <span>Reset</span>
            </button>
          </div>

          <div className="w-full flex flex-col gap-2 text-left">
            <label
              htmlFor="sheetLink"
              className="text-sm font-medium text-gray-400"
            >
              {t.text.inputMessage}
            </label>

            <div className="flex items-center bg-gray-950 border border-gray-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
              <input
                id="sheetLink"
                type="text"
                name="sheetLink"
                value={sheetLink}
                onChange={(e) => setSheetLink(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                required
                className="w-full bg-transparent text-gray-200 p-3 text-sm focus:outline-none placeholder-gray-600"
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
                className="px-4 py-2 mr-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium text-xs rounded-lg transition-colors whitespace-nowrap active:scale-95 cursor-pointer"
              >
                Paste
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? t.verify.verifying : t.verify.loading}
          </button>
        </form>
      </div>

      {message && (
        <div className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="relative flex flex-col justify-center items-center gap-5 bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-sm text-center shadow-2xl animate-scaleUp">
            <p className="text-base md:text-lg font-medium text-rose-400 leading-relaxed pt-2">
              {message}
            </p>
            <button
              onClick={() => setMessage("")}
              className="p-1 rounded-full hover:bg-gray-800 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <MdOutlineCancel className="text-3xl" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default Login;
