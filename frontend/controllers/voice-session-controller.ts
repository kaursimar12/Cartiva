import { VOICE_PROBLEM_MESSAGES, type VoiceProblem } from "@/lib/voice/voice-errors";
import { showToast } from "@/store/toast-store";

/** Entry point for voice-connection problems: one place decides how the shopper is told. */
export const voiceSessionController = {
  reportProblem(problem: VoiceProblem) {
    showToast(VOICE_PROBLEM_MESSAGES[problem], "error");
  },
};
