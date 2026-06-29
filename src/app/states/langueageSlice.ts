import { createSlice } from "@reduxjs/toolkit";

const langueageSlice = createSlice({
  name: "langueage",
  initialState: {
    lang: "en",
  },
  reducers: {
    toggleLang: (state) => {
      state.lang = state.lang === "en" ? "bn" : "en";
    },
  },
});

export const { toggleLang } = langueageSlice.actions;
export default langueageSlice.reducer;
