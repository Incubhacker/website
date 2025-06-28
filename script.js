gsap.registerPlugin(ScrollTrigger);

let iteration = 0;

const spacing = 0.1,
  snap = gsap.utils.snap(spacing),
  cards = gsap.utils.toArray('.cards li'),
  seamlessLoop = buildSeamlessLoop(cards, spacing),
  scrub = gsap.to(seamlessLoop, {
    totalTime: 0,
    duration: 1.5,
    ease: "power3",
    paused: true
  }),
  trigger = ScrollTrigger.create({
    start: 0,
    onUpdate(self) {
      if (self.progress === 1 && self.direction > 0 && !self.wrapping) {
        wrapForward(self);
      } else if (self.progress < 1e-5 && self.direction < 0 && !self.wrapping) {
        wrapBackward(self);
      } else {
        scrub.vars.totalTime = snap((iteration + self.progress) * seamlessLoop.duration());
        scrub.invalidate().restart();
        self.wrapping = false;
      }
    },
    end: "+=3000",
    pin: ".gallery"
  });

function wrapForward(trigger) {
  iteration++;
  trigger.wrapping = true;
  trigger.scroll(trigger.start + 1);
}

function wrapBackward(trigger) {
  iteration--;
  if (iteration < 0) {
    iteration = Math.max(0, Math.ceil(cards.length / (1 / spacing)) - 1);
    seamlessLoop.totalTime(seamlessLoop.totalTime() + seamlessLoop.duration() * 10);
    scrub.pause();
  }
  trigger.wrapping = true;
  trigger.scroll(trigger.end - 1);
}

function scrubTo(totalTime) {
  let progress = (totalTime - seamlessLoop.duration() * iteration) / seamlessLoop.duration();
  if (progress > 1) {
    wrapForward(trigger);
  } else if (progress < 0) {
    wrapBackward(trigger);
  } else {
    trigger.scroll(trigger.start + progress * (trigger.end - trigger.start));
  }
}

document.querySelector(".next").addEventListener("click", () => {
  scrubTo(scrub.vars.totalTime + spacing);
  manualInteraction();
});
document.querySelector(".prev").addEventListener("click", () => {
  scrubTo(scrub.vars.totalTime - spacing);
  manualInteraction();
});

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

// Auto-scroll
let autoScroll;
let resumeTimeout;
let isHovered = false;

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

// Clavier
window.addEventListener("keydown", (e) => {
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

// Molette
window.addEventListener("wheel", manualInteraction);

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
    }

    active.classList.add("active");
    active.addEventListener("mouseenter", pauseScrollAuto);
    active.addEventListener("mouseleave", resumeScrollAutoWithDelay);
    lastActiveCard = active;
  }
}

setInterval(updateActiveCard, 100);

// Lancement initial
scheduleAutoScroll(3000);

