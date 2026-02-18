/**
 * Workout Logs (Solo Project 3 – CPSC 3750)
 * Production Collection Manager with SQL database and deployment.
 */

// ====== CONFIGURATION ======
let API_BASE = "";

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  API_BASE = "http://localhost:4000";
} else {
  // Set this later for Render:
  // API_BASE = "https://your-backend.onrender.com";
  API_BASE = "";
}

// ====== GLOBAL STATE ======
let currentPage = 1;
let totalRecords = 0;
let editingId = null;

// UI state
let searchText = "";
let sortBy = "workout_date";
let sortOrder = "desc";
let pageSize = 10;

// ====== COOKIE HELPERS ======
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

function setCookie(name, value, days = 30) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; samesite=lax`;
}

const savedPageSize = getCookie("pageSize");
if (savedPageSize) pageSize = parseInt(savedPageSize, 10);

// ====== UI HELPERS ======
function showError(msg) {
  const el = document.getElementById("formError");
  if (!el) return;
  if (!msg) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = msg;
}

function setEditMode(on) {
  const submitBtn = document.getElementById("submitBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  if (submitBtn) submitBtn.textContent = on ? "Update Workout" : "Add Workout";
  if (cancelBtn) cancelBtn.style.display = on ? "inline-block" : "none";
}

function setFormValues(w) {
  document.getElementById("workout_date").value = (w.workout_date || "").slice(0, 10);
  document.getElementById("title").value = w.title ?? "";
  document.getElementById("category").value = w.category ?? "";
  document.getElementById("duration_min").value = w.duration_min ?? "";
  document.getElementById("notes").value = w.notes ?? "";
  document.getElementById("image").value = "";
}

function getFiltersFromUI() {
  searchText = document.getElementById("search").value.trim();
  sortBy = document.getElementById("sort").value;
  sortOrder = document.getElementById("order").value;
  pageSize = Number(document.getElementById("pageSize").value) || 10;
  setCookie("pageSize", pageSize);
}

function updatePagerUI() {
  const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize));
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;
  const prev = document.getElementById("prevPage");
  const next = document.getElementById("nextPage");
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= maxPage;
}

function renderStats(total, avgDuration) {
  const statsEl = document.getElementById("stats");
  if (!statsEl) return;

  const categorySet = new Set();
  document.querySelectorAll("tbody td:nth-child(3)").forEach((td) => {
    if (td.textContent) categorySet.add(td.textContent);
  });

  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-label">Total Workouts</span>
      <span class="stat-value">${total}</span>
    </div>

    <div class="stat-card">
      <span class="stat-label">Page Size</span>
      <span class="stat-value">${pageSize}</span>
    </div>

    <div class="stat-card">
      <span class="stat-label">Categories (this page)</span>
      <span class="stat-value">${categorySet.size}</span>
    </div>

    <div class="stat-card">
      <span class="stat-label">Avg Duration (mins)</span>
      <span class="stat-value">${avgDuration.toFixed(1)}</span>
    </div>
  `;
}

// ====== IMAGE FALLBACK (REQUIRED FIX) ======
function imagePlaceholderDataUri() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
      <rect x="1" y="1" width="22" height="22" rx="4" ry="4" fill="#f3f4f6"/>
      <path d="M7 8h10v2H7V8zm0 4h10v2H7v-2zm0 4h6v2H7v-2z" fill="#9ca3af"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildImageUrl(r) {
  if (!r.image_url) return "";

  const base = r.image_url.startsWith("http") ? r.image_url : `${API_BASE}${r.image_url}`;

  // cache-buster so deleted/replaced files don’t “stick”
  const version =
    (r.updated_at ? String(r.updated_at) : "") ||
    (r.created_at ? String(r.created_at) : "") ||
    String(Date.now());

  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}v=${encodeURIComponent(version)}`;
}

function renderList(rows) {
  const listEl = document.getElementById("list");
  if (!listEl) return;

  if (!rows || rows.length === 0) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:60px 20px; background:white; border-radius:14px; border:1px solid rgba(0,0,0,.1);">
        <p style="color:#6b7280; font-size:18px; margin:16px 0 8px;">No workouts found</p>
        <p style="color:#9ca3af; font-size:14px;">
          ${searchText ? `No matches for "${searchText}"` : "Add your first workout to get started"}
        </p>
      </div>
    `;
    return;
  }

  const body = rows
    .map((r) => {
      const truncatedNotes = r.notes
        ? r.notes.length > 30
          ? r.notes.substring(0, 30) + "..."
          : r.notes
        : "";

      const imgSrc = r.image_url ? buildImageUrl(r) : "";
      const safeTitle = (r.title || "Workout").replaceAll('"', "");

      const imgCell = r.image_url
        ? `
          <img
            class="workout-thumb"
            data-fallback="1"
            src="${imgSrc}"
            alt="${safeTitle}"
            style="height:48px; width:48px; object-fit:cover; border-radius:10px; border:1px solid rgba(0,0,0,.12); cursor:pointer;"
          />
        `
        : `
          <div class="image-placeholder" style="height:48px; width:48px; background:#f3f4f6; border-radius:10px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(0,0,0,.12);">
            <span style="color:#9ca3af; font-size:10px;">No img</span>
          </div>
        `;

      return `
        <tr>
          <td>${(r.workout_date || "").slice(0, 10)}</td>
          <td>${r.title ?? ""}</td>
          <td>${r.category ?? ""}</td>
          <td>${r.duration_min ?? ""}</td>
          <td>${truncatedNotes}</td>
          <td>${imgCell}</td>
          <td>
            <button class="editBtn" data-id="${r.id}">Edit</button>
            <button class="deleteBtn" data-id="${r.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  listEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Category</th>
          <th>Duration</th>
          <th>Notes</th>
          <th>Image</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;

  // 🔥 This is what makes “404 image -> placeholder” work
  const thumbs = listEl.querySelectorAll("img.workout-thumb[data-fallback='1']");
  thumbs.forEach((img) => {
    img.addEventListener("error", () => {
      img.src = imagePlaceholderDataUri();
      img.style.cursor = "default";
      img.onclick = null;
    });

    img.addEventListener("click", () => {
      if (img.src.startsWith("data:image/svg+xml")) return;
      window.open(img.src, "_blank");
    });
  });
}

// ====== API HELPERS ======
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.ok && data.error) throw new Error(data.error);
  return data;
}

async function fetchPage(page) {
  const listEl = document.getElementById("list");
  if (!listEl) return;

  listEl.innerHTML = `
    <div style="text-align:center; padding:60px 20px;">
      <div style="display:inline-block; width:40px; height:40px; border:3px solid #f3f3f3; border-top:3px solid #111827; border-radius:50%; animation:spin 1s linear infinite;"></div>
      <p style="margin-top:16px; color:#6b7280;">Loading workouts...</p>
    </div>
  `;

  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (searchText) params.set("search", searchText);
    if (sortBy) params.set("sort", sortBy);
    if (sortOrder) params.set("order", sortOrder);

    const data = await apiFetch(`${API_BASE}/api/workouts?${params.toString()}`);

    totalRecords = data.total;
    currentPage = data.page;

    renderList(data.results);

    const avg =
      data.results.length === 0
        ? 0
        : data.results.reduce((sum, r) => sum + Number(r.duration_min || 0), 0) /
          data.results.length;

    renderStats(totalRecords, avg);
    updatePagerUI();

    if (data.results.length === 0 && searchText) showError(`No workouts found matching "${searchText}"`);
    else showError("");
  } catch (err) {
    listEl.innerHTML = `
      <div style="text-align:center; padding:60px 20px; background:white; border-radius:14px; border:1px solid rgba(239,68,68,0.2);">
        <p style="color:#ef4444; margin:16px 0 8px;">⚠️ Failed to load workouts</p>
        <p style="color:#6b7280; font-size:14px; margin-bottom:16px;">${err.message}</p>
        <button onclick="location.reload()" style="background:#111827; color:white; padding:8px 16px; border:none; border-radius:8px; cursor:pointer;">Retry</button>
      </div>
    `;
  }
}

async function uploadImage(workoutId, file) {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(`${API_BASE}/api/workouts/${workoutId}/image`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.workout;
}

// ====== INIT + EVENTS ======
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
  document.head.appendChild(style);

  const form = document.getElementById("workoutForm");
  if (!form) {
    console.error("Missing #workoutForm in HTML (IDs must match app.js).");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");

    const payload = {
      workout_date: document.getElementById("workout_date").value,
      title: document.getElementById("title").value.trim(),
      category: document.getElementById("category").value.trim(),
      duration_min: Number(document.getElementById("duration_min").value),
      notes: document.getElementById("notes").value.trim(),
    };

    if (!payload.workout_date || !payload.title || !payload.category || !payload.duration_min) {
      showError("Please fill out Date, Title, Category, and Duration.");
      return;
    }
    if (payload.duration_min < 1 || payload.duration_min > 600) {
      showError("Duration must be between 1 and 600 minutes.");
      return;
    }

    const file = document.getElementById("image").files?.[0] || null;
    if (file && !file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }

    try {
      if (editingId == null) {
        const created = await apiFetch(`${API_BASE}/api/workouts`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const newId = created.workout?.id;
        if (file && newId) await uploadImage(newId, file);
      } else {
        await apiFetch(`${API_BASE}/api/workouts/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        if (file) await uploadImage(editingId, file);

        editingId = null;
        setEditMode(false);
      }

      form.reset();
      await fetchPage(currentPage);
    } catch (err) {
      showError(err.message || "Network/API error. Please try again.");
    }
  });

  document.getElementById("list").addEventListener("click", async (e) => {
    const delBtn = e.target.closest(".deleteBtn");
    if (delBtn) {
      const id = Number(delBtn.dataset.id);
      if (!confirm("Are you sure you want to delete this workout? This action cannot be undone.")) return;

      try {
        await apiFetch(`${API_BASE}/api/workouts/${id}`, { method: "DELETE" });
        const maxPageAfter = Math.max(1, Math.ceil((totalRecords - 1) / pageSize));
        if (currentPage > maxPageAfter) currentPage = maxPageAfter;
        await fetchPage(currentPage);
      } catch (err) {
        alert(err.message || "Delete failed. Please try again.");
      }
      return;
    }

    const editBtn = e.target.closest(".editBtn");
    if (editBtn) {
      const id = Number(editBtn.dataset.id);

      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("pageSize", String(pageSize));
        if (searchText) params.set("search", searchText);
        if (sortBy) params.set("sort", sortBy);
        if (sortOrder) params.set("order", sortOrder);

        const data = await apiFetch(`${API_BASE}/api/workouts?${params.toString()}`);
        const w = data.results.find((r) => r.id === id);
        if (!w) return alert("Workout not found in current view.");

        editingId = id;
        setFormValues(w);
        setEditMode(true);
        document.querySelector("h2")?.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        alert(err.message || "Could not load workout for editing.");
      }
    }
  });

  document.getElementById("cancelBtn").addEventListener("click", () => {
    editingId = null;
    setEditMode(false);
    form.reset();
    showError("");
  });

  document.getElementById("prevPage").addEventListener("click", async () => {
    if (currentPage > 1) {
      currentPage--;
      await fetchPage(currentPage);
    }
  });

  document.getElementById("nextPage").addEventListener("click", async () => {
    const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (currentPage < maxPage) {
      currentPage++;
      await fetchPage(currentPage);
    }
  });

  document.getElementById("applyFilters").addEventListener("click", async () => {
    getFiltersFromUI();
    currentPage = 1;
    await fetchPage(currentPage);
  });

  document.getElementById("pageSize").addEventListener("change", async (e) => {
    pageSize = Number(e.target.value);
    setCookie("pageSize", pageSize);
    currentPage = 1;
    await fetchPage(currentPage);
  });

  document.getElementById("search").addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      getFiltersFromUI();
      currentPage = 1;
      await fetchPage(currentPage);
    }
  });

  // init selects
  document.getElementById("sort").value = sortBy;
  document.getElementById("order").value = sortOrder;
  document.getElementById("pageSize").value = String(pageSize);

  console.log("App initialized in development mode");
  console.log("API Base:", API_BASE || "same origin");

  fetchPage(currentPage);
});
