import { configureStore } from "@reduxjs/toolkit";

import langueageSlice from "../states/langueageSlice";
import authSlice from "../states/authSlice";

const store = configureStore({
  reducer: {
    langueageR: langueageSlice,
    authR: authSlice,
  },
});

export default store;
