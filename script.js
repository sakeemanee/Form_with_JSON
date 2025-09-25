// ========== Configuration ==========

const BASE_URL = 'https://json-1aoj.onrender.com';  // Your rendered JSON server URL
const PENDING_KEY = 'userDetails';
const ACCEPTED_KEY = 'accepted-form';
const REJECTED_KEY = 'rejected-form';

let allUserData = JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
const signupForm = document.getElementById('signupForm');
const dataBody = document.getElementById('dataBody');
const totalForm = document.getElementById('totalForm');

let editIndex = null;

// ========== Local Storage Helpers ==========

function savePendingToLocal() {
  localStorage.setItem(PENDING_KEY, JSON.stringify(allUserData));
  updateTotal();
}

function updateTotal() {
  totalForm.textContent = 'Total Admission Forms: ' + allUserData.length;
}

function addDataToLocal(key, value) {
  const list = JSON.parse(localStorage.getItem(key)) || [];
  list.push(JSON.parse(JSON.stringify(value)));
  localStorage.setItem(key, JSON.stringify(list));
}

// ========== API Helpers ==========

async function getNextId(endpoint) {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`);
    const data = await res.json();
    if (!Array.isArray(data)) return 1;
    const ids = data
      .map(item => item.id)
      .filter(id => typeof id === 'number');
    return ids.length ? Math.max(...ids) + 1 : 1;
  } catch (err) {
    console.error('Error in getNextId:', err);
    return 1;
  }
}

async function saveToApi(endpoint, user) {
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      console.error('Failed to POST to API', await res.text());
    }
  } catch (err) {
    console.error('Error in saveToApi:', err);
  }
}

// ========== Fetch initial from API ==========

async function fetchPendingFromServer() {
  try {
    const res = await fetch(`${BASE_URL}/pending`);
    if (!res.ok) {
      console.error('Fetch pending failed:', res.status, await res.text());
      displayData();
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      allUserData = data;
      savePendingToLocal();
    }
  } catch (err) {
    console.error('Error fetching pending from server:', err);
  } finally {
    displayData();
  }
}

// ========== Display / UI ==========

function displayData() {
  dataBody.innerHTML = '';
  allUserData.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name || ''}</td>
      <td>${item.email || ''}</td>
      <td>${item.mobile || ''}</td>
      <td>${item.course || ''}</td>
      <td>${item.status || ''}</td>
      <td>
        <button type="button" class="btn-accept" data-index="${index}">Accept</button>
        <button type="button" class="btn-reject" data-index="${index}">Reject</button>
        <button type="button" class="btn-edit" data-index="${index}">Edit</button>
        <button type="button" class="btn-delete" data-index="${index}">Delete</button>
      </td>
    `;
    dataBody.appendChild(tr);
  });
  updateTotal();
}

// ========== Event Handlers on Table Buttons ==========

dataBody.addEventListener('click', async function(e) {
  const target = e.target;
  const idx = target.dataset.index;
  if (idx == null) return;
  const index = Number(idx);
  const user = allUserData[index];
  if (!user) return;

  // Edit
  if (target.classList.contains('btn-edit')) {
    editIndex = index;
    document.getElementById('name').value = user.name;
    document.getElementById('email').value = user.email;
    document.getElementById('mobile').value = user.mobile;
    document.getElementById('course').value = user.course;
    signupForm.scrollIntoView({ behavior: 'smooth' });
  }

  // Accept
  else if (target.classList.contains('btn-accept')) {
    user.status = 'Accepted';
    const id = await getNextId('accepted');
    const acceptedUser = { ...user, id };
    addDataToLocal(ACCEPTED_KEY, acceptedUser);

    // remove locally
    allUserData.splice(index, 1);
    savePendingToLocal();
    displayData();

    alert(`${user.name} has been accepted!`);

    // save to accepted API
    await saveToApi('accepted', acceptedUser);

    // delete from pending API
    try {
      await fetch(`${BASE_URL}/pending/${user.id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete from pending API', err);
    }
  }

  // Reject
  else if (target.classList.contains('btn-reject')) {
    user.status = 'Rejected';
    const id = await getNextId('rejected');
    const rejectedUser = { ...user, id };
    addDataToLocal(REJECTED_KEY, rejectedUser);

    // remove locally
    allUserData.splice(index, 1);
    savePendingToLocal();
    displayData();

    alert(`${user.name} has been rejected!`);

    // save to rejected API
    await saveToApi('rejected', rejectedUser);

    // delete from pending API
    try {
      await fetch(`${BASE_URL}/pending/${user.id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete from pending API', err);
    }
  }

  // Delete (just from pending)
  else if (target.classList.contains('btn-delete')) {
    if (!confirm('Delete this pending entry?')) {
      return;
    }
    allUserData.splice(index, 1);
    savePendingToLocal();
    displayData();
    alert(`${user?.name || 'Entry'} deleted successfully!`);
    try {
      await fetch(`${BASE_URL}/pending/${user.id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete from API', err);
    }
  }
});

// ========== Form Submission ==========

signupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const mobile = document.getElementById('mobile').value.trim();
  const course = document.getElementById('course').value;

  if (!name || !email || !mobile || !course) {
    alert('Please fill all fields.');
    return;
  }

  if (editIndex !== null) {
    // Editing existing pending
    const old = allUserData[editIndex];
    const updated = {
      ...old,
      name,
      email,
      mobile,
      course
    };
    allUserData[editIndex] = updated;
    savePendingToLocal();
    displayData();
    alert('Form updated successfully!');

    // PATCH to API
    try {
      const res = await fetch(`${BASE_URL}/pending/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) {
        console.error('PATCH failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Error in PATCH:', err);
    }

    editIndex = null;
  } else {
    // New entry
    const id = await getNextId('pending');
    const user = {
      id,
      name,
      email,
      mobile,
      course,
      status: 'Pending'
    };
    allUserData.push(user);
    savePendingToLocal();
    displayData();
    alert('Form submitted successfully!');
    await saveToApi('pending', user);
  }

  // Reset form
  e.target.reset();
});

// ========== Initialization ==========

window.addEventListener('load', () => {
  fetchPendingFromServer();
});
