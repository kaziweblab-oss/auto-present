import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

//import icons here
import { RxCross2 } from "react-icons/rx";

//import kogo here
import appLogo from "../../assets/Gemini_Generated_Image_8duj9s8duj9s8duj.png";

import {
  processAttendanceSubmit,
  handelRollInput,
  collectAllRolls,
} from "../../utils/helper";
import { useNavigate } from "react-router-dom";
import { BiCloudUpload } from "react-icons/bi";

function Dashboard() {
  const [selectedSubjectsCode, setSelectedSubjectCodes] = useState<string[]>(
    [],
  );
  const [attendenceDate, setAttendanceDate] = useState<string>("");
  const [allValidRolls, setAllValidRolls] = useState<string[]>([]);
  const [selectedRolls, setSelectedRolls] = useState<string[]>([]);
  const [inputRoll, setInputRoll] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  // const [showLinkModal, setShowLinkModal] = useState(false);
  // const [newLink, setNewLink] = useState("");

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

    const formattedDate = `${year}-${month}-${day}`;

    setAttendanceDate(formattedDate);
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
    <>
      <section className="flex flex-col justify-center items-center gap-[2rem] ">
        <div className="flex flex-col gap-[1rem] justify-center items-center ">
          <img
            src={appLogo}
            alt="appLogo"
            className="flex w-[10rem] rounded-[0.5rem] shadow-[0_0_10px_#606080] "
          />
          <p className="text-[1.3rem] text-center ">Auto Present</p>
        </div>
        <div className="flex flex-col gap-[0.5rem] justify-center items-center border min-w-[80%] max-w-[33rem] min-h-[20rem]  p-8 rounded-[0.5rem] border-[#2f4edaa2] border-[2px] shadow-[0_8px_30px_rgb(47,78,218,0.25)] bg-[#2a2a32] ">
          <h3 className="text-[1.3rem] underline decoration-sky-400 pb-[0.5rem] underline-offset-8 ">
            Attendence Input
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
            className="flex flex-col gap-[0.5rem] w-[100%] p-4 "
          >
            <div className="flex flex-col text-[1.2rem] ">
              <label>Select Subjects : </label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !selectedSubjectsCode.includes(val)) {
                    setSelectedSubjectCodes([...selectedSubjectsCode, val]);
                  }
                }}
                value=""
                disabled={submitting}
                className="text-[#fff] border border-blue-500 p-[0.2rem_0.3rem] rounded "
              >
                <option
                  value=""
                  className="bg-[#2a2a32] appearance-none cursor-pointer "
                >
                  সাবজেক্ট কোড সিলেক্ট করুন...
                </option>
                {subjectCodes &&
                  subjectCodes
                    .filter(
                      (code: string) => !selectedSubjectsCode.includes(code),
                    )
                    .map((code: string) => {
                      return (
                        <option
                          key={code}
                          value={code}
                          className="bg-[#2a2a32] appearance-none cursor-pointer "
                        >
                          {code}
                        </option>
                      );
                    })}
              </select>

              {/* create custom stype for card hover */}

              <style
                dangerouslySetInnerHTML={{
                  __html: `
                  .my-parent-card:has(.my-child-btn:hover) {
                  color: #ef4444;
                  }`,
                }}
              />
              <div className="flex p-2 gap-4 flex-wrap ">
                {selectedSubjectsCode &&
                  selectedSubjectsCode.map((code: string) => (
                    <span
                      key={code}
                      className="flex gap-1 bg-[#2649e685] p-1 rounded justify-center items-center my-parent-card"
                    >
                      {code}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubjectCodes(
                            selectedSubjectsCode.filter((c) => c !== code),
                          );
                        }}
                        className="cursor-pointer my-child-btn "
                      >
                        <RxCross2 />
                      </button>
                    </span>
                  ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[1.2rem] ">
              <label>Select Date : </label>
              <input
                type="date"
                value={attendenceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
                disabled={submitting}
                className="border  border-blue-500 rounded p-1 focus:outline-none scheme-dark "
              />
            </div>

            <div className="flex flex-col gap-2 text-[1.2rem] ">
              <label>Present Rolls : </label>
              <div className="w-full bg-[#1e1e24] p-3 rounded min-h-[3rem] border border-blue-500 flex items-center gap-2 flex-wrap">
                {selectedRolls &&
                  selectedRolls.map((roll) => (
                    <span
                      key={roll}
                      className="flex gap-1 bg-[#2649e685] p-1 rounded justify-center items-center my-parent-card"
                    >
                      {roll}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRolls(
                            selectedRolls.filter((r) => r !== roll),
                          );
                        }}
                        className="cursor-pointer my-child-btn "
                      >
                        <RxCross2 />
                      </button>
                    </span>
                  ))}
                <textarea
                  rows={1}
                  placeholder={
                    selectedRolls.length === 0 ? "রোল লিখে Enter চাপুন" : ""
                  }
                  value={inputRoll}
                  onChange={(e) => setInputRoll(e.target.value)}
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
                  disabled={submitting}
                  className="resize-none  min-w-[6rem] flex-1 w-full p-1 focus:outline-none "
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-semibold rounded transition-all flex items-center justify-center "
            >
              {submitting ? (
                <>
                  <span>
                    <i className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 align-middle"></i>
                    Updating Sheet...
                  </span>
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <BiCloudUpload className="text-[1.4rem]" />
                  Submit Attendance to Sheet
                </span>
              )}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

export default Dashboard;
