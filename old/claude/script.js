// Fonction pour wrapper le texte
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Fonction de conversion texte vers PNG
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

  const lines = wrapText(ctx, text, width * 0.9);
  const lineHeight = 40;
  const totalHeight = lines.length * lineHeight;
  let startY = (height - totalHeight) / 2 + lineHeight / 2;

  let x;
  if (align === 'right') {
    x = width * 0.95;
  } else if (align === 'left') {
    x = width * 0.05;
  } else {
    x = width / 2;
  }

  lines.forEach(line => {
    ctx.fillText(line, x, startY);
    startY += lineHeight;
  });

  return canvas.toDataURL('image/png');
}

// Variables globales pour GSAP
let scrub;
let spacing = 1;
let autoScrollTimer;
let isUserControlling = false;

// Fonction pour programmer le défilement automatique
function scheduleAutoScroll(delay) {
  clearTimeout(autoScrollTimer);
  if (!isUserControlling) {
    autoScrollTimer = setTimeout(() => {
      scrubTo(scrub.vars.totalTime + spacing);
      scheduleAutoScroll(5000); // Prochain défilement dans 5s
    }, delay);
  }
}

// Fonction pour gérer les interactions manuelles
function manualInteraction() {
  isUserControlling = true;
  document.querySelector('.gallery').classList.add('user-controlling');
  
  clearTimeout(autoScrollTimer);
  
  // Reprendre l'auto-scroll après 8 secondes d'inactivité
  setTimeout(() => {
    isUserControlling = false;
    document.querySelector('.gallery').classList.remove('user-controlling');
    scheduleAutoScroll(2000);
  }, 8000);
}

// Fonction pour naviguer vers une position
function scrubTo(totalTime) {
  if (scrub) {
    scrub.vars.totalTime = totalTime;
    scrub.invalidate();
    scrub.restart();
  }
}

// Fonction pour mettre à jour la carte active
function updateActiveCard() {
  const cards = document.querySelectorAll('.card-wrapper');
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const cardCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - cardCenterX);
    
    if (distance < 100) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

// Initialisation GSAP
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger);
  
  const cards = document.querySelectorAll('.card-wrapper');
  const totalCards = cards.length;
  
  // Animation principale
  scrub = gsap.timeline({
    scrollTrigger: {
      trigger: '.gallery',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      onUpdate: updateActiveCard
    }
  });
  
  // Animation des cartes
  cards.forEach((card, index) => {
    const nextIndex = (index + 1) % totalCards;
    const nextCard = cards[nextIndex];
    
    scrub.to(card, {
      xPercent: -100,
      duration: 1,
      ease: "power2.inOut"
    })
    .fromTo(nextCard, {
      xPercent: 100
    }, {
      xPercent: 0,
      duration: 1,
      ease: "power2.inOut"
    }, "-=1");
  });
  
  console.log("✅ GSAP initialisé avec", totalCards, "cartes");
}

// Attendre que le DOM soit prêt
window.addEventListener('DOMContentLoaded', () => {
  console.log("✅ DOM prêt, initialisation...");
  
  // Conversion texte → PNG (optionnel, peut être désactivé pour déboguer)
  const convertTextToPNG = false; // Changez en true si vous voulez cette fonctionnalité
  
  if (convertTextToPNG) {
    const cards = document.querySelectorAll('.card-1, .card-2, .card-3, .card-4, .card-5, .card-6, .card-7, .card-8, .card-9, .card-10, .card-11, .card-12, .card-13, .card-14, .card-15');

    cards.forEach(card => {
      const leftSide = card.querySelector('.left-side');
      if (leftSide) {
        const texteOriginal = leftSide.textContent.trim();
        if (texteOriginal) {
          const img = document.createElement('img');
          img.src = textToPNG(texteOriginal, 600, 500, 'bold 36px Arial', 'white', 'center');
          img.style.width = '100%';
          img.style.height = 'auto';
          leftSide.innerHTML = '';
          leftSide.appendChild(img);
        }
      }

      const rightSide = card.querySelector('.right-side');
      if (rightSide) {
        const texteOriginal = rightSide.textContent.trim();
        if (texteOriginal) {
          const img = document.createElement('img');
          img.src = textToPNG(texteOriginal, 600, 500, 'bold 36px Arial', 'white', 'center');
          img.style.width = '100%';
          img.style.height = 'auto';
          rightSide.innerHTML = '';
          rightSide.appendChild(img);
        }
      }
    });
  }
  
  // Initialiser GSAP
  initGSAP();
  
  // Boutons de navigation
  const nextBtn = document.querySelector(".next");
  const prevBtn = document.querySelector(".prev");

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      scrubTo(scrub.vars.totalTime + spacing);
      manualInteraction();
    });
    console.log("✅ Bouton Next connecté");
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      scrubTo(scrub.vars.totalTime - spacing);
      manualInteraction();
    });
    console.log("✅ Bouton Prev connecté");
  }
  
  // Gestion du clavier
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      scrubTo(scrub.vars.totalTime + spacing);
      manualInteraction();
    } else if (e.key === 'ArrowLeft') {
      scrubTo(scrub.vars.totalTime - spacing);
      manualInteraction();
    }
  });
  
  // Démarrage de l'auto-scroll
  scheduleAutoScroll(8000);
  console.log("🚀 Animation démarrée");
});
