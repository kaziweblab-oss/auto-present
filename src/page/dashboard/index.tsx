import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

//import languages here
import bn from "../../lang/bn.json";
import en from "../../lang/en.json";

const languages: Record<string, typeof en> = { en, bn };

// import icons here
import { RxCross2, RxChevronDown } from "react-icons/rx";
import { BiCloudUpload } from "react-icons/bi";

// import logo here
import appLogo from "../../assets/Gemini_Generated_Image_8duj9s8duj9s8duj.png";

import {
  processAttendanceSubmit,
  handelRollInput,
  collectAllRolls,
} from "../../utils/helper";

function Dashboard() {
  const [selectedSubjectsCode, setSelectedSubjectCodes] = useState<string[]>(
    [],
  );
  const [attendenceDate, setAttendanceDate] = useState<string>("");
  const [allValidRolls, setAllValidRolls] = useState<string[]>([]);
  const [selectedRolls, setSelectedRolls] = useState<string[]>([]);
  const [inputRoll, setInputRoll] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const currentLan = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLan].dashboard;

  const { token, sheetID, subjectCodes } = useSelector(
    (state: any) => state.authR,
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/sign-up");
    } else if (!sheetID) {
      navigate("/login");
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    setAttendanceDate(`${year}-${month}-${day}`);
  }, [token, sheetID, navigate]);

  useEffect(() => {
    collectAllRolls({
      selectedSubjectsCode,
      setAllValidRolls,
      setSelectedRolls,
      sheetID,
    });
  }, [selectedSubjectsCode, sheetID]);

  return (
    <section className="min-h-[85vh] mt-25 flex flex-col justify-center items-center gap-6 p-4">
      <div className="flex flex-col gap-2 justify-center items-center text-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20"></div>
          <img
            src={appLogo}
            alt="appLogo"
            className="relative w-24 h-24 rounded-2xl border border-gray-800/50 object-cover shadow-lg"
          />
        </div>
        <p className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
          Auto Present Dashboard
        </p>
      </div>

      <div className="w-full max-w-xl bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col justify-center items-center gap-4 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-100 tracking-wide pb-1 border-b-2 border-blue-500/50">
          {t.title}
        </h3>

        <form
          onSubmit={(e) => {
            processAttendanceSubmit({
              e,
              sheetID,
              selectedSubjects: selectedSubjectsCode,
              attendanceDate: attendenceDate,
              selectedRolls,
              setSubmitting,
              setSelectedRolls,
              setInputRoll,
              setAttendanceDate,
              setSelectedSubjectCodes,
            });
          }}
          className="w-full flex flex-col gap-5 mt-2"
        >
          <div className="flex flex-col gap-1.5 text-left relative">
            <label className="text-sm font-medium text-gray-400">
              {t.subjectCodeTitle}
            </label>

            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex justify-between items-center bg-gray-950 text-gray-300 border border-gray-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm focus:outline-none transition-all cursor-pointer disabled:opacity-50"
            >
              <span
                className={
                  selectedSubjectsCode.length === 0
                    ? "text-gray-400"
                    : "text-gray-200"
                }
              >
                {t.subjectCodeMessage}
              </span>
              <RxChevronDown
                className={`text-gray-400 text-lg transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Custom style for cross hover, scroll hide, and number spinner Remove */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                .my-parent-card:has(.my-child-btn:hover) {
                  background-color: rgba(239, 68, 68, 0.2) !important;
                  border-color: rgba(239, 68, 68, 0.4) !important;
                  color: #ef4444 !important;
                }
                .hide-scrollbar {
                  -ms-overflow-style: none;  /* IE and Edge */
                  scrollbar-width: none;  /* Firefox */
                }
                .hide-scrollbar::-webkit-scrollbar {
                  display: none; 
                }
                /* For Chrome, Safari, Edge, Opera */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                /* For Firefox */
                input[type=number] {
                  -moz-appearance: textfield;
                }
                `,
              }}
            />

            {isDropdownOpen && (
              <div className="hide-scrollbar absolute z-50 left-0 right-0 top-[4.5rem] mt-2 p-1.5 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                {subjectCodes &&
                  subjectCodes
                    .filter(
                      (code: string) => !selectedSubjectsCode.includes(code),
                    )
                    .map((code: string) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectCodes([
                            ...selectedSubjectsCode,
                            code,
                          ]);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                      >
                        {code}
                      </button>
                    ))}

                {subjectCodes &&
                  subjectCodes.filter(
                    (code: string) => !selectedSubjectsCode.includes(code),
                  ).length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No subjects available
                    </p>
                  )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap mt-1">
              {selectedSubjectsCode.map((code: string) => (
                <span
                  key={code}
                  className="my-parent-card flex items-center h-[2.2rem] w-[5.2rem] justify-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 text-xs font-semibold font-mono rounded-lg transition-all leading-none"
                >
                  <span className="leading-none pt-[1px]">{code}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSubjectCodes(
                        selectedSubjectsCode.filter((c) => c !== code),
                      )
                    }
                    className="my-child-btn text-sm hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                  >
                    <RxCross2 />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-sm font-medium text-gray-400">
              {t.dateTitle}
            </label>
            <input
              type="date"
              value={attendenceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
              disabled={submitting}
              className="w-full bg-gray-950 text-gray-300 border border-gray-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm focus:outline-none transition-all scheme-dark cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-sm font-medium text-gray-400">
              {t.rollInputTitle}
            </label>
            <div className="hide-scrollbar w-full bg-gray-950 border border-gray-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10 p-3 rounded-xl min-h-[4.5rem] max-h-32 overflow-y-auto flex items-center gap-2 flex-wrap transition-all">
              {selectedRolls.map((roll) => (
                <span
                  key={roll}
                  className="my-parent-card flex items-center justify-center w-[5rem] h-[2.3rem] gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold font-mono rounded-lg transition-all leading-none"
                >
                  <span className="leading-none pt-[1px]">{roll}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRolls(selectedRolls.filter((r) => r !== roll))
                    }
                    className="my-child-btn text-sm hover:scale-110 transition-transform cursor-pointer flex items-center justify-center"
                  >
                    <RxCross2 />
                  </button>
                </span>
              ))}
              <input
                type="number"
                placeholder={
                  selectedRolls.length === 0 ? t.rollInputMessage : ""
                }
                value={inputRoll}
                disabled={submitting}
                onChange={(e) => {
                  const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                  setInputRoll(onlyNums);
                }}
                onKeyDown={(e) => {
                  handelRollInput({
                    e,
                    inputRoll,
                    selectedSubjectsCode,
                    allValidRolls,
                    selectedRolls,
                    setSelectedRolls,
                    setInputRoll,
                  });
                }}
                className="bg-transparent text-gray-200 text-sm focus:outline-none flex-1 min-w-[7rem] h-[2.3rem] placeholder-gray-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <i className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></i>
                <span>{t.btnLoadingMessage}</span>
              </>
            ) : (
              <>
                <BiCloudUpload className="text-2xl" />
                <span>{t.btnMessage}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Dashboard;
