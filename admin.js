/* =====================================================
   FoodLoop - Admin page (admin.js)
   Everything is in this file: admin login + dashboard.
   No JSON, no storage.js.

   user    = [id, name, email, password, role, status]
   food    = [id, name, type, price, location, qty, emoji, collectBy, providerId, category]
   request = [id, foodId, customerId, qty, status, date]
   ===================================================== */

/* ---------- helper functions ---------- */
function getList(key) {
  const text = localStorage.getItem(key);
  if (!text) return [];
  return text.split("\n").map(function (line) { return line.split("|"); });
}

function saveList(key, rows) {
  localStorage.setItem(key, rows.map(function (row) { return row.join("|"); }).join("\n"));
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* ---------- make the admin account (first time only) ---------- */
// Email: admin@foodloop.com    Password: admin123
(function () {
  const list = getList("users");
  for (let i = 0; i < list.length; i++) {
    if (list[i][4] === "admin") return;
  }
  list.push(["1", "Admin", "admin@foodloop.com", "admin123", "admin", "active"]);
  saveList("users", list);
})();

/* ---------- show login box or dashboard ---------- */
function checkLogin() {
  const isAdmin = localStorage.getItem("userRole") === "admin" && localStorage.getItem("userId");

  document.getElementById("loginBox").style.display = isAdmin ? "none" : "";
  document.getElementById("dashboard").style.display = isAdmin ? "" : "none";
  document.getElementById("logoutBox").style.display = isAdmin ? "" : "none";

  if (isAdmin) showAll();
}

/* ---------- admin login ---------- */
document.getElementById("loginBtn").addEventListener("click", function () {
  const email = document.getElementById("adminEmail").value.trim().toLowerCase();
  const password = document.getElementById("adminPass").value;
  const msg = document.getElementById("loginMsg");

  const users = getList("users");
  let found = null;

  for (let i = 0; i < users.length; i++) {
    if (users[i][2] === email && users[i][3] === password && users[i][4] === "admin") {
      found = users[i];
    }
  }

  if (!found) {
    msg.textContent = "Wrong email or password (or this is not an admin account).";
    return;
  }

  msg.textContent = "";
  localStorage.setItem("userId", found[0]);
  localStorage.setItem("userName", found[1]);
  localStorage.setItem("userRole", "admin");
  checkLogin();
});

// press Enter in the password box
document.getElementById("adminPass").addEventListener("keydown", function (e) {
  if (e.key === "Enter") document.getElementById("loginBtn").click();
});

/* ---------- logout ---------- */
document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  document.getElementById("adminPass").value = "";
  checkLogin();
});

/* ---------- find a user's name by id ---------- */
function userNameById(users, id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i][0] === id) return users[i][1];
  }
  return "(deleted user)";
}

/* ---------- show everything ---------- */
function showAll() {
  const users = getList("users");
  const foods = getList("foods").filter(function (f) { return f.length >= 10; });
  const requests = getList("requests").filter(function (r) { return r.length >= 6; });

  const foodById = {};
  for (let i = 0; i < foods.length; i++) foodById[foods[i][0]] = foods[i];

  /* ----- stats ----- */
  let providers = 0, customers = 0, donations = 0, sales = 0;

  for (let i = 0; i < users.length; i++) {
    if (users[i][4] === "provider") providers++;
    if (users[i][4] === "customer") customers++;
  }
  for (let i = 0; i < requests.length; i++) {
    const food = foodById[requests[i][1]];
    if (requests[i][4] === "completed" && food) {
      if (food[2] === "free") donations++;
      else sales++;
    }
  }

  document.getElementById("userCount").textContent = providers + customers;
  document.getElementById("providerCount").textContent = providers;
  document.getElementById("customerCount").textContent = customers;
  document.getElementById("listingCount").textContent = foods.length;
  document.getElementById("donationCount").textContent = donations;
  document.getElementById("salesCount").textContent = sales;

  /* ----- users table (admin is hidden) ----- */
  let userRows = "";
  for (let i = users.length - 1; i >= 0; i--) {
    const u = users[i];
    if (u.length < 5 || u[4] === "admin") continue;

    const blocked = u[5] === "blocked";
    userRows +=
      "<tr>" +
      "<td>" + esc(u[1]) + "</td>" +
      "<td>" + esc(u[2]) + "</td>" +
      "<td>" + esc(u[4]) + "</td>" +
      "<td><span class='status " + (blocked ? "blocked'>blocked" : "active'>active") + "</span></td>" +
      "<td><button class='mini " + (blocked ? "" : "red") + "' onclick=\"toggleBlock('" + u[0] + "')\">" +
      (blocked ? "Unblock" : "Block") + "</button></td>" +
      "</tr>";
  }
  if (userRows === "") {
    userRows = "<tr><td colspan='5' class='empty'>No users yet.</td></tr>";
  }
  document.getElementById("userList").innerHTML = userRows;

  /* ----- food listings table ----- */
  let foodRows = "";
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const isSale = f[2] === "sale";
    const provider = f[8] === "seed" ? "Sample food" : userNameById(users, f[8]);

    foodRows +=
      "<tr>" +
      "<td>" + f[6] + " " + esc(f[1]) + "</td>" +
      "<td>" + esc(provider) + "</td>" +
      "<td><span class='tag " + (isSale ? "tag-sale'>FOR SALE" : "tag-free'>FREE") + "</span></td>" +
      "<td>" + (isSale ? "৳" + esc(f[3]) : "Free") + "</td>" +
      "<td>" + esc(f[5]) + "</td>" +
      "<td>" + esc(f[7]) + "</td>" +
      "<td><button class='mini red' onclick=\"removeFood('" + f[0] + "')\">Remove</button></td>" +
      "</tr>";
  }
  if (foodRows === "") {
    foodRows = "<tr><td colspan='7' class='empty'>No food listings.</td></tr>";
  }
  document.getElementById("foodList").innerHTML = foodRows;

  /* ----- requests table ----- */
  let requestRows = "";
  for (let i = requests.length - 1; i >= 0; i--) {
    const r = requests[i];
    const food = foodById[r[1]];

    let foodCell = "(removed food)", providerCell = "-", total = "-";
    if (food) {
      foodCell = food[6] + " " + esc(food[1]);
      providerCell = esc(food[8] === "seed" ? "Sample food" : userNameById(users, food[8]));
      total = food[2] === "sale" ? "৳" + Number(food[3]) * Number(r[3]) : "Free";
    }

    const date = new Date(r[5]).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    requestRows +=
      "<tr>" +
      "<td>" + foodCell + "</td>" +
      "<td>" + esc(userNameById(users, r[2])) + "</td>" +
      "<td>" + providerCell + "</td>" +
      "<td>" + esc(r[3]) + "</td>" +
      "<td>" + total + "</td>" +
      "<td>" + date + "</td>" +
      "<td><span class='status " + esc(r[4]) + "'>" + esc(r[4]) + "</span></td>" +
      "</tr>";
  }
  if (requestRows === "") {
    requestRows = "<tr><td colspan='7' class='empty'>No requests yet.</td></tr>";
  }
  document.getElementById("requestList").innerHTML = requestRows;
}

/* ---------- block / unblock a user ---------- */
function toggleBlock(id) {
  const users = getList("users");

  for (let i = 0; i < users.length; i++) {
    if (users[i][0] === id) {
      while (users[i].length < 6) users[i].push("active");
      users[i][5] = users[i][5] === "blocked" ? "active" : "blocked";
      document.getElementById("notice").textContent =
        "✅ " + users[i][1] + " is now " + users[i][5] + ".";
    }
  }

  saveList("users", users);
  showAll();
}

/* ---------- remove a food listing ---------- */
function removeFood(id) {
  if (!confirm("Remove this food listing?")) return;

  const foods = getList("foods");
  const remaining = [];
  for (let i = 0; i < foods.length; i++) {
    if (foods[i][0] !== id) remaining.push(foods[i]);
  }

  saveList("foods", remaining);
  document.getElementById("notice").textContent = "✅ Listing removed.";
  showAll();
}

/* ---------- start ---------- */
checkLogin();
