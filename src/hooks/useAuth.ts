import {
  googleLogout,
  useGoogleLogin,
  type TokenResponse,
} from "@react-oauth/google";
import axios from "axios";

import { useDispatch } from "react-redux";
import { signUpSucess, logoutSuccess } from "../app/states/authSlice";
import { useState } from "react";

import en from "../lang/en.json";
import bn from "../lang/bn.json";

const languages: Record<string, typeof en> = { en, bn };

export const useGoogleAuth = (currentLang: string) => {
  const dispatch = useDispatch();

  const t =
    languages[currentLang || "en"]?.signin.hook || languages.en.signin.hook;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenRes: TokenResponse) => {
      setLoading(true);
      setErrorMessage(null);

      const hasSpreadsheetScope = tokenRes.scope?.includes(
        "https://www.googleapis.com/auth/spreadsheets",
      );

      const hasDriveScope = tokenRes.scope?.includes(
        "https://www.googleapis.com/auth/drive.readonly",
      );

      if (!hasSpreadsheetScope || !hasDriveScope) {
        setHasPermission(false);
        setLoading(false);
        setErrorMessage(t.acessMessage);
        return;
      }

      try {
        setHasPermission(true);
        const userInfoRes = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenRes.access_token}` },
          },
        );

        dispatch(
          signUpSucess({
            user: userInfoRes.data,
            token: tokenRes.access_token,
          }),
        );
        setErrorMessage(t.sucess);
      } catch (err: any) {
        setErrorMessage(`${t.dataNotFound} ${err}`);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrorMessage(t.fail);
      setLoading(false);
    },
    onNonOAuthError: (error: any) => {
      const err = error?.message
        ? error.message.replace(/^Error:\s*/i, "")
        : "";
      setErrorMessage(`${t.fail} ${err}.`);
      setLoading(false);
    },

    scope:
      "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly",
    prompt: "consent",
    include_granted_scopes: true,
  });

  const handelLogOut = () => {
    googleLogout();
    localStorage.clear();
    dispatch(logoutSuccess());
    setHasPermission(true);
    setErrorMessage(null);
    window.location.reload();

    localStorage.clear();
  };

  return {
    googleLogin,
    loading,
    hasPermission,
    errorMessage,
    setErrorMessage,
    handelLogOut,
  };
};
