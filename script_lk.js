// Загружаем данные пользователя
fetch("/check_user_info", { credentials: "include" })
  .then(res => res.json())
  .then(data => {
    if (!data.username) {
      window.location.href = "/login.html";
      return;
    }

    document.getElementById("lk_username").textContent = data.username;
    document.getElementById("lk_role").textContent = data.role;
    document.getElementById("lk_phone").textContent = data.phone;

    if (data.role === "admin") document.getElementById("lk_avatar").src = "https://avatars.mds.yandex.net/i?id=10a35c04830c25eb71e1dfdc207f3574_l-3613310-images-thumbs&n=13";
  });

function showConfirmModal(message, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "confirm_modal_overlay";
  modal.innerHTML = `
    <div class="confirm_modal">
      <p class="confirm_modal_text">${message}</p>
      <div class="confirm_modal_actions">
        <button class="confirm_modal_cancel">Отмена</button>
        <button class="confirm_modal_confirm">Да</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cancelBtn = modal.querySelector(".confirm_modal_cancel");
  const confirmBtn = modal.querySelector(".confirm_modal_confirm");

  function cleanup() {
    modal.remove();
  }

  cancelBtn.addEventListener("click", cleanup);

  confirmBtn.addEventListener("click", () => {
    onConfirm();
    cleanup();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) cleanup();
  });
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  showConfirmModal("Выйти из аккаунта?", () => {
    fetch("/logout", {
      method: "POST",
      credentials: "include"
    })
      .then(() => {
        window.location.href = "/main.html";
      });
  });
});

const returnBtn = document.getElementById("return");

returnBtn.addEventListener("click", () => {
  window.location.href = "/main.html";
});

let editMode = false;

document.getElementById("editProfileBtn").addEventListener("click", () => {
  const usernameEl = document.getElementById("lk_username");
  const phoneEl = document.getElementById("lk_phone");
  const btn = document.getElementById("editProfileBtn");

  if (!editMode) {
    const usernameInput = document.createElement("input");
    usernameInput.id = "edit_username";
    usernameInput.value = usernameEl.textContent;
    usernameInput.className = "edit_input";

    const phoneInput = document.createElement("input");
    phoneInput.id = "edit_phone";
    phoneInput.value = phoneEl.textContent;
    phoneInput.className = "edit_input";

    usernameEl.replaceWith(usernameInput);
    phoneEl.replaceWith(phoneInput);

    btn.textContent = "Сохранить";
    editMode = true;
  } else {
    clearEditError();
    const newUsername = document.getElementById("edit_username").value.trim();
    const newPhone = document.getElementById("edit_phone").value.trim();

    fetch("/update_user_full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        login: newUsername,
        phone: newPhone
      })
    })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        showEditError(data.error);
        return;
      }

      const usernameB = document.createElement("b");
      usernameB.id = "lk_username";
      usernameB.textContent = newUsername;

      const phoneB = document.createElement("b");
      phoneB.id = "lk_phone";
      phoneB.textContent = newPhone;

      document.getElementById("edit_username").replaceWith(usernameB);
      document.getElementById("edit_phone").replaceWith(phoneB);

      btn.textContent = "Редактировать профиль";
      editMode = false;
      clearEditError();
    });
  }
});
