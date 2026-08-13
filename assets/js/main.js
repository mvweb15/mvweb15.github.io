document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("menu-toggle");
  var close = document.getElementById("menu-close");
  var nav = document.getElementById("site-nav");
  var overlay = document.getElementById("site-nav-overlay");
  var themeToggle = document.getElementById("theme-toggle");
  var root = document.documentElement;

  function openNav() {
    nav.classList.add("is-open");
    overlay.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    nav.setAttribute("aria-hidden", "false");
  }

  function closeNav() {
    nav.classList.remove("is-open");
    overlay.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    nav.setAttribute("aria-hidden", "true");
  }

  toggle.addEventListener("click", openNav);
  close.addEventListener("click", closeNav);
  overlay.addEventListener("click", closeNav);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });

  themeToggle.addEventListener("click", function () {
    var isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
  });
});

function applyStoredTheme() {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch (e) {}
}

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    applyStoredTheme();
  }
});
