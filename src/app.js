import {
  loginForm,
  loginError,
  loginPage,
  profilePage,
  logoutButton,
  userXpSpan,
  userXpRawSpan,
  xpSvg,
  xpByProjectSvg,
  tabsNav,
} from "./dom.js";
import { fetchProfile, fetchXPTransactions, signin } from "./api.js";
import { buildXPPoints, formatXP } from "./data.js";
import { renderProfile, renderMilestones, drawXPGraph, drawXPByProjectGraph } from "./render.js";

function showPage(page) {
  if (page === "profile") {
    loginPage.style.display = "none";
    profilePage.style.display = "block";
  } else {
    loginPage.style.display = "block";
    profilePage.style.display = "none";
  }
}

function setLoginError(msg) {
  if (loginError) loginError.textContent = msg || "";
}

function logout(options = {}) {
  const { keepError = false } = options;
  localStorage.removeItem("jwt");
  if (!keepError) setLoginError("");
  showPage("login");

  if (xpSvg) xpSvg.innerHTML = "";
  if (xpByProjectSvg) xpByProjectSvg.innerHTML = "";
}

function showPanel(panelId) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));

  document.querySelectorAll(".tab").forEach((b) => {
    const active = b.dataset.panel === panelId;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add("is-active");
}

async function initProfilePage() {
  const user = await fetchProfile();
  renderProfile(user);

  const tx = await fetchXPTransactions();
  const { points, total } = buildXPPoints(tx);

  if (userXpSpan) userXpSpan.textContent = formatXP(total);
  if (userXpRawSpan) userXpRawSpan.textContent = `(${total.toLocaleString()})`;

  renderMilestones(points);
  drawXPGraph(points);
  drawXPByProjectGraph(points);

  showPanel("panel-profile");
}

async function checkLoginStatus() {
  const jwt = localStorage.getItem("jwt");
  if (!jwt) {
    showPage("login");
    return;
  }

  showPage("profile");
  try {
    await initProfilePage();
  } catch (err) {
    logout();
  }
}

export function initApp() {
  if (tabsNav) {
    tabsNav.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      showPanel(btn.dataset.panel);
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const identifier = loginForm.identifier.value;
      const password = loginForm.password.value;

      try {
        setLoginError("");

        const jwt = await signin(identifier, password);
        localStorage.setItem("jwt", jwt);

        showPage("profile");
        await initProfilePage();
      } catch (err) {
      setLoginError(err.message || "Login failed.");
      logout({ keepError: true });
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  checkLoginStatus();

  window.testMyXP = async function testMyXP() {
    const tx = await fetchXPTransactions();
    const { total } = buildXPPoints(tx);
    console.log("✅ Calculated Total XP:", total);
    return total;
  };
}
