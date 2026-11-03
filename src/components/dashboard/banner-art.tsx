export function BannerArt() {
  return (
    <svg
      className="welcome-art"
      viewBox="0 0 740 190"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bannerFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#06110e" stopOpacity="0" />
          <stop offset="0.3" stopColor="#06110e" stopOpacity="0.2" />
          <stop offset="1" stopColor="#06110e" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="screenFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#061b14" />
          <stop offset="1" stopColor="#03110c" />
        </linearGradient>
        <linearGradient id="laptopBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18221f" />
          <stop offset="1" stopColor="#070c0a" />
        </linearGradient>
        <linearGradient id="keyboard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2521" />
          <stop offset="1" stopColor="#0a100e" />
        </linearGradient>
        <filter id="greenGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="42" />
        </filter>
        <radialGradient id="smoke" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#00ffae" stopOpacity="0.18" />
          <stop offset="1" stopColor="#00ffae" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="740" height="190" fill="url(#bannerFade)" />
      <ellipse cx="565" cy="95" rx="185" ry="105" fill="url(#smoke)" filter="url(#softGlow)" />
      <ellipse cx="645" cy="37" rx="95" ry="52" fill="#00e79f" opacity="0.1" filter="url(#softGlow)" />
      <ellipse cx="505" cy="167" rx="185" ry="22" fill="#00d995" opacity="0.16" filter="url(#greenGlow)" />

      <g opacity="0.16" stroke="#00ffb0" strokeWidth="1">
        <ellipse cx="589" cy="92" rx="160" ry="82" />
        <ellipse cx="589" cy="92" rx="210" ry="112" />
        <path d="M360 160c76-54 143-87 261-97 82-7 121 8 135 25" />
        <path d="M382 174c72-50 143-78 241-86 82-6 118 5 132 20" />
      </g>

      <g transform="translate(365 24) rotate(-4 210 80)">
        <rect x="47" y="5" width="328" height="142" rx="15" fill="#0b1612" stroke="#2b3d36" />
        <rect x="59" y="17" width="304" height="115" rx="5" fill="url(#screenFill)" />
        <path d="M59 17h304v115H59z" stroke="#00d995" strokeOpacity="0.25" />

        <g stroke="#14d995" strokeWidth="2.4" strokeLinecap="round" opacity="0.24">
          <path d="M76 36h46M76 44h26M133 36h84M76 53h104M76 62h61M76 71h94M76 80h36M76 89h119M76 98h56M76 107h88M76 116h32" />
        </g>
        <g stroke="#39ffbe" strokeWidth="1.7" strokeLinecap="round" opacity="0.72">
          <path d="M78 39h26M78 48h68M78 57h43M78 66h82M78 75h34M78 84h57M78 93h90M78 102h49M78 111h72" />
        </g>
        <rect x="189" y="32" width="92" height="58" rx="4" fill="#00d995" opacity="0.035" />

        <ellipse cx="210" cy="150" rx="144" ry="8" fill="#00d995" opacity="0.14" filter="url(#greenGlow)" />
        <path
          d="M17 176c12-19 41-29 99-31l151-4c50 0 81 4 106 12 19 6 26 14 21 21H26c-10-1-13-8-9-18z"
          fill="url(#keyboard)"
          stroke="#26342f"
          strokeOpacity="0.7"
        />
        <path d="M111 148h206l40 28H66z" fill="url(#laptopBody)" stroke="#32443c" />
        <path d="M142 154h140l17 14H126z" fill="#070d0b" opacity="0.75" />
        <path d="M63 178h296" stroke="#00d995" strokeOpacity="0.12" />
      </g>

      <g opacity="0.7">
        <circle cx="690" cy="156" r="2" fill="#00ffb0" />
        <circle cx="674" cy="142" r="1.2" fill="#00ffb0" />
        <circle cx="707" cy="130" r="1.4" fill="#00ffb0" />
      </g>
    </svg>
  );
}
