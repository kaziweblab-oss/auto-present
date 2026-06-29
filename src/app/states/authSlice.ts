import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { AuthState } from "../../types/types";

const storedUser = JSON.parse(localStorage.getItem("userInfo") || "null");
const subjectCodes = JSON.parse(localStorage.getItem("subjectCodes") || "null");

const initialState: AuthState = {
  user: storedUser ? storedUser : null,
  isLoggedIn: storedUser ? true : false,
  token: localStorage.getItem("token") || null, // 🌟 পেজ রিফ্রেশ করলেও যেন টোকেন না হারায়
  // userEmail: storedUser ? JSON.parse(storedUser).email : "", // 🌟 ইউজার অবজেক্ট থেকে ইমেইল নেওয়া
  sheetID: localStorage.getItem("sheetID") || "",
  subjectCodes: subjectCodes,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signUpSucess: (state, action: PayloadAction<any>) => {
      const { user, token } = action.payload;

      state.user = user;
      state.isLoggedIn = true;
      state.token = token;

      localStorage.setItem("userInfo", JSON.stringify(action.payload.user));
      if (action.payload.token) {
        localStorage.setItem("token", action.payload.token);
      }
    },

    loginSuccess: (state, action: PayloadAction<any>) => {
      state.subjectCodes = action.payload.subjectCodes;
      state.sheetID = action.payload.sheetID;

      localStorage.setItem(
        "subjectCodes",
        JSON.stringify(action.payload.subjectCodes),
      );
      localStorage.setItem("sheetID", action.payload.sheetID);
    },

    logoutSuccess: (state) => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      state.sheetID = "";
      state.subjectCodes = null;

      localStorage.removeItem("userInfo");
      localStorage.removeItem("token");
      localStorage.removeItem("sheetID");
    },
  },
});

export const { signUpSucess, loginSuccess, logoutSuccess } = authSlice.actions;
export default authSlice.reducer;
