export const MESSAGE_TYPES = Object.freeze({
  PERMISSION_ATTEMPT: "PERMISSION_ATTEMPT",
  PERMISSION_DECISION: "PERMISSION_DECISION",
  GET_STATUS: "GET_STATUS",
  STATUS: "STATUS",
  GET_SETTINGS: "GET_SETTINGS",
  SAVE_SETTINGS: "SAVE_SETTINGS",
  SETTINGS: "SETTINGS"
});

export function makePermissionAttempt(permission, origin, timestamp = Date.now()) {
  return {
    type: MESSAGE_TYPES.PERMISSION_ATTEMPT,
    data: { permission, origin, timestamp }
  };
}

export function isPermissionAttempt(message) {
  return message?.type === MESSAGE_TYPES.PERMISSION_ATTEMPT &&
    typeof message?.data?.permission === "string" &&
    typeof message?.data?.origin === "string";
}
