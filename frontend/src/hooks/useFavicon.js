import { useEffect } from "react";

const SIZE = 64;

function setLink(href) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.removeAttribute("type");
  link.href = href;
}

export default function useFavicon(url, { rounded = true, radius = SIZE / 2 } = {}) {
  useEffect(() => {
    if (!url) return;

    if (!rounded) {
      setLink(url);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous"; // required, or the canvas gets tainted

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");

        ctx.beginPath();
        ctx.roundRect(0, 0, SIZE, SIZE, radius); // radius = SIZE/2 gives a full circle
        ctx.clip();

        // cover-fit so non-square logos aren't stretched
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

        setLink(canvas.toDataURL("image/png"));
      } catch {
        setLink(url); // fallback: square icon
      }
    };

    img.onerror = () => {
      if (!cancelled) setLink(url);
    };

    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url, rounded, radius]);
}