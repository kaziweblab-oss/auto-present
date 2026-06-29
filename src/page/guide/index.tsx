import { useNavigate, useLocation } from "react-router-dom";
import { BiPlayCircle, BiCheckCircle, BiArrowBack } from "react-icons/bi";

// আপনার দেওয়া পাথ অনুযায়ী ভিডিও ইম্পোর্টস (আপনার প্রয়োজন অনুযায়ী ফাইলগুলো প্রজেক্টে রাখুন)
import generalGuideVideo from "../../assets/video/234416_medium.mp4";
// উদাহরণস্বরূপ অন্য ভিডিও না থাকলে আপাতত একই ভিডিও ব্যবহার করতে পারেন, অথবা আলাদা ভিডিওর পাথ দিতে পারেন:
// import signInGuideVideo from "../../assets/video/signin_guide.mp4";
// import loginGuideVideo from "../../assets/video/login_guide.mp4";

// 🌟 ডাইনামিক ডাটা অবজেক্ট (ল্যাঙ্গুয়েজ এবং টাইপ অনুযায়ী কন্টেন্ট চেঞ্জ হবে)
const guideData: Record<
  string,
  { title: string; steps: string[]; video: string }
> = {
  signIn: {
    title: "How to Sign Up / Create an Account?",
    video: generalGuideVideo, // আপনার সাইন আপ ভিডিওর ভেরিয়েবল এখানে দিন
    steps: [
      "প্রথমে মেনু থেকে 'Sign Up' বা 'Sign In' বাটনে ক্লিক করুন।",
      "আপনার সঠিক নাম, সচল ইমেইল অ্যাড্রেস এবং একটি স্ট্রং পাসওয়ার্ড দিন।",
      "আপনার ইমেইলে কোনো ভেরিফিকেশন কোড বা লিঙ্ক গেলে তা দিয়ে অ্যাকাউন্টটি অ্যাক্টিভেট করুন।",
      "অ্যাকাউন্ট তৈরি হয়ে গেলে আপনি সরাসরি ড্যাশবোর্ডে অ্যাক্সেস পেয়ে যাবেন।",
    ],
  },
  login: {
    title: "How to Log In to Your Account?",
    video: generalGuideVideo, // আপনার লগইন ভিডিওর ভেরিয়েবল এখানে দিন
    steps: [
      "মেনু থেকে সরাসরি 'Log In' পেজে প্রবেশ করুন।",
      "অ্যাকাউন্ট খোলার সময় ব্যবহৃত ইমেইল এবং পাসওয়ার্ডটি সঠিকভাবে ইনপুট দিন।",
      "যদি গুগল লগইন সচল থাকে, তবে এক ক্লিকেই 'Sign in with Google' ব্যবহার করতে পারেন।",
      "পাসওয়ার্ড ভুলে গেলে 'Forgot Password' অপশন ব্যবহার করে তা রিসেট করে নিন।",
    ],
  },
  general: {
    title: "How to use Auto Present?",
    video: generalGuideVideo,
    steps: [
      "প্রথমে Dashboard-এ গিয়ে আপনার Subject Code সিলেক্ট করুন।",
      "আজকের তারিখ (Date) ঠিক আছে কি না তা যাচাই করে নিন।",
      "Roll Input বক্সে এক বা একাধিক রোল নম্বর ইনপুট দিন।",
      "সবশেষে 'Submit Attendance' বাটনে ক্লিক করে সরাসরি Google Sheet-এ ডাটা সিঙ্ক করুন।",
    ],
  },
};

function Guide() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🌟 Nav বা Footer থেকে পাঠানো state ডাটা রিসিভ করা (কিছু না থাকলে ডিফল্ট 'general' সেট হবে)
  const { type } = location.state || { type: "general" };

  // কারেন্ট টাইপ অনুযায়ী কন্টেন্ট সিলেক্ট করা (ভুল টাইপ এড়াতে ফলব্যাক হিসেবে general রাখা হয়েছে)
  const currentGuide = guideData[type] || guideData.general;

  return (
    <section className="min-h-[85vh] flex flex-col justify-center items-center gap-6 p-4 w-full max-w-2xl mx-auto pt-20">
      {/* হেডার সেকশন */}
      <div className="text-center w-full flex flex-col gap-1">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-wide">
          {currentGuide.title}
        </h2>
        <p className="text-xs text-gray-500">
          অ্যাপ্লিকেশনটি সঠিকভাবে ব্যবহার করতে নিচের ভিডিও এবং নির্দেশনাবলী
          অনুসরণ করুন
        </p>
      </div>

      {/* ভিডিও গাইড প্লেয়ার কন্টেইনার */}
      <div className="w-full bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative group">
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-gray-900/80 backdrop-blur-md border border-gray-800 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-blue-400 shadow-md">
          <BiPlayCircle className="text-sm animate-pulse" />
          <span>Video Tutorial</span>
        </div>
        <video
          key={type} // 🌟 টাইপ চেঞ্জ হলে ভিডিও প্লেয়ার যেন নতুন সোর্স লোড করতে পারে
          src={currentGuide.video}
          className="w-full aspect-video object-cover"
          controls
          playsInline
        />
      </div>

      {/* নির্দেশনাবলী / স্টেপস কার্ড */}
      <div className="w-full bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl text-left">
        <h3 className="text-sm font-bold text-gray-400 tracking-wide border-b border-gray-800 pb-2 flex items-center gap-2">
          <BiCheckCircle className="text-emerald-400 text-lg" />
          Step-by-Step Instructions
        </h3>

        <ul className="flex flex-col gap-3.5 pt-1">
          {currentGuide.steps.map((step, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-gray-300 leading-relaxed"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold font-mono shrink-0 mt-0.5">
                {index + 1}
              </span>
              <p>{step}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ব্যাক বাটন */}
      <div className="w-full flex justify-start">
        <button
          type="button"
          onClick={() => {
            navigate(-1); // ইউজার আগের যে পেজে ছিলেন সেখানে ফেরত নিয়ে যাবে
            window.scrollTo(0, 0);
          }}
          className="py-2.5 px-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 text-gray-300 font-semibold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <BiArrowBack className="text-sm" />
          <span>Go Back</span>
        </button>
      </div>
    </section>
  );
}

export default Guide;
