function setFirefoxPreferences() {
  browser.runtime.onInstalled.addListener(() => {
    browser.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
      const filenameParts = downloadItem.filename.split('.');
      const timestamp = Math.floor(Date.now() / 1000);
      const randomDigit = Math.floor(Math.random() * 10);
      if (filenameParts.length > 1) {
        filenameParts[filenameParts.length - 2] += `_${timestamp}_${randomDigit}`;
      } else {
        filenameParts[0] += `_${timestamp}_${randomDigit}`;
      }
      suggest({
        filename: filenameParts.join('.'),
      });
    });

    browser.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (details.url.includes("blob:")) {
          return { cancel: true };
        }
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );

    browser.downloads.download({
      url: downloadItem.url,
      conflictAction: 'overwrite',
      saveAs: false
    });
  });
}

setFirefoxPreferences();
