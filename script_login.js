function openReg() {
  document.getElementById("login_form").style.display = "none";
  document.getElementById("reg_form").style.display = "block";
}

function openLogin() {
  document.getElementById("login_form").style.display = "block";
  document.getElementById("reg_form").style.display = "none";
}


document.addEventListener("DOMContentLoaded", () => {
  const change = document.getElementById("theme_change");

  // Проверяем сохранённую тему
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark_theme");
  }

  change.addEventListener("click", () => {
    document.body.classList.toggle("dark_theme");

    // Сохраняем выбор пользователя
    if (document.body.classList.contains("dark_theme")) {
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.setItem("theme", "light");
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login_form");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // не даём браузеру сам отправлять форму

    const body = {
      login: loginForm.login.value.trim(),
      password: loginForm.password.value.trim()
    };

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text); // покажем сообщение от сервера
        return;
      }

     if (res.ok) {
  const data = await res.json();
  window.location.href = data.redirect;
}

    } catch (err) {
      alert("Ошибка: " + err.message);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const regForm = document.getElementById("reg_form");

  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      login: regForm.login.value.trim(),
      password: regForm.password.value.trim(),
      phone: regForm.phone.value.trim()
    };

    try {
      const res = await fetch("/registr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text);
        return;
      }

      if (res.ok) {
  const data = await res.json();
  window.location.href = data.redirect;
}
    } catch (err) {
      alert("Ошибка: " + err.message);
    }
  });
});

