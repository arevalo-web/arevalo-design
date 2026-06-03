// BACK TO TOP

const topBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (!topBtn) return;

  if (scrollTop > 800) {
    topBtn.classList.add("show");
  } else {
    topBtn.classList.remove("show");
  }
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// LIGHTBOX / IMAGE & VIDEO GALLERY

let currentIdx = 0;

// Grab both images and videos inside the gallery groups
const allMedia = Array.from(document.querySelectorAll(".gallery-group img, .gallery-group video"));

const modal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const modalVid = document.getElementById("modalVid");
const counter = document.getElementById("modalCounter");

function openModal() {
  if (!modal || allMedia.length === 0) return;
  modal.style.display = "flex";
  updateModal();
}

function closeModal() {
  if (!modal) return;
  modal.style.display = "none";
  if (modalVid) modalVid.pause(); // Stop video audio/playback when closed
}

function changeImage(direction) {
  if (allMedia.length === 0) return;
  currentIdx = (currentIdx + direction + allMedia.length) % allMedia.length;
  updateModal();
}

function updateModal() {
  if (allMedia.length === 0) return;

  const currentMedia = allMedia[currentIdx];

  // Toggle between showing the IMG or the VIDEO tag in the modal
  if (currentMedia.tagName.toLowerCase() === 'video') {
    if (modalImg) modalImg.style.display = "none";
    if (modalVid) {
      modalVid.style.display = "block";
      // Fallback to src if currentSrc isn't loaded yet
      modalVid.src = currentMedia.currentSrc || currentMedia.src; 
      modalVid.play();
    }
  } else {
    if (modalVid) {
      modalVid.style.display = "none";
      modalVid.pause();
    }
    if (modalImg) {
      modalImg.style.display = "block";
      modalImg.src = currentMedia.src;
    }
  }

  if (counter) {
    counter.innerText = `${String(currentIdx + 1).padStart(2, "0")} / ${String(allMedia.length).padStart(2, "0")}`;
  }
}

// Attach click events directly to the parent grid-box of each media item
allMedia.forEach((media, index) => {
  const parentBox = media.closest('.grid-box') || media;
  parentBox.style.cursor = "pointer"; 
  parentBox.addEventListener("click", () => {
    currentIdx = index;
    openModal();
  });
});

window.addEventListener("click", (event) => {
  if (modal && event.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (!modal || modal.style.display !== "flex") return;

  if (event.key === "Escape") {
    closeModal();
  }
  if (event.key === "ArrowRight") {
    changeImage(1);
  }
  if (event.key === "ArrowLeft") {
    changeImage(-1);
  }
});