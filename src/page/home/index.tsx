//import functions from helper
import { handelSignUpBtn } from "../../utils/helper";

//import langueages here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

const languages: Record<string, typeof en> = { en, bn };

import bpiLogo from "../../assets/359844176_651933030290720_444162366615771219_n.jpg";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
function Home() {
  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].home;

  const navigate = useNavigate();

  const {token,sheetID}=useSelector((state:any)=>state.authR)

  useEffect(()=>{
    const savedSheetID=localStorage.getItem('sheetID')||sheetID
    const savedToken=localStorage.getItem('token')||token
    if(savedSheetID && savedToken){
      navigate('/dashboard')
    }else if(savedToken && !savedSheetID){
      navigate('/login')
    }
  },[navigate,token,sheetID])

  return (
    <>
      <section className="h-[70vh] flex flex-col justify-center items-center gap-4">
        <div>
          <img src={bpiLogo} alt="" className="w-32 rounded-full" />
        </div>
        <h1 className="text-[#f3f4f6] text-3xl font-semibold">{t.welcome}</h1>
        <h2 className="text-[#f3f4f6] text-3xl font-semibold">
          {currentLang === "en" && (
            <span className="text-2xl text-[#34d399]">to </span>
          )}
          {t.institute}
        </h2>
        <p className="text-[#f3f4f6] text-[1.4rem]">{t.department}</p>
        <p className="text-[#f3f4f6] text-[1.3rem] text-center">{t.massage}</p>
        <button
          className="text-[1.3rem] font-bold text-[#1e1e24] bg-[#10b981] p-2 border-2 border-transparent rounded-lg cursor-pointer transition-all duration-400 hover:scale-110 hover:shadow-[0_0_15px_#38bdf8] hover:bg-transparent hover:text-[#38bdf8] hover:border-[#38bdf8]"
          onClick={() => handelSignUpBtn(navigate)}
        >
          {t.signUpBtn}
        </button>
      </section>
    </>
  );
}

export default Home;
