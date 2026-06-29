import { useState } from "react";

import style from "./nav.module.css";
import { useDispatch, useSelector } from "react-redux";
import { toggleLang } from "../../app/states/langueageSlice";
import { CgProfile } from "react-icons/cg";

import en from "../../lang/en.json";
import bn from "../../lang/bn.json";
import { useLocation, useNavigate } from "react-router-dom";

import { handelSignUpBtn, handelLogOutBtn } from "../../utils/helper";
import { logoutSuccess } from "../../app/states/authSlice";

const languages: Record<string, typeof en> = { en, bn };

function Nav() {
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentLang = useSelector((state: any) => state.langueageR.lang);
  const dispatch = useDispatch();

  const handelLanToggle = () => {
    dispatch(toggleLang());
  };

  const t = languages[currentLang].nav;

  const handelAccountClick = () => {
    console.log("clicked");
    setIsMenuOpen(!isMenuOpen);
  };

  const location = useLocation();
  const path = location.pathname;

  return (
    <section className={style.nav}>
      <div className={style.lang} onClick={handelLanToggle}>
        <span>En</span>
        <span>বাং</span>
        <div
          className={`${style.slider} ${currentLang === "en" ? style.english : style.bangla}`}
        ></div>
      </div>
      <div>
        <CgProfile className={style.profileIcon} onClick={handelAccountClick} />
      </div>
      {["/", "/home"].includes(path) ? (
        <>
          <div className={isMenuOpen ? style.menuOpen : style.menu}>
            <ul>
              <li
                className={style.logoutBtn}
                onClick={() => {
                  handelSignUpBtn(navigate);
                  setIsMenuOpen(!isMenuOpen);
                }}
              >
                {t.loginBtn}
              </li>
            </ul>
          </div>
        </>
      ) : ["/login"].includes(path) ? (
        <>
          <div className={isMenuOpen ? style.menuOpen : style.menu}>
            <ul>
              <li className={style.menuItem}>{t.howtoSignIn}</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className={isMenuOpen ? style.menuOpen : style.menu}>
            <ul>
              <li className={style.menuItem}>{t.linkChange}</li>
              <li
                className={style.logoutBtn}
                onClick={() => {
                  handelLogOutBtn(navigate);
                  setIsMenuOpen(!isMenuOpen);
                  dispatch(logoutSuccess());
                }}
              >
                {t.logOut}
              </li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

export default Nav;
