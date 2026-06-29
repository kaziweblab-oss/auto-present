import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

//import style here
import style from "./fixIssue.module.css";

//import text here
import en from "../../lang/en.json";
import bn from "../../lang/bn.json";

//import video here
import fixIssueVideo from "../../assets/video/234416_medium.mp4";

//import icons here
import { BiArrowBack } from "react-icons/bi";

const languages: Record<string, typeof en> = { en, bn };

function FixIssue() {
  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].fixIssue;

  const [goFix, setGoFix] = useState<boolean>(false);

  const navigate = useNavigate();

  const handelFixClick = () => {
    setGoFix(true);
    window.open(
      "https://myaccount.google.com/connections",
      "_blank",
      "noopener,noreferrer",
    );
  };
  return (
    <>
      <section className={style.main}>
        <div>
          <p>{t.issue}</p>
        </div>
        <div className={style.videoContent}>
          <video src={fixIssueVideo} className={style.video} controls></video>
        </div>
        <div className={style.btnSection}>
          <a
            className={style.btn}
            onClick={handelFixClick}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.fixBtn}
          </a>
          <button
            className={style.btn}
            onClick={() => navigate("/sign-up")}
            disabled={goFix ? false : true}
          >
            <span>
              <BiArrowBack />
            </span>
            {t.backBtn}
          </button>
        </div>
      </section>
    </>
  );
}

export default FixIssue;
