const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif'];
const VIDEO_EXTS = ['.mp4', '.mov', '.mkv', '.mpg', '.mpeg', '.webm', '.avi'];

function classifyMedia(media) {
  // Prefer explicit type tag set by content script
  if (media.type === 'image') return 'image';
  if (media.type === 'video') return 'video';
  // Fall back to filename extension
  const name = (media.filename || '').toLowerCase();
  if (IMAGE_EXTS.some(ext => name.endsWith(ext))) return 'image';
  if (VIDEO_EXTS.some(ext => name.endsWith(ext))) return 'video';
  return null;
}

function replaceButtonListener(id, handler) {
  const btn = document.getElementById(id);
  if (!btn) return;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', handler);
}

function updateMediaList(mediaUrls) {
  const imageTableBody = document.querySelector('#imageTableBody');
  const videoTableBody = document.querySelector('#videoTableBody');
  imageTableBody.innerHTML = '';
  videoTableBody.innerHTML = '';

  const imageItems = [];
  const videoItems = [];

  mediaUrls.forEach(media => {
    const kind = classifyMedia(media);
    if (!kind) {
      console.log('Could not classify media:', media.filename, media.url);
      return;
    }

    const row = document.createElement('tr');
    const cell1 = document.createElement('td');
    const cell2 = document.createElement('td');
    const link = document.createElement('a');

    cell1.textContent = media.filename;
    link.href = media.url;
    link.textContent = "Download";
    link.download = media.filename;
    link.target = '_blank';
    cell2.appendChild(link);
    row.appendChild(cell1);
    row.appendChild(cell2);

    if (kind === 'image') {
      imageTableBody.appendChild(row);
      imageItems.push(media);
    } else {
      videoTableBody.appendChild(row);
      videoItems.push(media);
    }
  });

  replaceButtonListener('downloadAll', () => {
    chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls }, r => console.log(r && r.status));
  });
  replaceButtonListener('downloadAllVideos', () => {
    chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: videoItems }, r => console.log(r && r.status));
  });
  replaceButtonListener('downloadAllImages', () => {
    chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: imageItems }, r => console.log(r && r.status));
  });
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "collectMedia" }, function(response) {
      const imageTableBody = document.querySelector('#imageTableBody');
      const videoTableBody = document.querySelector('#videoTableBody');

      if (chrome.runtime.lastError) {
        const msg = '<tr><td colspan="2">Error: Could not connect to the page. Try refreshing.</td></tr>';
        if (imageTableBody) imageTableBody.innerHTML = msg;
        if (videoTableBody) videoTableBody.innerHTML = msg;
        return;
      }

      if (response && response.mediaUrls && response.mediaUrls.length > 0) {
        updateMediaList(response.mediaUrls);
      } else {
        if (imageTableBody) imageTableBody.innerHTML = '<tr><td colspan="2">No images found on this page.</td></tr>';
        if (videoTableBody) videoTableBody.innerHTML = '<tr><td colspan="2">No videos found on this page.</td></tr>';
      }
    });
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "updateMediaUrls") {
      if (request.mediaUrls && request.mediaUrls.length > 0) {
        updateMediaList(request.mediaUrls);
      }
    }
  });
});
