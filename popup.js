function updateMediaList(mediaUrls) {
  const mediaTableBody = document.querySelector('#mediaTable tbody');
  mediaTableBody.innerHTML = ''; // Clear the existing list

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
      mediaTableBody.appendChild(row);
    });

    document.getElementById('downloadAll').addEventListener('click', function() {
      const uniqueMediaItems = Array.from(new Set(validMediaItems.map(JSON.stringify))).map(JSON.parse);
      chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: uniqueMediaItems }, function(response) {
        console.log(response.status);
      });
    });

    document.getElementById('downloadAllVideos').addEventListener('click', function() {
      const videoExtensions = ['.mp4', '.mov', '.mkv', '.mpg', '.mpeg'];
      const videoItems = validMediaItems.filter(media => videoExtensions.some(ext => media.filename.endsWith(ext)));
      const uniqueVideoItems = Array.from(new Set(videoItems.map(JSON.stringify))).map(JSON.parse);
      chrome.runtime.sendMessage({ action: "downloadAll", mediaUrls: uniqueVideoItems }, function(response) {
        console.log(response.status);
      });
    });

    document.getElementById('downloadAllImages').addEventListener('click', function() {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      const imageItems = validMediaItems.filter(media => imageExtensions.some(ext => media.filename.endsWith(ext)));
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
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        return;
      }
      console.log('Media URLs received:', response.mediaUrls);
      updateMediaList(response.mediaUrls);
    });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateMediaUrls") {
      updateMediaList(request.mediaUrls);
    }
  });
});
