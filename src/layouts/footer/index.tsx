import { FaFacebook, FaGithub, FaLinkedin, FaYoutube } from "react-icons/fa";
import { useSelector } from "react-redux";

import style from "./footer.module.css";

import appLogo from "../../assets/Gemini_Generated_Image_xuexouxuexouxuex.png";

import { handelSignUpBtn } from "../../utils/helper";

//import languages here
import bn from "../../lang/bn.json";
import en from "../../lang/en.json";
import { useNavigate } from "react-router-dom";

const languages: Record<string, typeof en> = { en, bn };

function Footer() {
  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const t = languages[currentLang].footer;

  const navigate = useNavigate();

  const loggedIn = useSelector((state: any) => state.authR.isLoggedIn);

  return (
    <>
      <footer className={style.footer}>
        <div className={style.containeer}>
          <div className={style.content1}>
            <div className={style.app}>
              <img src={appLogo} alt="app logo" />
              <h2>{t.appName}</h2>
            </div>
            <div>
              <p
                style={{
                  fontSize: "1.3rem",
                  textAlign: "center",
                }}
              >
                <span>{t.appDetails}</span>
              </p>
            </div>
            <div className={style.iconSection}>
              <FaGithub
                className={style.icon}
                style={{
                  color: "black",
                }}
              />
              <FaLinkedin
                className={style.icon}
                style={{
                  color: "#0a66c2",
                }}
              />
              <FaFacebook
                className={style.icon}
                style={{
                  color: "#1877f2",
                }}
              />
              <FaYoutube
                className={style.icon}
                style={{
                  color: "#ff0000",
                }}
              />
            </div>
          </div>
          <div className={style.content}>
            <ul>
              <p>
                <span>{t.quickLinks.title}</span>
              </p>
              <li>
                <button
                  onClick={() => {
                    handelSignUpBtn(navigate);
                    localStorage.clear();
                  }}
                >
                  {loggedIn ? t.quickLinks.logOut : t.quickLinks.logIn}
                </button>
              </li>
              <li>
                <button>{t.quickLinks.l1}</button>
              </li>
              <li>
                <button>{t.quickLinks.l2}</button>
              </li>
            </ul>
          </div>
          <div className={style.content}>
            <ul>
              <p>
                <span>{t.support.tite}</span>
              </p>
              <li>
                <a href="mailto:support@email.com">{t.support.l1}</a>
              </li>
              <li>
                <a href="mailto:support@email.com?subject=Auto Present Bug Report">
                  {t.support.l2}
                </a>
              </li>
              <li>
                <button>{t.support.l3}</button>
              </li>
            </ul>
          </div>
          <div className={style.content}>
            <ul>
              <p>
                <span>{t.policy.title}</span>
              </p>
              <li>
                <button>{t.policy.l1}</button>
              </li>
              <li>
                <button>{t.policy.l1}</button>
              </li>
            </ul>
          </div>
        </div>
        <div className={style.copy}>
          <p>{t.copyRight.message1}</p>
          <p>{t.copyRight.message2}</p>
        </div>
      </footer>
    </>
  );
}

export default Footer;
