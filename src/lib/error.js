exports.fail = (message) => {
  return {
    timestamp: Date.now,
    success: false,
    message,
  };
};

exports.success = (message) => {
  return {
    timestamp: Date.now,
    success: true,
    message,
  };
};

exports.success_with_content = (message, content) => {
  return {
    timestamp: Date.now,
    success: true,
    message,
    content,
  };
};
