function getFilename(media) {
  const url = media.url;
  // blob: and data: URLs have no extractable path — use the name from content script
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return media.filename || 'download';
  }
  try {
    const urlObj = new URL(url);
    let name = urlObj.pathname.substring(urlObj.pathname.lastIndexOf('/') + 1);
    // Strip query-string artifacts that sometimes end up in the path segment
    name = name.split('?')[0];
    if (name) return name;
  } catch (e) { /* fall through */ }
  return media.filename || 'download';
}

function downloadAllMedia(mediaUrls, tabId) {
  const seenUrls = new Set();

  mediaUrls.forEach(media => {
    if (seenUrls.has(media.url)) return;
    seenUrls.add(media.url);

    let filename = getFilename(media);

    // Skip SVGs
    if (filename.toLowerCase().endsWith('.svg')) return;

    if (media.url.startsWith('blob:')) {
      // Blob URLs are page-scoped — delegate to the content script which can access them.
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { action: "downloadBlob", url: media.url, filename });
      } else {
        console.error(`Cannot download blob URL without tabId: ${media.url}`);
      }
      return;
    }

    // Append timestamp to keep filenames unique across repeated downloads
    const timestamp = Math.floor(Date.now() / 1000);
    const parts = filename.split('.');
    if (parts.length > 1) {
      parts[parts.length - 2] += `_${timestamp}`;
      filename = parts.join('.');
    } else {
      filename += `_${timestamp}`;
    }

    chrome.downloads.download({ url: media.url, filename, saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(`Download failed for ${media.url}:`, chrome.runtime.lastError.message);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "downloadAll") {
    downloadAllMedia(request.mediaUrls, request.tabId);
    sendResponse({ status: "started" });
  }
});
