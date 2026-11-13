"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Runs admin-written HTML/CSS/JavaScript in a sandboxed iframe (no allow-same-origin):
 * scripts work, but can't read the site's cookies, storage or DOM. The frame reports its
 * content height so it sizes itself like normal page content.
 */
export function CodeFrame({ code, title, background }: { code: string; title: string; background?: string }) {
  const id = useId();
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;padding:0;background:${background || "transparent"};font-family:Inter,ui-sans-serif,system-ui,sans-serif}body{display:flow-root}</style></head>
<body>${code}
<script>(function(){var send=function(){parent.postMessage({lpFrame:${JSON.stringify(id)},h:Math.ceil(document.body.getBoundingClientRect().height)},"*")};
new ResizeObserver(send).observe(document.body);window.addEventListener("load",send);window.addEventListener("message",function(e){if(e.data==="lpMeasure")send()});send();})();</script></body></html>`,
    [code, id, background],
  );

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data as { lpFrame?: string; h?: number };
      if (d?.lpFrame === id && typeof d.h === "number") setHeight(Math.min(Math.max(d.h, 20), 20000));
    };
    window.addEventListener("message", onMsg);
    // The frame may have loaded before hydration: ask it for its height now that we listen.
    ref.current?.contentWindow?.postMessage("lpMeasure", "*");
    return () => window.removeEventListener("message", onMsg);
  }, [id]);

  return (
    <iframe
      ref={ref}
      title={title || "Custom content"}
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      loading="lazy"
      onLoad={() => ref.current?.contentWindow?.postMessage("lpMeasure", "*")}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}
