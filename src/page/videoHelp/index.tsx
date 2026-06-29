
import { useLocation } from "react-router-dom";

function VideoHelp() {
  const location = useLocation();
  const state = location.state as { videoPath?: string } | null;
  const videoSrc = state?.videoPath || "Video not Found.";
  return (
    <>
      <section>
        <video src={videoSrc} title="Tutorial" ></video>
      </section>
    </>
  );
}

export default VideoHelp;
