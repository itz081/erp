export function reply(statusCode, intOpCode, data) {
  return { statusCode, intOpCode, data };
}

export function replyError(statusCode, intOpCode, message) {
  return { statusCode, intOpCode, error: message };
}
