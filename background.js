// Append timestamp + random digit to all downloaded filenames to prevent collisions.
// Registered at top level so it's active for the extension's lifetime, not just after install.
browser.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const filenameParts = downloadItem.filename.split('.');
  const timestamp = Math.floor(Date.now() / 1000);
  const randomDigit = Math.floor(Math.random() * 10);
  if (filenameParts.length > 1) {
    filenameParts[filenameParts.length - 2] += `_${timestamp}_${randomDigit}`;
  } else {
    filenameParts[0] += `_${timestamp}_${randomDigit}`;
  }
  suggest({ filename: filenameParts.join('.') });
});
