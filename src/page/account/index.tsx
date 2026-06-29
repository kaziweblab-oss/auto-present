import { useState } from "react";
import { useSelector } from "react-redux";
import {
  BiUser,
  BiEnvelope,
  BiLinkExternal,
  BiCopy,
  BiCheck,
  // BiKey,
  BiGlobe,
} from "react-icons/bi";

function AccountInfo() {
  // রেভাক্স স্টেট থেকে ডাটা নেওয়ার জন্য (আপনার প্রোজেক্টের নাম অনুযায়ী পরিবর্তন করে নিতে পারেন)
  const currentLang =
    useSelector((state: any) => state.langueageR?.lang) || "en";
  const { sheetID } = useSelector((state: any) => state.authR) || {
    sheetID: "1xX_Example_Sheet_ID_xxxx",
  };

  // ডেমো ডাটা (আপনার রিয়েল রিডাক্স বা এপিআই ডাটা দিয়ে এগুলো রিপ্লেস করবেন)

  const user = useSelector((state: any) => state.authR.user);

  const [copied, setCopied] = useState(false);

  // গুগল শিটের ফুল লিংক তৈরি
  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${sheetID}/edit`;

  // শিট আইডি কপি করার ফাংশন
  const handleCopy = () => {
    navigator.clipboard.writeText(sheetID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="min-h-[85vh] mt-25 flex flex-col justify-center items-center gap-6 p-4 w-full max-w-xl mx-auto">
      {/* প্রোফাইল হেডার */}
      <div className="flex flex-col gap-2 justify-center items-center text-center w-full">
        <div className="relative group">
          {user?.picture ? (
            // 🌟 ইমেজ থাকলে সেটি এখানে দেখাবে (উইড্থ ও হাইট সেট করে অবজেক্ট কাভার করে দেওয়া হয়েছে)
            <img
              src={user.picture}
              alt="User Profile"
              className="relative w-20 h-20 rounded-full border border-gray-800 object-cover shadow-lg group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            // 🌟 ইমেজ না থাকলে ডিফল্ট আইকন এবং ব্লার গ্লো ইফেক্ট দেখাবে
            <>
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative w-20 h-20 rounded-full border border-gray-800 bg-gray-950 flex items-center justify-center text-4xl text-blue-400 shadow-lg">
                <BiUser />
              </div>
            </>
          )}
        </div>
      </div>

      {/* মেইন কার্ড কন্টেইনার */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
        {/* অ্যাকাউন্ট মোড / টাইপ সেকশন */}
        {/* <div className="flex justify-between items-center bg-gray-950 p-4 border border-gray-800/80 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Account Role
            </p>
            <p className="text-sm font-semibold text-gray-200 mt-0.5">
              Current Access Mode
            </p>
          </div>
          <div>
            {userInfo.userType === "Modifier" ? (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5 animate-pulse">
                Modifier Mode
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/5">
                Viewer Mode
              </span>
            )}
          </div>
        </div> */}

        {/* ইউজার ডিটেইলস গ্রিড */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-400 tracking-wide border-b border-gray-800 pb-2">
            Personal Information
          </h3>

          {/* ইমেল */}
          <div className="flex items-center gap-3 text-gray-300 bg-gray-950/40 p-3 rounded-xl border border-gray-800/40">
            <BiEnvelope className="text-gray-500 text-xl flex-shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase">
                Email Address
              </p>
              <p className="text-sm font-medium text-gray-300">{user.email}</p>
            </div>
          </div>

          {/* অ্যাপ ল্যাঙ্গুয়েজ */}
          <div className="flex items-center gap-3 text-gray-300 bg-gray-950/40 p-3 rounded-xl border border-gray-800/40">
            <BiGlobe className="text-gray-500 text-xl flex-shrink-0" />
            <div className="text-left">
              <p className="text-[10px] text-gray-500 uppercase">
                App Language
              </p>
              <p className="text-sm font-medium text-gray-300 uppercase">
                {currentLang === "bn" ? "Bangla (BN)" : "English (EN)"}
              </p>
            </div>
          </div>
        </div>

        {/* গুগল শিট কানেকশন সেকশন */}
        <div className="flex flex-col gap-3 mt-1">
          <h3 className="text-sm font-bold text-gray-400 tracking-wide border-b border-gray-800 pb-2">
            Google Workspace Connection
          </h3>

          <div className="bg-gray-950 p-4 border border-gray-800 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <p className="text-xs font-semibold text-gray-300">
                  Connected Sheet
                </p>
              </div>

              {/* কপি বাটন */}
              <button
                type="button"
                onClick={handleCopy}
                className="text-gray-500 hover:text-blue-400 transition flex items-center gap-1 text-xs bg-gray-900 px-2 py-1 rounded-md border border-gray-800 cursor-pointer"
              >
                {copied ? <BiCheck className="text-emerald-400" /> : <BiCopy />}
                <span>{copied ? "Copied" : "Copy ID"}</span>
              </button>
            </div>

            {/* শিট আইডি ডিসপ্লে */}
            <p className="text-xs font-mono text-gray-500 bg-gray-900/60 p-2 rounded-lg border border-gray-800/40 truncate w-full">
              {sheetID}
            </p>

            {/* ওপেন শিট বাটন (সরাসরি নতুন ট্যাবে ওপেন হবে) */}
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 mt-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/10 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span>View Google Sheet</span>
              <BiLinkExternal className="text-sm" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccountInfo;
