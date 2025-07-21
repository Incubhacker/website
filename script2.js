// === Vars ===
const elementsToObserve = document.querySelectorAll('section[id]'),
      visibleClass = 'visible',
      nav = document.querySelector('nav'),
      navPath = nav.querySelector('svg path'),
      toggleButton = document.getElementById('toggle-nav'),
      navListItems = [...nav.querySelectorAll('li')],
      navItems = navListItems.map(listItem => {
          const anchor = listItem.querySelector('a'),
                targetID = anchor && anchor.getAttribute('href').slice(1),
                target = document.getElementById(targetID);
          return { listItem, anchor, target };
      }).filter(item => item.target);

// Ajouter un écouteur d'événements sur chaque lien
navItems.forEach(item => {
  item.anchor.addEventListener('click', () => {
    nav.style.opacity = '0'; // Appliquer l'effet de fondu

    // Délai pour donner le temps à l'animation de se jouer
    setTimeout(() => {
      nav.classList.remove('active'); // Fermer le menu
    }, 300); // Temps doit correspondre à la durée d'animation (0.3s)
  });
});

// === Functions ===
function drawPath() {
  let path = [], pathIndent;

  navItems.forEach((item, i) => {
    const x = item.anchor.offsetLeft - 5,
          y = item.anchor.offsetTop,
          height = item.anchor.offsetHeight;

    if (i === 0) {
      path.push('M', x, y, 'L', x, y + height);
      item.pathStart = 0;
    } else {
      if (pathIndent !== x)
        path.push('L', pathIndent, y);
      path.push('L', x, y);
      navPath.setAttribute('d', path.join(' '));
      item.pathStart = navPath.getTotalLength() || 0;
      path.push('L', x, y + height);  
    }
    
    pathIndent = x;
    navPath.setAttribute('d', path.join(' '));
    item.pathEnd = navPath.getTotalLength();
  });
}

function syncPath() {
  const someElsAreVisible = () => nav.querySelectorAll(`.${visibleClass}`).length > 0,
        thisElIsVisible = el => el.classList.contains(visibleClass),
        pathLength = navPath.getTotalLength();

  let pathStart = pathLength,
      pathEnd = 0,
      lastPathStart,
      lastPathEnd;
  
  navItems.forEach(item => {
    if (thisElIsVisible(item.listItem)) {
      pathStart = Math.min(item.pathStart, pathStart);
      pathEnd = Math.max(item.pathEnd, pathEnd);
    }
  });

  if (someElsAreVisible() && pathStart < pathEnd) {
    if (pathStart !== lastPathStart || pathEnd !== lastPathEnd) {
      const dashArray = `1 ${pathStart} ${pathEnd - pathStart} ${pathLength}`;
      navPath.style.setProperty('stroke-dashoffset', '1');
      navPath.style.setProperty('stroke-dasharray', dashArray);
      navPath.style.setProperty('opacity', 1);
    }
  } else { 
    navPath.style.setProperty('opacity', 0);
  }
  
  lastPathStart = pathStart;
  lastPathEnd = pathEnd;
}

function markVisibleSection(observedEls) {
  observedEls.forEach(observedEl => {
    const id = observedEl.target.getAttribute('id'),
          anchor = document.querySelector(`nav li a[href="#${id}"]`);

    if (!anchor) return false;

    const listItem = anchor.parentElement;

    if (observedEl.isIntersecting) {
      listItem.classList.add(visibleClass);
    } else {
      listItem.classList.remove(visibleClass);
    }
    syncPath();
  }); 
}

// Fonction pour afficher ou masquer la navigation
toggleButton.addEventListener('click', () => {
  nav.classList.toggle('active'); // Basculer la classe active

  // Vérifier l'état de la navigation pour ajuster l'opacité
  if (nav.classList.contains('active')) {
    nav.style.opacity = '1';
  } else {
    nav.style.opacity = '0'; // Appliquer un effet de fondu
  }
});

// Fonction pour gérer les redimensionnements de la fenêtre
function handleResize() {
  if (window.innerWidth > 700) {
    nav.classList.remove('active'); // Retirer la classe active si la largeur est supérieure à 700
    nav.style.opacity = '1'; // S'assurer qu'elle est visible
  }
}

// === Draw path and observe ===
drawPath();
const observer = new IntersectionObserver(markVisibleSection);
elementsToObserve.forEach(thisEl => observer.observe(thisEl));

// Écouter les événements de redimensionnement
window.addEventListener('resize', handleResize);
