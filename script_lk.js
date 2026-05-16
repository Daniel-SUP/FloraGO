// Загружаем данные пользователя
fetch("/check_user_info", { credentials: "include" })
  .then(res => res.json())
  .then(data => {
    if (!data.username) {
      // Гость → отправляем на вход
      window.location.href = "/login.html";
      return;
    }

    // Заполняем данные
    document.getElementById("lk_username").textContent = data.username;
    document.getElementById("lk_role").textContent = data.role;
    document.getElementById("lk_phone").textContent = data.phone;

    // Если хочешь — можно менять аватар по роли
    if (data.role === "admin") document.getElementById("lk_avatar").src = "https://avatars.mds.yandex.net/i?id=10a35c04830c25eb71e1dfdc207f3574_l-3613310-images-thumbs&n=13";
  });


// Кнопка "Выйти"
document.getElementById("logoutBtn").addEventListener("click", () => {
  const ok = confirm("Выйти из аккаунта?");
  if (!ok) return;

  fetch("/logout", {
    method: "POST",
    credentials: "include"
  })
    .then(() => {
      window.location.href = "/main.html";
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
    // Включаем редактирование
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
    // Сохраняем изменения
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
        alert(data.error);
        return;
      }

      // Возвращаем <b>
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
    });
  }
});
