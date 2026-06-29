import {
  BiCodeAlt,
  BiInfoCircle,
  BiGitBranch,
  BiHomeAlt,
} from "react-icons/bi";
import { FaGraduationCap } from "react-icons/fa"; // BiGraduationCap এরর ফিক্স করতে FaGraduationCap ইম্পোর্ট করা হলো

// লোগো ইম্পোর্ট
import appLogo from "../../assets/appLogo.png";
import collegeLogo from "../../assets/359844176_651933030290720_444162366615771219_n.jpg"; // আপনার কলেজের লোগোর পাথ সেট করা হলো
import { useNavigate } from "react-router-dom";

function AboutInfo() {
  // অ্যাপের কারেন্ট ভার্সন বা রিলিজ ইনফো
  const appVersion = "v1.2.0 (Stable)";

  const navigate = useNavigate();

  return (
    <section className="min-h-[85vh] mt-25 flex flex-col justify-center items-center gap-6 p-4 w-full max-w-2xl mx-auto mt-20 ">
      {/* হেডার ও লোগো সেকশন */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl">
        {/* অ্যাপ লোগো ও নাম */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20"></div>
            <img
              src={appLogo}
              alt="App Logo"
              className="relative w-20 h-20 rounded-2xl border border-gray-800/50 object-cover shadow-lg"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
              Auto Present
            </h2>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
              <BiGitBranch /> Version: {appVersion}
            </p>
          </div>
        </div>

        {/* কলেজ বা ইনস্টিটিউট লোগো সেকশন */}
        <div className="flex flex-col items-center sm:items-end text-center sm:text-right border-t sm:border-t-0 sm:border-l border-gray-800 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
          <div className="w-16 h-16 rounded-full bg-gray-950 border border-gray-800 flex items-center justify-center text-3xl text-indigo-400 shadow-inner mb-2 overflow-hidden">
            {collegeLogo ? (
              <img
                src={collegeLogo}
                alt="College Logo"
                className="w-full h-full object-cover p-1 rounded-full"
              />
            ) : (
              <FaGraduationCap />
            )}
          </div>
          <p className="text-xs font-semibold text-gray-300">
            Barguna GOVT. Pollytechnic Institute (BGPI)
          </p>
          <p className="text-[10px] text-gray-500">Department of CST</p>
        </div>
      </div>

      {/* অ্যাপ ডিটেইলস ও মিশন কার্ড */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
        {/* অ্যাপ্লিকেশন পরিচিতি */}
        <div className="flex flex-col gap-2 text-left">
          <h3 className="text-sm font-bold text-gray-400 tracking-wide flex items-center gap-2 border-b border-gray-800 pb-2">
            <BiInfoCircle className="text-blue-400 text-lg" />
            About Project
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed pt-1">
            <strong>Auto Present </strong> হচ্ছে একটি মডার্ন এবং অটোমেটেড
            অ্যাটেনডেন্স ম্যানেজমেন্ট সিস্টেম। এটি ক্লাসের রোল ইনপুট প্রসেসিংকে
            সহজ করতে এবং সরাসরি ক্লাউডে (Google Sheets) রিয়েল-টাইম ডাটা সিঙ্ক
            করার উদ্দেশ্যে তৈরি করা হয়েছে। এটি শিক্ষকদের মূল্যবান সময় বাঁচায়
            এবং কাগজবিহীন ডিজিটাল ক্লাসরুম তৈরি করতে সাহায্য করে।
          </p>
        </div>

        <div className="flex flex-col gap-3 text-left mt-2">
          <h3 className="text-sm font-bold text-gray-400 tracking-wide flex items-center gap-2 border-b border-gray-800 pb-2">
            <BiCodeAlt className="text-emerald-400 text-lg" />
            Technology Stack
          </h3>

          <div className="flex gap-2 flex-wrap pt-1">
            <span className="px-3 p-2 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
              React (TS)
            </span>
            <span className="px-3 p-2 rounded-lg text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono">
              Tailwind CSS
            </span>
            <span className="px-3 p-2 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono">
              Redux Toolkit
            </span>
            <span className="px-3 p-2 rounded-lg text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-400 font-mono">
              Google Sheet API
            </span>
            <span className="px-3 p-2 rounded-lg text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">
              Vite
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              navigate("/"); // হোম পেজে ব্যাক করার জন্য
              window.scrollTo(0, 0);
            }}
            className="mt-6 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-xs tracking-wide shadow-md transition-all duration-200 cursor-pointer active:scale-95 group"
          >
            {/* হোভার করলে হোম আইকনটি সামান্য উপরে লাফাবে (Bounce Effect), যা দেখতে খুব মডার্ন লাগবে */}
            <BiHomeAlt className="text-sm text-cyan-400 group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span>Back To Home</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export default AboutInfo;
