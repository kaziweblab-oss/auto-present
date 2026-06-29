import { useNavigate } from "react-router-dom";
import {
  BiShieldQuarter,
  BiLockAlt,
  BiServer,
  BiUserCheck,
  BiHomeAlt,
} from "react-icons/bi";

function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <section className="min-h-[85vh] mt-10 flex flex-col justify-center items-center gap-6 p-4 w-full max-w-2xl mx-auto pt-20">
      {/* হেডার সেকশন */}
      <div className="text-center w-full flex flex-col gap-1">
        <div className="flex items-center justify-center gap-2 text-3xl text-blue-400 mb-1 animate-pulse">
          <BiShieldQuarter />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
          Privacy Policy
        </h2>
        <p className="text-xs text-gray-500">
          Last updated: June 2026 | Auto Present App
        </p>
      </div>

      {/* মেইন পলিসি কন্টেন্ট কার্ড (Glassmorphism Style) */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl text-left">
        {/* সূচনা */}
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong>Auto Present</strong> অ্যাপ্লিকেশনে আপনার গোপনীয়তা রক্ষা করা
          আমাদের সর্বোচ্চ অগ্রাধিকার। আমরা আমাদের এই সিস্টেমে আপনার কী ধরনের
          ডাটা এবং কীভাবে ব্যবহার করি, তা নিচে পরিষ্কারভাবে তুলে ধরা হলো।
        </p>

        {/* পয়েন্ট ১: গুগল অ্যাকাউন্ট এবং শিট ডাটা */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0 mt-0.5">
            <BiLockAlt />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-200">
              Google Sheet & Account Access
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              আমাদের অ্যাপটি আপনার উপস্থিতি (Attendance) রেকর্ড সরাসরি আপনার
              নির্ধারিত Google Sheet-এ সংরক্ষণ করার জন্য গুগল অথেনটিকেশন ব্যবহার
              করে। আমরা কখনোই আপনার কোনো ব্যক্তিগত শিট ফাইল বা পাসওয়ার্ড আমাদের
              সার্ভারে জমা রাখি না।
            </p>
          </div>
        </div>

        {/* পয়েন্ট ২: রোল নম্বর এবং ডাটা প্রসেসিং */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0 mt-0.5">
            <BiServer />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-200">
              Data Storing & Processing
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              ইনপুট দেওয়া রোল নম্বর এবং সাবজেক্ট কোডগুলো শুধুমাত্র আপনার
              ব্রাউজার এবং রিডাক্স স্টেটে (Redux State) সাময়িকভাবে প্রসেস করা
              হয়। আপনার ক্লাসের শিক্ষার্থীদের ডাটা বা রোল নম্বরের কোনো ব্যাকআপ
              আমাদের কোনো নিজস্ব ডেটাবেজে সংরক্ষণ করা হয় না।
            </p>
          </div>
        </div>

        {/* পয়েন্ট ৩: থার্ড পার্টি শেয়ারিং */}
        <div className="flex gap-4 items-start">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl shrink-0 mt-0.5">
            <BiUserCheck />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-200">
              No Third-Party Sharing
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mt-1">
              যেহেতু এই অ্যাপটি সম্পূর্ণ এডুকেশনাল এবং অটোমেশন পারপাসে তৈরি, তাই
              আপনার কোনো প্রকার ইনফরমেশন বা ট্র্যাকিং ডাটা কোনো থার্ড-পার্টি
              বিজ্ঞাপন সংস্থা বা অন্য কারো সাথে শেয়ার করা হয় না।
            </p>
          </div>
        </div>

        {/* সমাপনী বার্তা */}
        <div className="border-t border-gray-800 pt-4 mt-2">
          <p className="text-xs text-gray-500 leading-relaxed text-center">
            এই অ্যাপ্লিকেশনটি ব্যবহারের মাধ্যমে আপনি আমাদের এই প্রাইভেসি পলিসির
            শর্তাবলীতে সম্মতি প্রকাশ করছেন।
          </p>
        </div>
      </div>

      {/* 🌟 ব্যাক টু হোম বাটন (অন্যান্য পেজের সাথে সামঞ্জস্য রেখে হোম আইকন দেওয়া হলো) */}
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

export default PrivacyPolicy;
