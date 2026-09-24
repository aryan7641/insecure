const processImport = async (importId) => {
  console.log(`[ImportProcessor] Processing import ${importId}...`);
  // Synchronous import processing handles things directly right now.
  // This job acts as a placeholder for async batch processing in the future.
  console.log(`[ImportProcessor] Import ${importId} processed.`);
  return { status: 'processed', importId };
};

module.exports = {
  processImport
};
