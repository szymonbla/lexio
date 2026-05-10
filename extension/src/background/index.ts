import type { ExtensionMessage } from "../shared/messages";
import { captureWord } from "./apiClient";

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type !== "CAPTURE_WORD") return false;
    captureWord(message.payload).then(sendResponse);
    return true; // keep message channel open for async response
  }
);
