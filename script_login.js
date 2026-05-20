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


function showError(message, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let feedback = container.querySelector(".form_feedback");
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.className = "form_feedback error";
    container.appendChild(feedback);
  }

  feedback.textContent = message;
  feedback.style.display = "block";
}

function clearError(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const feedback = container.querySelector(".form_feedback");
  if (feedback) {
    feedback.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login_form");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("login_form");

    const body = {
      credential: loginForm.credential.value.trim(),
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
        showError(text, "login_form");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.redirect;
      }

    } catch (err) {
      showError("Ошибка: " + err.message, "login_form");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const regForm = document.getElementById("reg_form");

  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("reg_form");

    const body = {
      login: regForm.login.value.trim(),
      email: regForm.email.value.trim(),
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
        showError(text, "reg_form");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.redirect;
      }
    } catch (err) {
      showError("Ошибка: " + err.message, "reg_form");
    }
  });
});

