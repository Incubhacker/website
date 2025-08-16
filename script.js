/**
 * Limite la fréquence d'exécution d'une fonction.
 * @param {Function} func La fonction à exécuter.
 * @param {number} limit Le délai en millisecondes.
 * @returns {Function} La nouvelle fonction "throttled".
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

gsap.registerPlugin(ScrollTrigger);

let iteration = 0;
let autoScroll;
let resumeTimeout;
let isHovered = false;
let isOverActiveCard = false;

const spacing = 0.1,
  snap = gsap.utils.snap(spacing),
  cards = gsap.utils.toArray('.cards li'),
  seamlessLoop = buildSeamlessLoop(cards, spacing),
  scrub = gsap.to(seamlessLoop, {
    totalTime: 0,
    duration: 1.5,
    ease: "power3",
    paused: true
  });

// 🎯 RESTAURER LA LOGIQUE ORIGINALE DE SCRUBTO
function scrubTo(totalTime) {
  console.log("scrubTo appelé avec:", totalTime);
  let progress = (totalTime - seamlessLoop.duration() * iteration) / seamlessLoop.duration();
  console.log("Progress calculé:", progress, "iteration:", iteration);
  
  if (progress > 1) {
    console.log("🔄 WRAP FORWARD");
    wrapForward();
  } else if (progress < 0) {
    console.log("🔄 WRAP BACKWARD");
    wrapBackward();
  } else {
    console.log("➡️ SCRUB NORMAL");
    scrub.vars.totalTime = snap(totalTime);
    scrub.invalidate().restart();
  }
}

// 🎯 RESTAURER LES FONCTIONS DE WRAP ORIGINALES
function wrapForward() {
  iteration++;
  // 🎯 ADAPTATION: Simuler le comportement du trigger
  let newTime = snap(iteration * seamlessLoop.duration() + 0.01);
  scrub.vars.totalTime = newTime;
  scrub.invalidate().restart();
}

function wrapBackward() {
  iteration--;
  if (iteration < 0) {
    iteration = 9;
    seamlessLoop.totalTime(seamlessLoop.totalTime() + seamlessLoop.duration() * 10);
  }
  // 🎯 ADAPTATION: Simuler le comportement du trigger
  let newTime = snap(iteration * seamlessLoop.duration() + seamlessLoop.duration() - 0.01);
  scrub.vars.totalTime = newTime;
  scrub.invalidate().restart();
}

// Événements boutons
const nextBtn = document.querySelector(".next");
const prevBtn = document.querySelector(".prev");
const flexbox = document.querySelector(".main-flexbox");

if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    scrubTo(scrub.vars.totalTime + spacing);
    manualInteraction();
  });
}

if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    scrubTo(scrub.vars.totalTime - spacing);
    manualInteraction();
  });
}

// Événements molette sur la flexbox SEULEMENT si survol carte active
if (flexbox) {
  // Crée une fonction "throttled" pour gérer le défilement
  const throttledWheelHandler = throttle((e) => {
    if (isOverActiveCard) {
      e.preventDefault();
      if (e.deltaY > 0) {
        scrubTo(scrub.vars.totalTime + spacing);
      } else {
        scrubTo(scrub.vars.totalTime - spacing);
      }
      manualInteraction();
    }
  }, 800); // <-- Délai de 800ms avant de pouvoir défiler à nouveau

  flexbox.addEventListener("wheel", throttledWheelHandler);

  // Clavier sur la flexbox
  flexbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrubTo(scrub.vars.totalTime + spacing);
      manualInteraction();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrubTo(scrub.vars.totalTime - spacing);
      manualInteraction();
    }
  });

  // Rendre la flexbox focusable
  flexbox.setAttribute("tabindex", "0");
}

function buildSeamlessLoop(items, spacing) {
  let overlap = Math.ceil(1 / spacing),
    startTime = items.length * spacing + 0.5,
    loopTime = (items.length + overlap) * spacing + 1,
    rawSequence = gsap.timeline({ paused: true }),
    seamlessLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() {
        this._time === this._dur && (this._tTime += this._dur - 0.01);
      }
    }),
    l = items.length + overlap * 2,
    time = 0,
    i, index, item;

  gsap.set(items, { xPercent: 400, opacity: 0, scale: 0 });

  for (i = 0; i < l; i++) {
    index = i % items.length;
    item = items[index];
    time = i * spacing;
    rawSequence.fromTo(item, { scale: 0, opacity: 0 }, {
      scale: 1,
      opacity: 1,
      zIndex: 100,
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: "power1.in",
      immediateRender: false
    }, time)
    .fromTo(item, { xPercent: 400 }, {
      xPercent: -400,
      duration: 1,
      ease: "none",
      immediateRender: false
    }, time);
    i <= items.length && seamlessLoop.add("label" + i, time);
  }

  rawSequence.time(startTime);
  seamlessLoop.to(rawSequence, {
    time: loopTime,
    duration: loopTime - startTime,
    ease: "none"
  }).fromTo(rawSequence, { time: overlap * spacing + 1 }, {
    time: startTime,
    duration: startTime - (overlap * spacing + 1),
    immediateRender: false,
    ease: "none"
  });
  return seamlessLoop;
}

// Auto-scroll functions
function scrollNext() {
  scrubTo(scrub.vars.totalTime + spacing);
  scheduleAutoScroll();
}

function scheduleAutoScroll(delay = 3000) {
  clearTimeout(resumeTimeout);
  if (autoScroll) autoScroll.kill();
  if (isHovered) return;
  resumeTimeout = setTimeout(() => {
    autoScroll = gsap.delayedCall(0.1, scrollNext);
  }, delay);
}

function pauseAutoScroll() {
  if (autoScroll) autoScroll.kill();
  clearTimeout(resumeTimeout);
}

function manualInteraction() {
  pauseAutoScroll();
  scheduleAutoScroll(12000);
}

// --- Survol uniquement sur la carte au premier plan ---
let lastActiveCard = null;

function pauseScrollAuto() {
  isHovered = true;
  pauseAutoScroll();
}

function resumeScrollAutoWithDelay() {
  isHovered = false;
  scheduleAutoScroll(3000);
}

function updateActiveCard() {
  let active = cards.reduce((maxEl, el) => {
    return (parseFloat(gsap.getProperty(el, "opacity")) || 0) >
           (parseFloat(gsap.getProperty(maxEl, "opacity")) || 0)
           ? el : maxEl;
  }, cards[0]);

  if (active !== lastActiveCard) {
    if (lastActiveCard) {
      lastActiveCard.classList.remove("active");
      lastActiveCard.removeEventListener("mouseenter", pauseScrollAuto);
      lastActiveCard.removeEventListener("mouseleave", resumeScrollAutoWithDelay);
      lastActiveCard.removeEventListener("mouseenter", () => { isOverActiveCard = true; });
      lastActiveCard.removeEventListener("mouseleave", () => { isOverActiveCard = false; });
    }

    active.classList.add("active");
    active.addEventListener("mouseenter", pauseScrollAuto);
    active.addEventListener("mouseleave", resumeScrollAutoWithDelay);
    
    // 🎯 NOUVEAU: Gérer isOverActiveCard
    active.addEventListener("mouseenter", () => { isOverActiveCard = true; });
    active.addEventListener("mouseleave", () => { isOverActiveCard = false; });
    
    lastActiveCard = active;
  }
}

// --- Helpers ---
function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text).replace(/\r\n?/g, '\n').split('\n');
  const lines = [];
  for (const para of paragraphs) {
    if (para === '') { lines.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function textToPNG(text, width = 600, height = 500, font = 'bold 36px Arial', color = 'white', align = 'center') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;

  const fontSize = parseInt((font.match(/(\d+)px/) || [0, 36])[1], 10) || 36;
  const lineHeight = Math.round(fontSize * 1.2);

  const lines = wrapText(ctx, text, width * 0.9);
  const totalHeight = lines.length * lineHeight;
  let y = (height - totalHeight) / 2 + lineHeight / 2;
  const x = align === 'right' ? width * 0.95 : align === 'left' ? width * 0.05 : width / 2;

  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return canvas.toDataURL('image/png');
}

// Convertit le HTML d’un élément en texte multi-ligne pour le canvas
function extractTextWithNewlines(el) {
  // 1) Prendre le HTML brut (pas textContent) pour capter les <br>
  let html = el.innerHTML;

  // 2) Remplacer les balises qui créent des retours à la ligne
  html = html
    .replace(/<br\s*\/?>/gi, '\n')                // <br> -> \n
    .replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, '\n'); // fermetures de blocs -> \n

  // 3) Supprimer le reste des balises
  html = html.replace(/<[^>]+>/g, '');

  // 4) Décoder les entités HTML (nbsp, amp, etc.)
  const tmp = document.createElement('textarea');
  tmp.innerHTML = html;
  let text = tmp.value;

  // 5) Normaliser et gérer les “\n” littéraux
  text = text
    .replace(/\r\n?/g, '\n')  // CRLF -> LF
    .replace(/\\n/g, '\n')    // littéral "\n" (deux caractères) -> vrai saut de ligne
    .replace(/\t/g, ' ')      // tab -> espace
    .replace(/[ \u00A0]{2,}/g, ' ') // espaces multiples -> 1 espace
    .trim();

  return text;
}

// --- Main ---
window.addEventListener('DOMContentLoaded', () => {
  console.log('LOADED script v2 (right-side PNG with real newlines)');

  // IMPORTANT: ne laissez AUCUN autre bloc plus bas refaire la même chose sur .right-side
  const allCards = document.querySelectorAll('.card-1, .card-2, .card-3, .card-4, .card-5, .card-6, .card-7, .card-8, .card-9, .card-10, .card-11, .card-12, .card-13, .card-14, .card-15');

  allCards.forEach(card => {
    // left-side: vous pouvez garder votre logique actuelle si ça marche pour vous,
    // ou harmoniser comme pour right-side. Ici je laisse simple:
    const left = card.querySelector('.left-side');
    if (left) {
      const rawLeft = left.textContent.trim();
      if (rawLeft) {
        const img = document.createElement('img');
        img.src = textToPNG(rawLeft, 600, 500, 'bold 36px Arial', 'white', 'center');
        img.style.width = '100%';
        img.style.height = 'auto';
        left.innerHTML = '';
        left.appendChild(img);
      }
    }

    // right-side: conversion robuste (HTML -> \n -> image)
    const right = card.querySelector('.right-side');
    if (right) {
      // Si un <img> existe déjà (ancien script), ne pas retraiter
      if (right.querySelector('img')) return;

      const multiline = extractTextWithNewlines(right);

      // Debug utile pour voir ce que le canvas va recevoir
      console.log('right-side text:', JSON.stringify(multiline));

      if (multiline) {
        const img = document.createElement('img');
        img.src = textToPNG(multiline, 600, 500, 'bold 36px Arial', 'white', 'center');
        img.style.width = '100%';
        img.style.height = 'auto';
        right.innerHTML = '';
        right.appendChild(img);
      }
    }
  });
});


setInterval(updateActiveCard, 100);

// Lancement initial
scheduleAutoScroll(3000);

let initialTouchPos = null;
let isSwiping = false; // Ajoutez une variable pour suivre l'état du balayage

flexbox.addEventListener('touchstart', (event) => {
  initialTouchPos = event.touches[0].clientX;
  isSwiping = false; // Réinitialisez à chaque départ de toucher
});

flexbox.addEventListener('touchmove', (event) => {
  if (!isSwiping) {
    const currentTouchPos = event.touches[0].clientX;
    const swipeDistance = currentTouchPos - initialTouchPos;

    // Ne prévenez le défilement que si le balayage dépasse un certain seuil
    if (Math.abs(swipeDistance) > 20) {
      isSwiping = true;
      event.preventDefault(); // Empêche le défilement si le balayage est actif
    }
  }
});

flexbox.addEventListener('touchend', (event) => {
  const finalTouchPos = event.changedTouches[0].clientX;
  if (isSwiping) {
    handleSwipeGesture(initialTouchPos, finalTouchPos);
  }
});

function handleSwipeGesture(startPos, endPos) {
  const swipeDistance = endPos - startPos;

  if (swipeDistance > 50) {
    scrubTo(scrub.vars.totalTime - spacing); // Naviguer vers la gauche
    manualInteraction();
  } else if (swipeDistance < -50) {
    scrubTo(scrub.vars.totalTime + spacing); // Naviguer vers la droite
    manualInteraction();
  }
}