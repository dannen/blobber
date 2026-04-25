let collectedMediaUrls = [];

function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function getExtFromUrl(url) {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

function collectMediaUrls(existingUrls = []) {
  const seenUrls = new Set(existingUrls.map(m => m.url));
  const mediaUrls = [...existingUrls];

  function add(url, filename, type) {
    if (!url || seenUrls.has(url)) return;
    if (url.includes('thumb')) return;
    if (filename.toLowerCase().endsWith('.svg')) return;
    seenUrls.add(url);
    mediaUrls.push({ url, filename, type });
  }

  // <img> elements — use currentSrc to respect responsive image selection
  document.querySelectorAll('img').forEach((img, i) => {
    const src = img.currentSrc || img.src;
    if (src) add(src, `image-${i}.${getExtFromUrl(src) || 'jpg'}`, 'image');

    // Lazy-load patterns used by many frameworks
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'data-url']) {
      const val = img.getAttribute(attr);
      if (val) add(val, `image-${i}-lazy.${getExtFromUrl(val) || 'jpg'}`, 'image');
    }
  });

  // <picture> source srcset — each comma-separated entry is a candidate URL
  document.querySelectorAll('picture source[srcset]').forEach((source, i) => {
    source.srcset.split(',').forEach(entry => {
      const url = entry.trim().split(/\s+/)[0];
      if (url) add(url, `picture-${i}.${getExtFromUrl(url) || 'jpg'}`, 'image');
    });
  });

  // CSS background-image — only scans elements with inline background style to avoid
  // iterating every element's computed style (which would freeze the page)
  document.querySelectorAll('[style*="background"]').forEach((el, i) => {
    const bg = el.style.backgroundImage;
    if (!bg || bg === 'none') return;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    let match;
    while ((match = re.exec(bg)) !== null) {
      if (match[1] && !match[1].startsWith('data:')) {
        add(match[1], `bg-${i}.${getExtFromUrl(match[1]) || 'jpg'}`, 'image');
      }
    }
  });

  // <video> elements — check currentSrc, src, child <source> tags, and lazy attrs
  document.querySelectorAll('video').forEach((video, i) => {
    const src = video.currentSrc || video.src;
    if (src) add(src, `video-${i}.${getExtFromUrl(src) || 'mp4'}`, 'video');

    video.querySelectorAll('source').forEach((source, si) => {
      if (source.src) add(source.src, `video-${i}-${si}.${getExtFromUrl(source.src) || 'mp4'}`, 'video');
    });

    const dataSrc = video.getAttribute('data-src');
    if (dataSrc) add(dataSrc, `video-${i}-lazy.${getExtFromUrl(dataSrc) || 'mp4'}`, 'video');
  });

  return mediaUrls;
}

function updateMediaUrls() {
  collectedMediaUrls = collectMediaUrls(collectedMediaUrls);
  chrome.runtime.sendMessage({ action: "updateMediaUrls", mediaUrls: collectedMediaUrls });
}

const debouncedUpdate = debounce(updateMediaUrls, 250);

const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      const hasMedia = Array.from(mutation.addedNodes).some(node =>
        node.nodeType === 1 && (
          node.tagName === 'IMG' || node.tagName === 'VIDEO' ||
          (node.querySelector && node.querySelector('img, video, picture') !== null)
        )
      );
      if (hasMedia) { debouncedUpdate(); break; }
    } else if (mutation.type === 'attributes') {
      const tag = mutation.target.tagName;
      if (tag === 'IMG' || tag === 'VIDEO' || tag === 'SOURCE') {
        debouncedUpdate();
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src', 'data-src', 'srcset', 'data-lazy-src', 'data-original']
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "collectMedia") {
    collectedMediaUrls = collectMediaUrls();
    sendResponse({ mediaUrls: collectedMediaUrls });
  }
});
