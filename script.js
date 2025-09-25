// script.js

const BASE_URL = "https://json-1aoj.onrender.com";

// Local storage keys
const PENDING_KEY = "pending";
const ACCEPTED_KEY = "accepted";
const REJECTED_KEY = "rejected";

// UI elements
const dataBody = document.getElementById("dataBody");
const btnPending = document.getElementById("btnPending");
const btnAccepted = document.getElementById("btnAccepted");
const btnRejected = document.getElementById("btnRejected");

// App state
let currentPage = "pending";
let allUserData = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadPage("pending");
});

// Switch page handler
btnPending.addEventListener("click", () => loadPage("pending"));
btnAccepted.addEventListener("click", () => loadPage("accepted"));
btnRejected.addEventListener("click", () => loadPage("rejected"));

// Load page data
async function loadPage(page) {
  currentPage = page;
  dataBody.innerHTML = "";

  try {
    const res = await fetch(`${BASE_URL}/${page}`);
    const data = await res.json();

    if (page === "pending") {
      allUserData = data;
      savePendingToLocal();
    }

    displayData(data);
  } catch (err) {
    console.error("Error loading data:", err);
    dataBody.innerHTML = `<tr><td colspan="5">Failed to load ${page} data</td></tr>`;
  }
}

// Save pending to local
function savePendingToLocal() {
  localStorage.setItem(PENDING_KEY, JSON.stringify(allUserData));
}

// Display data in table
function displayData(data = allUserData) {
  dataBody.innerHTML = "";
  if (data.length === 0) {
    dataBody.innerHTML = `<tr><td colspan="5">No data available</td></tr>`;
    return;
  }

  data.forEach((user, index) => {
    let actions = "";
    if (currentPage === "pending") {
      actions = `
        <button class="btn-accept" data-index="${index}">Accept</button>
        <button class="btn-reject" data-index="${index}">Reject</button>
      `;
    }

    const row = `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.status || "-"}</td>
        <td>${actions}</td>
      </tr>
    `;
    dataBody.insertAdjacentHTML("beforeend", row);
  });
}

// Handle Accept/Reject clicks
dataBody.addEventListener("click", async (e) => {
  const target = e.target;
  if (!target.dataset.index) return;

  const index = parseInt(target.dataset.index);
  const user = allUserData[index];

  if (!user) return;

  // Accept
  if (target.classList.contains("btn-accept")) {
    user.status = "Accepted";
    const id = await getNextId("accepted");
    const acceptedUser = { ...user, id };
    await saveToApi("accepted", acceptedUser);

    // Remove from pending
    allUserData.splice(index, 1);
    savePendingToLocal();
    await deleteFromApi("pending", user.id);

    alert(`${user.name} has been accepted!`);

    // Redirect to Accepted page
    loadPage("accepted");
  }

  // Reject
  else if (target.classList.contains("btn-reject")) {
    user.status = "Rejected";
    const id = await getNextId("rejected");
    const rejectedUser = { ...user, id };
    await saveToApi("rejected", rejectedUser);

    // Remove from pending
    allUserData.splice(index, 1);
    savePendingToLocal();
    await deleteFromApi("pending", user.id);

    alert(`${user.name} has been rejected!`);

    // Redirect to Rejected page
    loadPage("rejected");
  }
});

// Save to API
async function saveToApi(collection, user) {
  try {
    await fetch(`${BASE_URL}/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch (err) {
    console.error(`Error saving to ${collection} API:`, err);
  }
}

// Delete from API
async function deleteFromApi(collection, id) {
  try {
    await fetch(`${BASE_URL}/${collection}/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error(`Error deleting from ${collection}:`, err);
  }
}

// Get next ID for new entry
async function getNextId(collection) {
  try {
    const res = await fetch(`${BASE_URL}/${collection}`);
    const data = await res.json();
    return data.length > 0 ? Math.max(...data.map((u) => u.id)) + 1 : 1;
  } catch (err) {
    console.error("Error getting next ID:", err);
    return Date.now();
  }
}
