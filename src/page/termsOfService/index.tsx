import { useNavigate } from "react-router-dom";
import {
  BiHomeAlt,
  BiShieldQuarter,
  BiInfoCircle,
  BiUserX,
  BiRefresh,
} from "react-icons/bi";

function TermsOfService() {
  const navigate = useNavigate();

  return (
    <section className="min-h-[85vh] mt-15 flex flex-col justify-center items-center gap-6 p-4 w-full max-w-3xl mx-auto pt-20">
      {/* হেডার সেকশন */}
      <div className="text-center w-full flex flex-col gap-1">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
          Terms of Service
        </h2>
        <p className="text-xs text-gray-500">
          সর্বশেষ আপডেট: জুন ২০২৬ — আমাদের অ্যাপ্লিকেশনটি ব্যবহারের আইনি
          শর্তাবলী
        </p>
      </div>

      {/* মেইন শর্তাবলীর কার্ড (Glassmorphism Style) */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl text-left">
        {/* ১. ব্যবহারের সাধারণ নিয়ম */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800/60 pb-1.5">
            <BiInfoCircle className="text-blue-400 text-lg" />
            ১. অ্যাপ্লিকেশন ব্যবহার (Acceptance of Terms)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            এই অ্যাপ্লিকেশনটি ব্যবহার করার মাধ্যমে আপনি আমাদের সমস্ত শর্তাবলী
            মেনে নিচ্ছেন বলে গণ্য হবে। আপনি যদি এই শর্তাবলীতে সম্মত না হন, তবে
            দয়া করে অ্যাপটি ব্যবহার করা থেকে বিরত থাকুন। এই প্ল্যাটফর্মটি
            শুধুমাত্র বৈধ প্রাতিষ্ঠানিক বা ব্যক্তিগত কাজের জন্য ব্যবহার করা
            যাবে।
          </p>
        </div>

        {/* ২. অ্যাকাউন্ট এবং ডাটা সিঙ্কিং */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800/60 pb-1.5">
            <BiShieldQuarter className="text-cyan-400 text-lg" />
            ২. গুগল শিট ও ডাটা সিঙ্কিং (Google Sheet & Data Sync)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            আমাদের অ্যাপ্লিকেশনটি আপনার রোল এবং অ্যাটেনডেন্সের ডাটা সরাসরি আপনার
            নির্দিষ্ট গুগল শিটে সিঙ্ক করে। এই প্রক্রিয়া চলাকালীন কোনো
            থার্ড-পার্টি স্ক্রিপ্ট বা অবৈধ উপায়ে ডাটাবেজে হস্তক্ষেপ করার চেষ্টা
            করা সম্পূর্ণ নিষিদ্ধ। সাময়িক সার্ভার বা টেকনিক্যাল ডাউনটাইমের কারণে
            ডাটা সিঙ্ক হতে বিলম্ব হলে কর্তৃপক্ষ দায়ী থাকবে না।
          </p>
        </div>

        {/* ৩. অ্যাকাউন্ট বাতিল বা স্থগিতকরণ */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800/60 pb-1.5">
            <BiUserX className="text-red-400 text-lg" />
            ৩. অ্যাকাউন্ট স্থগিতকরণ (Termination Rights)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            আমরা যেকোনো সময় কোনো পূর্ব নোটিশ ছাড়াই কোনো ইউজারের অ্যাকাউন্ট
            স্থগিত বা স্থায়ীভাবে ব্যান করার অধিকার সংরক্ষণ করি, যদি সেই ইউজার
            অ্যাপ্লিকেশনটিতে কোনো স্প্যামিং, রিভার্স ইঞ্জিনিয়ারিং, বা সিস্টেমের
            ক্ষতি করার চেষ্টা করে।
          </p>
        </div>

        {/* ৪. শর্তাবলী পরিবর্তন */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 border-b border-gray-800/60 pb-1.5">
            <BiRefresh className="text-purple-400 text-lg" />
            ৪. শর্তাবলী পরিবর্তন (Changes to Terms)
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            ভবিষ্যতে অ্যাপ্লিকেশনের আপডেট বা আইনি পরিবর্তনের প্রয়োজনে আমরা
            যেকোনো সময় এই শর্তাবলী পরিবর্তন বা সংশোধন করতে পারি। যেকোনো বড়
            পরিবর্তনের ক্ষেত্রে অ্যাপের মাধ্যমে নোটিফিকেশন বা এই পেজে আপডেট ডেট
            পরিবর্তন করে জানানো হবে।
          </p>
        </div>
      </div>

      {/* হোম বাটন (আইকন বাউন্স ইফেক্টসহ) */}
      <div className="w-full flex justify-start">
        <button
          type="button"
          onClick={() => {
            navigate("/");
            window.scrollTo(0, 0);
          }}
          className="py-2.5 px-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-xs tracking-wide shadow-md transition-all duration-200 cursor-pointer active:scale-95 group flex items-center gap-2"
        >
          <BiHomeAlt className="text-sm text-cyan-400 group-hover:-translate-y-0.5 transition-transform duration-200" />
          <span>Back To Home</span>
        </button>
      </div>
    </section>
  );
}

export default TermsOfService;
