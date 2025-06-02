async function takeScreenshot() {
     const response = await fetch('/screenshot');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = document.getElementById('screenshot');
      img.src = url;
      img.style.display = 'block';
}