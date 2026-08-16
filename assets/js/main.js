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

(function () {
  var btn = document.getElementById("scroll-top");
  if (!btn) return;

  window.addEventListener("scroll", function () {
    if (window.scrollY > 400) {
      btn.classList.add("is-visible");
    } else {
      btn.classList.remove("is-visible");
    }
  });

  btn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

(function () {
  var content = document.getElementById("post-content");
  var tocNav = document.getElementById("post-toc-nav");
  var tocAside = document.getElementById("post-toc");
  var contentToggle = document.getElementById("content-toggle");
  var tocOverlay = document.getElementById("post-toc-overlay");
  var tocCloseBtn = document.getElementById("post-toc-close");

  if (!content || !tocNav || !tocAside) {
    if (contentToggle) contentToggle.style.display = "none";
    return;
  }

  var headings = content.querySelectorAll("h2, h3");
  if (headings.length === 0) {
    tocAside.style.display = "none";
    if (contentToggle) contentToggle.style.display = "none";
    var spacer = document.querySelector(".post-spacer");
    if (spacer) spacer.style.display = "none";
    return;
  }

  var links = [];
  headings.forEach(function (heading, index) {
    if (!heading.id) {
      heading.id = "section-" + index;
    }
    var a = document.createElement("a");
    a.href = "#" + heading.id;
    a.textContent = heading.textContent;
    if (heading.tagName === "H3") a.classList.add("toc-h3");
    tocNav.appendChild(a);
    links.push({ link: a, target: heading });
  });

  var manualOverride = null;

  function openToc() {
    tocAside.classList.add("is-open");
    if (tocOverlay) tocOverlay.classList.add("is-open");
    if (contentToggle) contentToggle.setAttribute("aria-expanded", "true");
  }

  function closeToc() {
    tocAside.classList.remove("is-open");
    if (tocOverlay) tocOverlay.classList.remove("is-open");
    if (contentToggle) contentToggle.setAttribute("aria-expanded", "false");
  }

  if (contentToggle) {
    contentToggle.addEventListener("click", function () {
      if (tocAside.classList.contains("is-open")) {
        closeToc();
      } else {
        openToc();
      }
    });
  }

  if (tocOverlay) {
    tocOverlay.addEventListener("click", closeToc);
  }

  if (tocCloseBtn) {
    tocCloseBtn.addEventListener("click", closeToc);
  }

  var overrideClearTimer = null;

  function clearOverrideWhenScrollStops() {
    clearTimeout(overrideClearTimer);
    overrideClearTimer = setTimeout(function () {
      manualOverride = null;
      updateActive();
    }, 150);
  }

  tocNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      e.preventDefault();
      var id = e.target.getAttribute("href").slice(1);
      var el = document.getElementById(id);
      if (el) {
        links.forEach(function (item) {
          item.link.classList.toggle("is-active", item.link === e.target);
        });
        manualOverride = e.target;
        closeToc();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });

  window.addEventListener("scroll", function () {
    if (manualOverride) {
      clearOverrideWhenScrollStops();
    }
  });

  var updateTicking = false;
  var lastActiveIndex = 0;

  function updateActive() {
    if (manualOverride) return;

    var docHeight = document.documentElement.scrollHeight;
    var viewportHeight = window.innerHeight;
    var atBottom = window.scrollY + viewportHeight >= docHeight - 2;

    var candidateIndex = 0;
    for (var i = 0; i < links.length; i++) {
      var rect = links[i].target.getBoundingClientRect();
      if (rect.top <= 150) {
        candidateIndex = i;
      } else {
        break;
      }
    }

    if (atBottom) {
      candidateIndex = links.length - 1;
    }

    lastActiveIndex = candidateIndex;

    links.forEach(function (item, idx) {
      item.link.classList.toggle("is-active", idx === lastActiveIndex);
    });
  }

  function onScroll() {
    if (!updateTicking) {
      updateTicking = true;
      requestAnimationFrame(function () {
        updateActive();
        updateTicking = false;
      });
    }
  }

  window.addEventListener("scroll", onScroll);
  updateActive();
})();

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".video-loop").forEach(function (wrapper) {
    var video = wrapper.querySelector("video");
    if (!video) return;

    function toggle() {
      if (video.paused) {
        video.play();
        wrapper.classList.remove("is-paused");
      } else {
        video.pause();
        wrapper.classList.add("is-paused");
      }
    }

    wrapper.addEventListener("click", toggle);
    wrapper.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.createElement("div");
  overlay.className = "img-lightbox";
  overlay.innerHTML = '<img class="img-lightbox__img">';
  document.body.appendChild(overlay);

  var lightboxImg = overlay.querySelector("img");

  document.querySelectorAll(".post__content .post-img").forEach(function (img) {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", function () {
      lightboxImg.src = img.src;
      overlay.classList.add("is-open");
    });
  });

  overlay.addEventListener("click", function () {
    overlay.classList.remove("is-open");
  });
});


(function () {
  function setVH() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", vh + "px");
  }
  setVH();

  var resizeTimer;
  window.addEventListener("orientationchange", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setVH, 300);
  });
})();
