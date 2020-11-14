const scripts = [
  chrome.extension.getURL('contentscript.js')
]
scripts.forEach((path) => {
  const s = document.createElement('script')
  s.src = path
  s.onload = () => {
    s.parentNode.removeChild(s)
  }
  s.onerror = (e) => {
    console.error('Adding script failed:', e.target.src, e);
  }
  document.head.appendChild(s)
});