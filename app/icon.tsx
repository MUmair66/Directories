import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Brand mark: purple map pin holding a storefront, wrapped by a swoosh, on a soft lilac tile. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #F5EBFA 0%, #E6D0F3 100%)", borderRadius: 112 }}>
        <svg width="380" height="428" viewBox="0 0 64 72">
          <defs>
            <linearGradient id="pin" x1="0.9" y1="0" x2="0.1" y2="1">
              <stop offset="0" stopColor="#8E24AA" />
              <stop offset="1" stopColor="#2B1452" />
            </linearGradient>
            <linearGradient id="swoosh" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#7B1FA2" />
              <stop offset="1" stopColor="#B040D0" />
            </linearGradient>
          </defs>
          <path d="M32 3C18.2 3 7 14 7 27.6 7 45 32 69 32 69s25-24 25-41.4C57 14 45.8 3 32 3Z" fill="url(#pin)" />
          <circle cx="32" cy="27" r="15.5" fill="#fff" />
          <rect x="23.5" y="25" width="17" height="12" rx="1" fill="#3A1663" />
          <rect x="25.6" y="27.6" width="6" height="6" rx="0.6" fill="#fff" />
          <rect x="34" y="27.6" width="4.6" height="9.4" rx="0.6" fill="#D8A7F5" />
          <path d="M22 18.5h20l1.4 5.8H20.6Z" fill="#7B1FA2" />
          <path d="M26 18.5h4v5.8h-4.6ZM34 18.5h4l.6 5.8H34Z" fill="#fff" />
          <path d="M20.6 24.3a2.4 2.4 0 0 0 4.8 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.6 0 2.4 2.4 0 0 0 4.2 0Z" fill="#7B1FA2" />
          <path d="M1.5 64.5C6 55 30 46.5 61 40.5 39 49 15 56.5 7.5 66.6c-2 2.6-7.3 1.3-6-2.1Z" fill="url(#swoosh)" />
        </svg>
      </div>
    ),
    size,
  );
}
