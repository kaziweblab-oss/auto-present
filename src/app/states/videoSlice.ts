import { createSlice } from "@reduxjs/toolkit";

const fixVideoSlice = createSlice({
  name: "video",
  initialState: {
    video: null,
  },
  reducers: {
    addVideo: (state, action) => {
      state.video = action.payload;
    },
    removeVideo: (state) => {
      state.video = null;
    },
  },
});

export const { addVideo, removeVideo } = fixVideoSlice.actions;
export default fixVideoSlice;
