function downloadAllMedia(mediaUrls) {
  const uniqueMediaUrls = Array.from(new Set(mediaUrls.map(JSON.stringify))).map(JSON.parse);

  uniqueMediaUrls.forEach(media => {
    let filename = media.filename;

    // Extract filename from the URL if available
    const url = new URL(media.url);
    const pathname = url.pathname;
    const extractedFilename = pathname.substring(pathname.lastIndexOf('/') + 1);

    if (extractedFilename) {
      filename = extractedFilename;
    }

    // Filter out unwanted filenames
    const unwantedPatterns = ['150x150', '300x300', '240p', '720p'];
    if (unwantedPatterns.some(pattern => filename.includes(pattern))) {
      console.log(`Skipping file ${filename} due to unwanted pattern.`);
      return;
    }

    // Append the current Unix timestamp to the filename
    const timestamp = Math.floor(Date.now() / 1000);
    const filenameParts = filename.split('.');
    if (filenameParts.length > 1) {
      filenameParts[filenameParts.length - 2] += `_${timestamp}`;
      filename = filenameParts.join('.');
    } else {
      filename += `_${timestamp}`;
    }

    // Ignore SVG files
    if (!filename.endsWith('.svg')) {
      // Check if file already exists
      chrome.downloads.search({ filename: filename }, (results) => {
        if (results.length === 0) {
          // File does not exist, proceed to download
          chrome.downloads.download({
            url: media.url,
            filename: filename,
            saveAs: false
          });
        } else {
          console.log(`File ${filename} already exists. Skipping download.`);
        }
      });
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadAll") {
    downloadAllMedia(request.mediaUrls);
    sendResponse({ status: "started" });
  }
});
