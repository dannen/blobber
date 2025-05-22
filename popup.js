function updateMediaList(mediaUrls) {
  const imageTableBody = document.querySelector('#imageTableBody');
  const videoTableBody = document.querySelector('#videoTableBody');
  imageTableBody.innerHTML = ''; // Clear the existing image list
  videoTableBody.innerHTML = ''; // Clear the existing video list

  const promises = mediaUrls.map(media => {
    return new Promise((resolve) => {
      if (media.url.startsWith('blob:')) {
        fetch(media.url)
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            resolve({ url, filename: media.filename });
            console.log(`Blob URL converted: ${url}`);
          })
          .catch(error => {
            console.error('Error fetching blob:', error);
            resolve(null);
          });
      } else {
        resolve(media);
      }
    });
  });

  Promise.all(promises).then(mediaItems => {
    const validMediaItems = mediaItems.filter(media => media !== null);
    console.log('Valid media items:', validMediaItems);

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.mkv', '.mpg', '.mpeg'];

    let imageItems = [];
    let videoItems = [];

    validMediaItems.forEach(media => {
      const row = document.createElement('tr');
      const cell1 = document.createElement('td');
      const cell2 = document.createElement('td');
      const link = document.createElement('a');

      cell1.textContent = media.filename;
      link.href = media.url;
      link.textContent = "Download";
      link.download = media.filename;
      link.target = '_blank'; // Open in a new tab
      cell2.appendChild(link);

      row.appendChild(cell1);
      row.appendChild(cell2);

      const isImage = imageExtensions.some(ext => media.filename.toLowerCase().endsWith(ext));
      const isVideo = videoExtensions.some(ext => media.filename.toLowerCase().endsWith(ext));

      if (isImage) {
        imageTableBody.appendChild(row);
        imageItems.push(media);
      } else if (isVideo) {
        videoTableBody.appendChild(row);
        videoItems.push(media);
      } else {
        // Optionally handle other types or log them
        console.log('Unknown media type:', media.filename);
      }
    });

    // Event listeners should be set up once, ideally outside this function or managed to avoid multiple attachments.
    // For simplicity in this context, we'll re-attach, but in a larger app, manage this carefully.
    const downloadAllButton = document.getElementById('downloadAll');
    const downloadAllVideosButton = document.getElementById('downloadAllVideos');
    const downloadAllImagesButton = document.getElementById('downloadAllImages');

    // Clone and replace to remove old listeners
    const newDownloadAllButton = downloadAllButton.cloneNode(true);
    downloadAllButton.parentNode.replaceChild(newDownloadAllButton, downloadAllButton);
    newDownloadAllButton.addEventListener('click', function() {
      const uniqueMediaItems = Array.from(new Set(validMediaItems.map(JSON.stringify))).map(JSON.parse);
      chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: uniqueMediaItems }, function(response) {
        console.log(response.status);
      });
    });

    const newDownloadAllVideosButton = downloadAllVideosButton.cloneNode(true);
    downloadAllVideosButton.parentNode.replaceChild(newDownloadAllVideosButton, downloadAllVideosButton);
    newDownloadAllVideosButton.addEventListener('click', function() {
      const uniqueVideoItems = Array.from(new Set(videoItems.map(JSON.stringify))).map(JSON.parse);
      chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: uniqueVideoItems }, function(response) {
        console.log(response.status);
      });
    });

    const newDownloadAllImagesButton = downloadAllImagesButton.cloneNode(true);
    downloadAllImagesButton.parentNode.replaceChild(newDownloadAllImagesButton, downloadAllImagesButton);
    newDownloadAllImagesButton.addEventListener('click', function() {
      const uniqueImageItems = Array.from(new Set(imageItems.map(JSON.stringify))).map(JSON.parse);
      chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: uniqueImageItems }, function(response) {
        console.log(response.status);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "collectMedia"}, function(response) {
      const imageTableBody = document.querySelector('#imageTableBody');
      const videoTableBody = document.querySelector('#videoTableBody');
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError.message);
        if (imageTableBody) imageTableBody.innerHTML = '<tr><td colspan="2">Error: Could not connect to the page. Try refreshing the page.</td></tr>';
        if (videoTableBody) videoTableBody.innerHTML = '<tr><td colspan="2">Error: Could not connect to the page. Try refreshing the page.</td></tr>';
        return;
      }
      
      if (response && response.mediaUrls && response.mediaUrls.length > 0) {
        console.log('Media URLs received:', response.mediaUrls);
        updateMediaList(response.mediaUrls);
      } else {
        console.log('No media URLs received or empty list.');
        if (imageTableBody) imageTableBody.innerHTML = '<tr><td colspan="2">No images found on this page.</td></tr>';
        if (videoTableBody) videoTableBody.innerHTML = '<tr><td colspan="2">No videos found on this page.</td></tr>';
      }
    });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateMediaUrls") {
      const imageTableBody = document.querySelector('#imageTableBody');
      const videoTableBody = document.querySelector('#videoTableBody');
      if (request.mediaUrls && request.mediaUrls.length > 0) {
        console.log('Media URLs updated:', request.mediaUrls);
        updateMediaList(request.mediaUrls);
      } else {
        console.log('Media URLs updated to empty list.');
        if (imageTableBody) imageTableBody.innerHTML = '<tr><td colspan="2">No images found or updated.</td></tr>';
        if (videoTableBody) videoTableBody.innerHTML = '<tr><td colspan="2">No videos found or updated.</td></tr>';
      }
    }
  });
});
