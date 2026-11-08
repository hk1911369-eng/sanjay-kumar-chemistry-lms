export function JmtHeroGraphic() {
  return (
    <div className="jmt-visual-placeholder jmt-hero-art" role="img" aria-label="JMT Academy chemistry learning illustration with a benzene molecule and laboratory flask">
      <svg viewBox="0 0 640 360" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="jmt-art-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1c5a9c"/>
            <stop offset=".55" stopColor="#0b2d5b"/>
            <stop offset="1" stopColor="#061a38"/>
          </linearGradient>
          <linearGradient id="jmt-flask" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8e5ff" stopOpacity=".85"/>
            <stop offset="1" stopColor="#58a9ef" stopOpacity=".22"/>
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#jmt-art-bg)"/>
        <g stroke="#b7d9ff" strokeOpacity=".12" strokeWidth="1">
          {Array.from({length:13},(_,i)=><line key={'v'+i} x1={i*54} y1="0" x2={i*54} y2="360"/>)}
          {Array.from({length:8},(_,i)=><line key={'h'+i} x1="0" y1={i*52} x2="640" y2={i*52}/>)}
        </g>
        <g fill="none" stroke="#a9d9ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M170 90 225 58 280 90 280 154 225 186 170 154Z"/>
          <path d="M185 99 225 76 265 99 265 145 225 168 185 145Z" strokeWidth="2" strokeOpacity=".75"/>
          <path d="M280 90 326 64 366 87"/>
          <path d="M280 154 322 180 360 158"/>
        </g>
        <g fill="#e4f5ff" stroke="#4b9fe4" strokeWidth="3">
          <circle cx="170" cy="90" r="9"/><circle cx="225" cy="58" r="9"/><circle cx="280" cy="90" r="9"/>
          <circle cx="280" cy="154" r="9"/><circle cx="225" cy="186" r="9"/><circle cx="170" cy="154" r="9"/>
          <circle cx="366" cy="87" r="8"/><circle cx="360" cy="158" r="8"/>
        </g>
        <g transform="translate(405 50)" stroke="#d5efff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M48 0h56M62 0v85l-48 94c-8 16 4 34 22 34h96c18 0 30-18 22-34l-48-94V0" fill="none"/>
          <path d="M34 150c35-18 62 18 102 0l17 34c5 11-3 23-15 23H36c-12 0-20-12-15-23Z" fill="url(#jmt-flask)" stroke="none"/>
          <path d="M30 148c35-18 62 18 102 0" fill="none" stroke="#8bd2ff" strokeWidth="4"/>
          <circle cx="68" cy="165" r="5" fill="#d5efff" stroke="none"/>
          <circle cx="112" cy="177" r="7" fill="#d5efff" stroke="none"/>
        </g>
        <g fill="#d8edff" opacity=".7">
          <circle cx="90" cy="245" r="3"/><circle cx="125" cy="285" r="5"/><circle cx="330" cy="260" r="4"/>
          <circle cx="360" cy="230" r="3"/><circle cx="565" cy="60" r="4"/><circle cx="585" cy="270" r="3"/>
        </g>
      </svg>
      <span>JMT</span>
      <b>CHEMISTRY · LEARNING · PROGRESS</b>
    </div>
  );
}
