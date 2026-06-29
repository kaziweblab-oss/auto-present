import { useNavigate } from "react-router-dom";
import { BiHomeAlt } from "react-icons/bi"; // হোম আইকন

function Err() {
  const navigate = useNavigate();

  return (
    <section className="min-h-[85vh] mt-20 flex flex-col justify-center items-center gap-5 p-4 text-center">
      <div className="relative group">
        <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
        <h1 className="relative text-8xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent tracking-wider font-mono">
          404
        </h1>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h2 className="text-xl font-bold text-gray-100 tracking-wide">
          Oops! Something went wrong
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          The page you are looking for doesn't exist or an unexpected error
          occurred.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          navigate("/");
          window.scrollTo(0, 0);
        }}
        className="mt-2 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] transition-all cursor-pointer"
      >
        <BiHomeAlt className="text-lg" />
        <span>Back to Home</span>
      </button>
    </section>
  );
}

export default Err;
