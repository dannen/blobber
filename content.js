let collectedMediaUrls = [];

function collectMediaUrls(existingUrls = []) {
  const mediaUrls = [...existingUrls];
  const images = document.querySelectorAll('img');
  const videos = document.querySelectorAll('video');

  images.forEach((img, index) => {
    if (img.src && !img.src.includes('thumb') && !mediaUrls.some(media => media.url === img.src)) {
      const url = img.src;
      const filename = `image-${index}.png`;
      mediaUrls.push({ url, filename });
      console.log(`Image found: ${url}`);
    } else if (img.src.includes('thumb')) {
      console.log(`Image skipped (contains 'thumb'): ${img.src}`);
    }
  });

  videos.forEach((video, index) => {
    if (video.src && !mediaUrls.some(media => media.url === video.src)) {
      const url = video.src;
      const filename = `video-${index}.mp4`;
      mediaUrls.push({ url, filename });
      console.log(`Video found with src: ${url}`);
    } else if (video.src.includes('thumb')) {
      console.log(`Video skipped (contains 'thumb'): ${video.src}`);
    } else {
      const sources = video.querySelectorAll('source');
      sources.forEach((source, sourceIndex) => {
        if (source.src && !mediaUrls.some(media => media.url === source.src)) {
          const url = source.src;
          const filename = `video-${index}-${sourceIndex}.mp4`;
          mediaUrls.push({ url, filename });
          console.log(`Video source found: ${url}`);
        } else if (source.src.includes('thumb')) {
          console.log(`Video source skipped (contains 'thumb'): ${source.src}`);
        }
      });
    }
  });

  console.log('Collected media URLs:', mediaUrls);
  return mediaUrls;
}

function updateMediaUrls() {
  collectedMediaUrls = collectMediaUrls(collectedMediaUrls);
  chrome.runtime.sendMessage({ action: "updateMediaUrls", mediaUrls: collectedMediaUrls });
}

const observer = new MutationObserver(updateMediaUrls);
observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "collectMedia") {
    sendResponse({ mediaUrls: collectedMediaUrls });
  }
});
