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

// LIGHTBOX / IMAGE GALLERY

let currentIdx = 0;

const allImages = Array.from(document.querySelectorAll(".gallery-group img"));
const clickableItems = document.querySelectorAll(".texture, .grid-box");

const modal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const counter = document.getElementById("modalCounter");

function openModal() {
  if (!modal || !modalImg || allImages.length === 0) return;

  modal.style.display = "flex";
  updateModal();
}

function closeModal() {
  if (!modal) return;

  modal.style.display = "none";
}

function changeImage(direction) {
  if (allImages.length === 0) return;

  currentIdx = (currentIdx + direction + allImages.length) % allImages.length;
  updateModal();
}

function updateModal() {
  if (!modalImg || allImages.length === 0) return;

  modalImg.src = allImages[currentIdx].src;

  if (counter) {
    counter.innerText = `${String(currentIdx + 1).padStart(2, "0")} / ${String(allImages.length).padStart(2, "0")}`;
  }
}

clickableItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (index >= allImages.length) return;

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