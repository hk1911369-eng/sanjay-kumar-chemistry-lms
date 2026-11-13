export function JmtHeroGraphic() {
  return (
    <div className="jmt-visual-placeholder jmt-hero-art" role="img" aria-label="JMT Academy multi-subject learning illustration with an open book and learning symbols">
      <svg viewBox="0 0 640 360" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="jmt-art-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c5a9c"/>
            <stop offset=".55" stopColor="#0b2d5b"/>
            <stop offset="1" stopColor="#061a38"/>
          </linearGradient>
          <linearGradient id="jmt-page" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff"/>
            <stop offset="1" stopColor="#cfe6ff"/>
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#jmt-art-bg)"/>
        <g stroke="#b7d9ff" strokeOpacity=".12" strokeWidth="1">
          {Array.from({length:13},(_,i)=><line key={'v'+i} x1={i*54} y1="0" x2={i*54} y2="360"/>)}
          {Array.from({length:8},(_,i)=><line key={'h'+i} x1="0" y1={i*52} x2="640" y2={i*52}/>)}
        </g>
        <g fill="none" stroke="#8ccaff" strokeWidth="2" strokeOpacity=".65">
          <path d="M142 94 C190 44 255 44 300 82"/>
          <path d="M338 82 C390 40 460 48 500 102"/>
          <path d="M130 252 C188 306 252 304 302 270"/>
          <path d="M340 270 C398 308 465 300 515 248"/>
        </g>
        <g transform="translate(155 112)">
          <path d="M0 30 Q70 5 150 38 V174 Q75 142 0 168Z" fill="url(#jmt-page)" stroke="#9bcfff" strokeWidth="4"/>
          <path d="M150 38 Q230 5 300 30 V168 Q225 142 150 174Z" fill="url(#jmt-page)" stroke="#9bcfff" strokeWidth="4"/>
          <path d="M150 38 V174" stroke="#7fb7eb" strokeWidth="4"/>
          <g stroke="#7fa8d0" strokeWidth="3" strokeLinecap="round" opacity=".75">
            <path d="M28 62 Q75 50 120 65"/><path d="M28 88 Q75 76 120 91"/><path d="M28 114 Q75 102 120 117"/>
            <path d="M180 65 Q225 50 272 62"/><path d="M180 91 Q225 76 272 88"/><path d="M180 117 Q225 102 272 114"/>
          </g>
        </g>
        <g fill="#0b2d5b" stroke="#bfe4ff" strokeWidth="3">
          <circle cx="120" cy="92" r="34"/><circle cx="520" cy="96" r="34"/>
          <circle cx="112" cy="260" r="34"/><circle cx="526" cy="260" r="34"/>
        </g>
        <g fill="#e8f6ff" fontSize="26" fontWeight="800" textAnchor="middle" dominantBaseline="central">
          <text x="120" y="93">π</text>
          <text x="520" y="96">&lt;/&gt;</text>
          <text x="112" y="260">A↔</text>
          <text x="526" y="260">✦</text>
        </g>
        <g fill="#d8edff" opacity=".7">
          <circle cx="78" cy="178" r="3"/><circle cx="92" cy="208" r="5"/><circle cx="300" cy="54" r="4"/>
          <circle cx="360" cy="306" r="4"/><circle cx="565" cy="170" r="3"/><circle cx="585" cy="206" r="3"/>
        </g>
      </svg>
      <span>JMT</span>
      <b>LEARN · PRACTISE · ACHIEVE</b>
    </div>
  );
}
