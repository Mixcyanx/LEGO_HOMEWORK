/**
 * LEGO Minifigure 幸運物網頁互動腳本 - script.js
 * 
 * 實作功能：
 * 1. 3D 視差傾斜 (Mouse Tilt on Pedestal & Cards)
 * 2. 點擊爆破微粒系統 (HTML5 Canvas Particle Burst)
 * 3. Web Audio API 積木扣合與魔法音效合成 (免外部資源)
 * 4. 人偶零件透視拆解 (Exploded View Animation)
 * 5. 四套幸運外觀切換 (Classic, Space 1980, Cyber, Wizard)
 * 6. 每日樂高幸運籤抽籤邏輯 (Fortune Generator)
 * 7. Prompt 一鍵複製與互動回饋
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. Web Audio 原生音效合成引擎 (Web Audio API)
  // ==========================================
  let audioCtx = null;
  let soundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // 合成樂高積木「喀噠 (Snap/Click)」扣合音效
  function playLegoSnapSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;
      
      // 高頻短促噪聲模擬塑膠微碰撞
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);

      // 次微音增強塑膠實體感
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800, now);
      osc2.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc2.start(now);
      osc2.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 合成抽取好運時的清脆風鈴魔法音效
  function playMagicChimeSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 和弦
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = audioCtx.currentTime + idx * 0.06;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(start);
        osc.stop(start + 0.36);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // 音效開關切換按鈕
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      initAudio();
      soundEnabled = !soundEnabled;
      const soundIcon = soundToggleBtn.querySelector('.sound-icon');
      const soundText = soundToggleBtn.querySelector('.sound-text');
      if (soundEnabled) {
        soundIcon.textContent = '🔊';
        soundText.textContent = '音效 ON';
        soundToggleBtn.classList.remove('muted');
        playLegoSnapSound();
      } else {
        soundIcon.textContent = '🔇';
        soundText.textContent = '音效 OFF';
        soundToggleBtn.classList.add('muted');
      }
    });
  }

  // ==========================================
  // 2. HTML5 Canvas 背景環境微粒與點擊爆破特效
  // ==========================================
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const ambientParticles = [];
  const burstParticles = [];

  // 初始化環境常態漂浮微粒
  for (let i = 0; i < 45; i++) {
    ambientParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.6 ? '#FFD500' : '#42A5F5',
      shape: Math.random() > 0.3 ? 'circle' : 'stud'
    });
  }

  // 點擊爆破微粒觸發
  function spawnParticleBurst(originX, originY) {
    const colors = ['#FFD500', '#FF5252', '#42A5F5', '#FFE082', '#FFFFFF'];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      burstParticles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: Math.random() * 0.03 + 0.02,
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  // 繪製粒子動畫迴圈
  function renderParticles() {
    ctx.clearRect(0, 0, width, height);

    // 1. 常態漂浮粒子
    for (let p of ambientParticles) {
      p.y -= p.speedY;
      p.x += p.speedX;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'stud') {
        // 微型積木 Stud
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. 點擊瞬間爆破粒子
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // 重力微下墜
      p.vx *= 0.98;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.life <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;

      // 繪製微型旋轉積木塊
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
      ctx.restore();
    }

    requestAnimationFrame(renderParticles);
  }
  renderParticles();

  // ==========================================
  // 3. 3D 視差傾斜追蹤 (Hero Stage & Cards Tilt)
  // ==========================================
  const pedestalContainer = document.getElementById('pedestalContainer');
  const heroStageWrapper = document.querySelector('.hero-stage-wrapper');

  if (heroStageWrapper && pedestalContainer) {
    heroStageWrapper.addEventListener('mousemove', (e) => {
      const rect = heroStageWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotateY = (x / (rect.width / 2)) * 14;
      const rotateX = -(y / (rect.height / 2)) * 14;

      pedestalContainer.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    heroStageWrapper.addEventListener('mouseleave', () => {
      pedestalContainer.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  // 卡片 3D 傾斜效果 (針對所有 [data-tilt] 卡片)
  const tiltCards = document.querySelectorAll('[data-tilt]');
  tiltCards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const rotY = (x / (rect.width / 2)) * 8;
      const rotX = -(y / (rect.height / 2)) * 8;

      card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });

  // ==========================================
  // 4. 幸運能量條與人偶點擊連動
  // ==========================================
  const minifigureElement = document.getElementById('minifigureElement');
  const luckyPercentage = document.getElementById('luckyPercentage');
  const luckyProgressBar = document.getElementById('luckyProgressBar');
  const minifigureSpeech = document.getElementById('minifigureSpeech');
  const speechText = minifigureSpeech.querySelector('.bubble-text');
  const tapLuckyBtn = document.getElementById('tapLuckyBtn');

  let currentLucky = 88;

  const luckyPhrases = [
    '「保持微笑，幸運自會拼成！」',
    '「跌碎了沒關係，再拼起來就好！」',
    '「今天也是充滿創造力的一天！」',
    '「每一塊積木都是通往夢想的階梯！」',
    '「只要雙手還在，隨時都能重塑自我！」',
    '「好運 +100！你的氣場已達巔峰！」'
  ];

  function triggerMinifigureLuckyEffect(e) {
    playLegoSnapSound();

    // 取得點擊座標產生爆破微粒
    let clickX = window.innerWidth / 2;
    let clickY = window.innerHeight / 2;
    if (e && e.clientX) {
      clickX = e.clientX;
      clickY = e.clientY;
    } else {
      const rect = minifigureElement.getBoundingClientRect();
      clickX = rect.left + rect.width / 2;
      clickY = rect.top + rect.height / 2;
    }
    spawnParticleBurst(clickX, clickY);

    // 增加幸運能量
    currentLucky += 4;
    if (currentLucky > 100) currentLucky = 100;
    luckyPercentage.textContent = `${currentLucky}%`;
    luckyProgressBar.style.width = `${currentLucky}%`;

    // 隨機更換台詞氣泡
    const randomPhrase = luckyPhrases[Math.floor(Math.random() * luckyPhrases.length)];
    speechText.textContent = randomPhrase;
    minifigureSpeech.classList.add('active');

    // 點擊彈跳動畫
    minifigureElement.style.transform = 'scale(0.92) rotate(-2deg)';
    setTimeout(() => {
      minifigureElement.style.transform = '';
    }, 200);

    // 5秒後台詞隱藏
    clearTimeout(minifigureSpeech._timer);
    minifigureSpeech._timer = setTimeout(() => {
      minifigureSpeech.classList.remove('active');
    }, 4000);
  }

  if (minifigureElement) {
    minifigureElement.addEventListener('click', triggerMinifigureLuckyEffect);
  }
  if (tapLuckyBtn) {
    tapLuckyBtn.addEventListener('click', triggerMinifigureLuckyEffect);
  }

  // ==========================================
  // 5. 零件透視拆解模式 (Exploded View)
  // ==========================================
  const explodeBtn = document.getElementById('explodeBtn');
  let isExploded = false;

  if (explodeBtn && minifigureElement) {
    explodeBtn.addEventListener('click', () => {
      isExploded = !isExploded;
      playLegoSnapSound();

      if (isExploded) {
        minifigureElement.classList.add('is-exploded');
        explodeBtn.innerHTML = '<span class="btn-icon">🔄</span> 一鍵組裝歸位';
        speechText.textContent = '「看！頭、身、腿各自獨立，這就是模組化的美！」';
        minifigureSpeech.classList.add('active');
      } else {
        minifigureElement.classList.remove('is-exploded');
        explodeBtn.innerHTML = '<span class="btn-icon">🧩</span> 零件拆解透視';
        speechText.textContent = '「卡榫到位！嚴絲合縫的完美嵌合！」';
        minifigureSpeech.classList.add('active');
      }
    });
  }

  // ==========================================
  // 6. 外觀造型切換 (Skin Switcher)
  // ==========================================
  const outfitBtns = document.querySelectorAll('.outfit-btn');
  const torsoClassicGrad = document.getElementById('torsoClassicGrad');
  const legsClassicGrad = document.getElementById('legsClassicGrad');
  const torsoPrint = document.getElementById('torsoPrint');
  const headAccessory = document.getElementById('headAccessory');
  const luckyCharmItem = document.getElementById('luckyCharmItem');

  const skins = {
    classic: {
      torsoGrad: ['#FF5252', '#D32F2F', '#8B0000'],
      legsGrad: ['#42A5F5', '#1976D2', '#0D47A1'],
      printHtml: `
        <circle cx="150" cy="205" r="22" fill="#FFFFFF" fill-opacity="0.2"/>
        <circle cx="143" cy="198" r="9" fill="#FFD500"/>
        <circle cx="157" cy="198" r="9" fill="#FFD500"/>
        <circle cx="143" cy="212" r="9" fill="#FFD500"/>
        <circle cx="157" cy="212" r="9" fill="#FFD500"/>
        <path d="M150 205 Q152 225 158 228" stroke="#FFD500" stroke-width="3" fill="none" stroke-linecap="round"/>
        <circle cx="150" cy="205" r="4" fill="#FFFFFF"/>
      `,
      accessoryHtml: `
        <path d="M112 84 Q150 56 188 84 Q188 74 150 68 Q112 74 112 84 Z" fill="#D32F2F"/>
        <path d="M110 84 Q150 78 190 84 L198 90 Q150 82 102 90 Z" fill="#B71C1C"/>
      `,
      luckyItemHtml: `
        <rect x="-12" y="-12" width="24" height="20" rx="3" fill="url(#goldLuckyGrad)" stroke="#B78103" stroke-width="1.5" filter="url(#luckyGlowFilter)"/>
        <circle cx="-5" cy="-14" r="3.5" fill="#FFE082" stroke="#B78103" stroke-width="1"/>
        <circle cx="5" cy="-14" r="3.5" fill="#FFE082" stroke="#B78103" stroke-width="1"/>
      `,
      speech: '「換上經典紅藍戰袍！純真力量滿格！」'
    },
    space: {
      torsoGrad: ['#3B82F6', '#1D4ED8', '#1E3A8A'],
      legsGrad: ['#3B82F6', '#1D4ED8', '#1E3A8A'],
      printHtml: `
        <!-- 經典 1980 樂高太空徽章標誌 -->
        <ellipse cx="148" cy="202" rx="16" ry="11" fill="#FFD500"/>
        <circle cx="140" cy="202" r="7" fill="#EF4444"/>
        <path d="M136 210 Q160 190 166 195" stroke="#FFFFFF" stroke-width="3" fill="none"/>
      `,
      accessoryHtml: `
        <!-- 復古太空安全帽與金色面罩 -->
        <circle cx="150" cy="110" r="38" fill="#1D4ED8" stroke="#1E3A8A" stroke-width="2"/>
        <ellipse cx="150" cy="112" rx="28" ry="22" fill="#FFD500" opacity="0.85"/>
      `,
      luckyItemHtml: `
        <!-- 太空推進器或星際導航儀 -->
        <polygon points="0,-16 12,8 -12,8" fill="#FFD500"/>
        <circle cx="0" cy="0" r="4" fill="#EF4444"/>
      `,
      speech: '「1980 宇宙先鋒就位！探索無限未知的勇氣！」'
    },
    cyber: {
      torsoGrad: ['#111827', '#1F2937', '#030712'],
      legsGrad: ['#1F2937', '#111827', '#030712'],
      printHtml: `
        <!-- 賽博龐克螢光霓虹線路 -->
        <path d="M125 170 L145 190 L145 220 L135 235" stroke="#00F0FF" stroke-width="2.5" fill="none"/>
        <path d="M175 170 L155 190 L155 220 L165 235" stroke="#A855F7" stroke-width="2.5" fill="none"/>
        <circle cx="150" cy="205" r="7" fill="#00F0FF" filter="url(#luckyGlowFilter)"/>
      `,
      accessoryHtml: `
        <!-- 科技眼罩 HUD Visor -->
        <rect x="118" y="100" width="64" height="14" rx="4" fill="#00F0FF" opacity="0.9" filter="url(#luckyGlowFilter)"/>
        <line x1="120" y1="107" x2="180" y2="107" stroke="#FFFFFF" stroke-width="1.5"/>
      `,
      luckyItemHtml: `
        <!-- 賽博量子積木方塊 -->
        <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#A855F7" stroke="#00F0FF" stroke-width="2"/>
        <circle cx="0" cy="0" r="3" fill="#FFFFFF"/>
      `,
      speech: '「啟動賽博造夢矩陣！未來由你即刻編譯！」'
    },
    wizard: {
      torsoGrad: ['#6B21A8', '#4C1D95', '#2E1065'],
      legsGrad: ['#4C1D95', '#2E1065', '#1E1B4B'],
      printHtml: `
        <!-- 奇幻法師金星與垂墜符文 -->
        <polygon points="150,185 153,195 163,195 155,201 158,211 150,205 142,211 145,201 137,195 147,195" fill="#FFD500"/>
        <path d="M150 215 L150 245" stroke="#FFD500" stroke-width="2" stroke-dasharray="3 3"/>
      `,
      accessoryHtml: `
        <!-- 尖頂法師帽 -->
        <polygon points="150,30 180,82 120,82" fill="#4C1D95" stroke="#FFD500" stroke-width="1.5"/>
        <ellipse cx="150" cy="82" rx="38" ry="8" fill="#6B21A8"/>
      `,
      luckyItemHtml: `
        <!-- 幸運法杖水晶石 -->
        <circle cx="0" cy="-6" r="8" fill="#10B981" filter="url(#luckyGlowFilter)"/>
        <rect x="-3" y="2" width="6" height="22" fill="#78350F"/>
      `,
      speech: '「魔法共鳴！將挫折轉化為奇蹟的法術已生效！」'
    }
  };

  outfitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const skinKey = btn.dataset.skin;
      const targetSkin = skins[skinKey];
      if (!targetSkin) return;

      playLegoSnapSound();

      outfitBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新 SVG 漸層色標
      if (torsoClassicGrad) {
        const stops = torsoClassicGrad.querySelectorAll('stop');
        if (stops.length >= 3) {
          stops[0].setAttribute('stop-color', targetSkin.torsoGrad[0]);
          stops[1].setAttribute('stop-color', targetSkin.torsoGrad[1]);
          stops[2].setAttribute('stop-color', targetSkin.torsoGrad[2]);
        }
      }

      if (legsClassicGrad) {
        const stops = legsClassicGrad.querySelectorAll('stop');
        if (stops.length >= 3) {
          stops[0].setAttribute('stop-color', targetSkin.legsGrad[0]);
          stops[1].setAttribute('stop-color', targetSkin.legsGrad[1]);
          stops[2].setAttribute('stop-color', targetSkin.legsGrad[2]);
        }
      }

      // 更新身體印花與頭飾、手持物
      if (torsoPrint) torsoPrint.innerHTML = targetSkin.printHtml;
      if (headAccessory) headAccessory.innerHTML = targetSkin.accessoryHtml;
      if (luckyCharmItem) luckyCharmItem.innerHTML = targetSkin.luckyItemHtml;

      speechText.textContent = targetSkin.speech;
      minifigureSpeech.classList.add('active');

      // 觸發微粒
      const rect = minifigureElement.getBoundingClientRect();
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  });

  // ==========================================
  // 7. 每日樂高幸運籤抽籤邏輯 (Fortune Generator)
  // ==========================================
  const fortunes = [
    {
      title: '🚀 宇宙先鋒人偶',
      icon: '🌌',
      quote: '「野心沒有地心引力限制！只要積木卡榫牢固，每顆星辰都能抵達。」',
      color: '電光星際藍',
      colorHex: '#3B82F6',
      textColor: '#FFFFFF',
      item: '星際推進氧氣背包'
    },
    {
      title: '🛡️ 堅毅騎士人偶',
      icon: '⚔️',
      quote: '「跌倒掉零件不可怕，每一次重裝歸來的你，都裝配了更堅固的鎧甲。」',
      color: '精鋼鍛造銀',
      colorHex: '#94A3B8',
      textColor: '#0F172A',
      item: '不屈勇氣之盾'
    },
    {
      title: '🛠️ 城市築夢工匠',
      icon: '🏗️',
      quote: '「腳踏實地砌下每一塊積木，當黃昏降臨，你已建造出屬於自己的摩天城鎮。」',
      color: '耀目光芒橘',
      colorHex: '#F97316',
      textColor: '#FFFFFF',
      item: '萬能螺絲扳手'
    },
    {
      title: '🌟 經典微笑守護者',
      icon: '👑',
      quote: '「嘴角那抹 15 度的上揚弧度，是宇宙中最溫柔且強大的好運磁鐵。」',
      color: '樂高帝王金',
      colorHex: '#FFD500',
      textColor: '#111827',
      item: '黃金四葉草積木'
    },
    {
      title: '🧙‍♂️ 奇蹟星辰法師',
      icon: '🔮',
      quote: '「想像力是最高階的魔法。只要敢於想像，今天的任何難題都迎刃而解。」',
      color: '秘境幻影紫',
      colorHex: '#8B5CF6',
      textColor: '#FFFFFF',
      item: '智慧紫晶魔杖'
    },
    {
      title: '🏎️ 極速追風賽車手',
      icon: '🏁',
      quote: '「直線考驗速度，彎道考驗心態。穩握方向盤，今天整條賽道都是你的主場！」',
      color: '熱血極速紅',
      colorHex: '#EF4444',
      textColor: '#FFFFFF',
      item: '方格冠軍旗幟'
    }
  ];

  const drawFortuneBtn = document.getElementById('drawFortuneBtn');
  const fortuneCard = document.getElementById('fortuneCard');
  const fortuneIcon = document.getElementById('fortuneIcon');
  const fortuneTitle = document.getElementById('fortuneTitle');
  const fortuneQuote = document.getElementById('fortuneQuote');
  const luckyColorBadge = document.getElementById('luckyColorBadge');
  const luckyItemBadge = document.getElementById('luckyItemBadge');

  if (drawFortuneBtn && fortuneCard) {
    drawFortuneBtn.addEventListener('click', () => {
      // 觸發音效與晃動反饋
      playLegoSnapSound();
      fortuneCard.classList.add('shake');

      // 禁用按鈕防止快速重複點擊
      drawFortuneBtn.disabled = true;

      setTimeout(() => {
        fortuneCard.classList.remove('shake');
        playMagicChimeSound();

        // 隨機抽籤
        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

        fortuneIcon.textContent = fortune.icon;
        fortuneTitle.textContent = fortune.title;
        fortuneQuote.textContent = fortune.quote;

        luckyColorBadge.textContent = fortune.color;
        luckyColorBadge.style.background = fortune.colorHex;
        luckyColorBadge.style.color = fortune.textColor;

        luckyItemBadge.textContent = fortune.item;

        // 觸發抽籤卡片粒子爆破
        const rect = fortuneCard.getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);

        drawFortuneBtn.disabled = false;
      }, 500);
    });
  }

  // ==========================================
  // 8. 步驟三 Prompt 一鍵複製功能
  // ==========================================
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const promptCodeText = document.querySelector('.prompt-code-text');

  if (copyPromptBtn && promptCodeText) {
    copyPromptBtn.addEventListener('click', async () => {
      const textToCopy = promptCodeText.textContent.trim();
      try {
        await navigator.clipboard.writeText(textToCopy);
        playLegoSnapSound();
        const origText = copyPromptBtn.textContent;
        copyPromptBtn.textContent = '✓ 已複製指令！';
        copyPromptBtn.style.background = '#27c93f';
        copyPromptBtn.style.borderColor = '#27c93f';
        copyPromptBtn.style.color = '#fff';

        setTimeout(() => {
          copyPromptBtn.textContent = origText;
          copyPromptBtn.style.background = '';
          copyPromptBtn.style.borderColor = '';
          copyPromptBtn.style.color = '';
        }, 2200);
      } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        copyPromptBtn.textContent = '✓ 已複製指令！';
        setTimeout(() => {
          copyPromptBtn.textContent = '複製指令';
        }, 2200);
      }
    });
  }

  // 平滑滾動導覽與目前位置標註
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      if (window.pageYOffset >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  console.log('🧱 LEGO Minifigure Lucky Charm Webpage loaded successfully!');
});
