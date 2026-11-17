// An original SVG illustration: works offline and keeps the landing page lightweight.
export function CampusIllustration() {
  return (
    <svg
      viewBox="0 0 600 380"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a sunlit college courtyard"
    >
      <rect width="600" height="380" fill="#e8eee1" />
      <circle cx="468" cy="83" r="42" fill="#edb97b" />
      <path d="M0 280Q130 230 260 276T600 264V380H0Z" fill="#adc4a0" />
      <path d="M0 315Q170 285 320 310T600 300V380H0Z" fill="#7e9f7e" />
      <path d="M240 275L360 275 430 380H164Z" fill="#e9d4b3" />
      <rect x="93" y="139" width="148" height="139" rx="3" fill="#e8cfad" />
      <rect x="357" y="139" width="148" height="139" rx="3" fill="#e8cfad" />
      <path d="M81 140L167 101 251 140Z" fill="#a75c43" />
      <path d="M347 140L431 101 517 140Z" fill="#a75c43" />
      <rect x="226" y="106" width="147" height="172" fill="#f4e5ce" />
      <path d="M211 107L300 56 388 107Z" fill="#92543e" />
      <path d="M272 278V221A28 28 0 0 1 328 221V278" fill="#345943" />
      <circle
        cx="300"
        cy="136"
        r="19"
        fill="#faf1dc"
        stroke="#b18d62"
        strokeWidth="4"
      />
      <path
        d="M300 123V136L310 141"
        fill="none"
        stroke="#345943"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[116, 158, 200, 383, 425, 467].map((x) => (
        <g key={x}>
          <rect x={x} y="164" width="16" height="27" rx="7" fill="#65816a" />
          <rect x={x} y="215" width="16" height="27" rx="7" fill="#65816a" />
        </g>
      ))}
      <path d="M59 294V212M545 295V208" stroke="#735a40" strokeWidth="10" />
      <circle cx="59" cy="195" r="38" fill="#487752" />
      <circle cx="42" cy="221" r="32" fill="#547e55" />
      <circle cx="80" cy="222" r="30" fill="#547e55" />
      <circle cx="545" cy="193" r="39" fill="#487752" />
      <circle cx="520" cy="219" r="30" fill="#547e55" />
      <circle cx="565" cy="222" r="28" fill="#547e55" />
      <path
        d="M111 314H181M119 305H173"
        stroke="#735a40"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M125 314V327M165 314V327" stroke="#735a40" strokeWidth="4" />
      <g fill="#c67651">
        <circle cx="270" cy="306" r="7" />
        <path d="M261 317Q270 311 279 317V339H261Z" />
      </g>
      <g fill="#345943">
        <circle cx="294" cy="315" r="7" />
        <path d="M285 326Q294 320 303 326V348H285Z" />
      </g>
      <path
        d="M322 338Q343 327 360 339"
        stroke="#ebc784"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80 62Q89 51 98 62M108 73Q117 62 126 73"
        stroke="#62806b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
