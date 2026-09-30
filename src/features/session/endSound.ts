import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const END_SOUND = require("../../../assets/sounds/end.wav");

/** Plays the short end-of-limit tone once, then releases the player. */
export async function playEndSound(): Promise<void> {
  await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" });
  const player = createAudioPlayer(END_SOUND);
  const subscription = player.addListener("playbackStatusUpdate", (status) => {
    if (!status.didJustFinish) return;
    subscription.remove();
    player.release();
  });
  player.play();
}
