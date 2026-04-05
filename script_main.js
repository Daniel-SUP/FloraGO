(() => {
  const app = document.getElementById("app");
  const allowedViews = new Set(["main", "login", "lk", "admin"]);

  const templates = {
    main: `
      <div id="page_content">
        <div id="box" class="box">
          <h1 class="head">FloraGo</h1>
        </div>

        <button id="theme_change" class="theme_change">🌗</button>
        <button id="user_login" class="user_login" data-tooltip="Войти/Зарегистрироваться"></button>
        <button id="admin_panel" class="admin_panel" style="display:none;">⚙️</button>

        <div id="products_container" class="products_container"></div>

        <footer class="site_footer">
          <div class="footer_content">
            <span>© 2026 FloraGo</span>
            <nav class="footer_links">
              <a href="https://ru.wikipedia.org/wiki/%D0%A6%D0%B2%D0%B5%D1%82%D0%BE%D0%BA" target="_blank" rel="noopener noreferrer">О магазине</a>
              <a href="#">Соцсети</a>
              <a href="#">Политика конфиденциальности</a>
            </nav>
          </div>
        </footer>
      </div>

      <div id="product_modal" class="product_modal">
        <div class="product_modal_content">
          <span id="modal_close" class="modal_close">&times;</span>
          <img id="modal_image" class="modal_image" alt="Товар" />
          <h2 id="modal_title"></h2>
          <p id="modal_rating"></p>
          <p id="modal_price" class="modal_price"></p>

          <div class="modal_buttons">
            <button class="modal_btn add_cart">Добавить в корзину</button>
            <button class="modal_btn buy_now">Купить</button>
            <button class="modal_btn edit_product">Редактировать</button>
          </div>
        </div>
      </div>
    `,
    login: `
      <button id="theme_change" class="theme_change">🌗</button>

      <form id="login_form">
        <h1 class="form-head">Вход в аккаунт</h1>
        <label for="login_credential">Логин или email:</label>
        <input type="text" id="login_credential" name="credential" placeholder="Введите логин или email" />

        <label for="login_password">Ваш пароль:</label>
        <input type="password" id="login_password" name="password" placeholder="Введите пароль" />

        <button type="submit">Отправить</button>
        <p><a href="#" data-action="open-forgot">Забыли пароль?</a></p>
        <p>Нет аккаунта? <a href="#" data-action="open-reg">Зарегистрироваться</a></p>
      </form>

      <form id="reg_form" style="display:none;">
        <h1 class="form-head">Регистрация</h1>

        <label for="reg_login">Ваш логин:</label>
        <input type="text" id="reg_login" name="login" placeholder="Введите логин" />

        <label for="reg_email">Ваш email:</label>
        <input type="email" id="reg_email" name="email" placeholder="Введите email" />

        <label for="reg_password">Придумайте пароль:</label>
        <input type="password" id="reg_password" name="password" placeholder="Придумайте пароль" />

        <label for="reg_phone">Укажите номер телефона (без +):</label>
        <input type="text" id="reg_phone" name="phone" placeholder="375xxxxxxxxx" />

        <button type="submit">Отправить</button>
        <p>Уже есть аккаунт? <a href="#" data-action="open-login">Войти</a></p>
      </form>

      <form id="forgot_form" style="display:none;">
        <h1 class="form-head">Восстановление пароля</h1>
        <p class="form-note">Введите email, и мы отправим на него шестизначный код.</p>

        <label for="forgot_email">Ваш email:</label>
        <input type="email" id="forgot_email" name="email" placeholder="Введите email" />

        <button type="submit">Отправить код</button>
        <p>Вспомнили пароль? <a href="#" data-action="open-login">Вернуться ко входу</a></p>
      </form>

      <form id="reset_form" style="display:none;">
        <h1 class="form-head">Новый пароль</h1>
        <p class="form-note">Введите код из письма и задайте новый пароль.</p>

        <label for="reset_email">Email:</label>
        <input type="email" id="reset_email" name="email" placeholder="Введите email" />

        <label for="reset_code">Код из письма:</label>
        <input type="text" id="reset_code" name="code" placeholder="6 цифр" inputmode="numeric" maxlength="6" />

        <label for="reset_password">Новый пароль:</label>
        <input type="password" id="reset_password" name="newPassword" placeholder="Введите новый пароль" />

        <button type="submit">Сменить пароль</button>
        <p>Нужен новый код? <a href="#" data-action="open-forgot">Запросить снова</a></p>
      </form>
    `,
    lk: `
      <div class="lk_container">
        <button id="return" class="return">⬅</button>

        <div class="lk_header">
          <h1>Личный кабинет</h1>
        </div>

        <div class="lk_profile">
          <img id="lk_avatar" class="lk_avatar" src="https://i.imgur.com/6VBx3io.png" alt="Аватар" />

          <div class="lk_info">
            <div class="lk_row"><span>Никнейм:</span> <b id="lk_username">Загрузка...</b></div>
            <div class="lk_row"><span>Email:</span> <b id="lk_email">Загрузка...</b></div>
            <div class="lk_row"><span>Номер телефона: +</span> <b id="lk_phone">Загрузка...</b></div>
            <div class="lk_row"><span>Роль:</span> <b id="lk_role">Загрузка...</b></div>
          </div>
        </div>

        <div class="lk_buttons">
          <button id="editProfileBtn">Редактировать профиль</button>
          <button id="logoutBtn" class="logout">Выйти</button>
        </div>
      </div>
    `,
    admin: `
      <div class="admin_container">
        <button id="return" class="return">⬅</button>
        <h2>Админ-панель</h2>

        <div class="admin_sections">
          <section class="admin_section">
            <h3>Управление товарами</h3>

            <input type="text" id="title" placeholder="Название товара" />
            <input type="number" id="price" placeholder="Цена" />
            <input type="text" id="image" placeholder="URL изображения" />

            <button id="addProductBtn">Добавить товар</button>
            <button id="deleteProductBtn">Удалить товар</button>
          </section>

          <section class="admin_section">
            <div class="admin_section_header">
              <h3>Управление пользователями</h3>
              <button id="refreshUsersBtn" type="button" class="secondary_btn">Обновить список</button>
            </div>

            <div id="usersList" class="users_list"></div>

            <input type="text" id="user_login" placeholder="Логин" />
            <input type="email" id="user_email" placeholder="Email" />
            <input type="text" id="user_phone" placeholder="Телефон без +" />
            <select id="user_role">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <input type="password" id="user_password" placeholder="Новый пароль или пароль для создания" />

            <button id="saveUserBtn" type="button">Создать пользователя</button>
            <button id="deleteUserBtn" type="button">Удалить пользователя</button>
            <button id="resetUserFormBtn" type="button" class="secondary_btn">Сбросить форму</button>
          </section>
        </div>
      </div>
    `
  };

  const styleMap = {
    main: "style-main",
    login: "style-login",
    lk: "style-lk",
    admin: "style-admin"
  };

  function getRoute() {
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;
    const edit = params.get("edit");

    if (pathname === "/auth/register") {
      return { view: "login", mode: "register", edit: null };
    }

    if (pathname === "/auth/login") {
      return { view: "login", mode: "login", edit: null };
    }

    if (pathname === "/auth/forgot-password") {
      return { view: "login", mode: "forgot", edit: null };
    }

    if (pathname === "/auth/reset-password") {
      return { view: "login", mode: "reset", edit: null };
    }

    if (pathname === "/lk") {
      return { view: "lk", mode: null, edit: null };
    }

    if (pathname === "/admin") {
      return { view: "admin", mode: null, edit };
    }

    const requestedView = params.get("view") || "main";
    const view = allowedViews.has(requestedView) ? requestedView : "main";
    const mode = params.get("mode");

    return { view, mode, edit };
  }

  function buildUrl(view, extraParams = {}) {
    const params = new URLSearchParams();

    if (view === "main") {
      return "/";
    }

    if (view === "login") {
      if (extraParams.mode === "register") return "/auth/register";
      if (extraParams.mode === "forgot") return "/auth/forgot-password";
      if (extraParams.mode === "reset") return "/auth/reset-password";
      return "/auth/login";
    }

    if (view === "lk") {
      return "/lk";
    }

    if (view === "admin") {
      if (extraParams.edit) {
        params.set("edit", String(extraParams.edit));
      }

      const query = params.toString();
      return query ? `/admin?${query}` : "/admin";
    }

    params.set("view", view);
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });

    return `/?${params.toString()}`;
  }

  function setRoute(view, extraParams = {}, replace = false) {
    const nextUrl = buildUrl(view, extraParams);

    if (replace) {
      window.history.replaceState({}, "", nextUrl);
    } else {
      window.history.pushState({}, "", nextUrl);
    }

    render();
  }

  function activateStyles(view) {
    Object.values(styleMap).forEach((id) => {
      const link = document.getElementById(id);
      if (link) {
        link.disabled = true;
      }
    });

    const active = document.getElementById(styleMap[view]);
    if (active) {
      active.disabled = false;
    }
  }

  function applySavedTheme() {
    if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark_theme");
    } else {
      document.body.classList.remove("dark_theme");
    }
  }

  function bindThemeButton() {
    const change = document.getElementById("theme_change");
    if (!change) return;

    change.addEventListener("click", () => {
      document.body.classList.toggle("dark_theme");
      localStorage.setItem("theme", document.body.classList.contains("dark_theme") ? "dark" : "light");
    });
  }

  async function fetchUserInfo() {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    const data = await res.json();

    if (!res.ok || !data.ok || !data.user) {
      return { username: null };
    }

    return {
      username: data.user.login,
      email: data.user.email,
      phone: data.user.phone,
      role: data.user.role
    };
  }

  async function initMainView() {
    const nicknameDiv = document.getElementById("user_login");
    const modalButtons = document.querySelector(".modal_buttons");
    const editBtn = document.querySelector(".edit_product");
    const adminBtn = document.getElementById("admin_panel");
    const productsContainer = document.getElementById("products_container");

    let currentProductId = null;
    let currentUser = { username: null, role: "user" };

    function setGuestUI() {
      nicknameDiv.textContent = "👻 Гость";
      nicknameDiv.setAttribute("data-tooltip", "Войти/Зарегистрироваться");
      modalButtons.style.display = "none";
      editBtn.style.display = "none";
      adminBtn.style.display = "none";
    }

    function setUserUI(name, isAdmin = false) {
      nicknameDiv.textContent = isAdmin ? `🛡️ ${name}` : `👤 ${name}`;
      nicknameDiv.setAttribute("data-tooltip", "Личный кабинет");
      modalButtons.style.display = "flex";
      editBtn.style.display = isAdmin ? "block" : "none";
      adminBtn.style.display = isAdmin ? "block" : "none";
    }

    function closeModal() {
      const modal = document.getElementById("product_modal");
      modal.style.display = "none";
      document.body.classList.remove("modal_open");
    }

    function openProductModal(product) {
      currentProductId = product.id;
      const modal = document.getElementById("product_modal");

      document.getElementById("modal_image").src = product.image;
      document.getElementById("modal_title").textContent = product.title;
      document.getElementById("modal_rating").textContent = `★ ${product.rating} (${product.reviews})`;
      document.getElementById("modal_price").textContent = `${product.price} Br`;

      modal.style.display = "flex";
      document.body.classList.add("modal_open");
    }

    async function loadProducts() {
      productsContainer.innerHTML = "";

      try {
        const res = await fetch("/products");
        const products = await res.json();

        products.forEach((p) => {
          const card = document.createElement("div");
          card.className = "product_card";
          card.innerHTML = `
            <img src="${p.image}" class="product_image" alt="${p.title}">
            <div class="product_info">
              <div class="product_title">${p.title}</div>
              <div class="product_rating">★ ${p.rating} (${p.reviews})</div>
              <div class="product_price">${p.price} Br</div>
            </div>
          `;

          card.addEventListener("click", () => openProductModal(p));
          productsContainer.appendChild(card);
        });
      } catch (err) {
        console.error("Ошибка загрузки товаров:", err);
      }
    }

    try {
      const data = await fetchUserInfo();
      currentUser = data;

      if (!data.username) {
        setGuestUI();
      } else {
        setUserUI(data.username, data.role === "admin");
      }
    } catch {
      setGuestUI();
    }

    nicknameDiv.addEventListener("click", () => {
      if (!currentUser.username) {
        setRoute("login");
      } else {
        setRoute("lk");
      }
    });

    adminBtn.addEventListener("click", () => {
      setRoute("admin");
    });

    editBtn.addEventListener("click", () => {
      if (!currentProductId) return;
      setRoute("admin", { edit: currentProductId });
    });

    document.getElementById("modal_close").addEventListener("click", closeModal);

    document.getElementById("product_modal").addEventListener("click", (e) => {
      if (e.target.id === "product_modal") {
        closeModal();
      }
    });

    await loadProducts();
  }

  async function initLoginView(route) {
    const loginForm = document.getElementById("login_form");
    const regForm = document.getElementById("reg_form");
    const forgotForm = document.getElementById("forgot_form");
    const resetForm = document.getElementById("reset_form");

    function showLogin() {
      loginForm.style.display = "block";
      regForm.style.display = "none";
      forgotForm.style.display = "none";
      resetForm.style.display = "none";
    }

    function showRegister() {
      loginForm.style.display = "none";
      regForm.style.display = "block";
      forgotForm.style.display = "none";
      resetForm.style.display = "none";
    }

    function showForgot() {
      loginForm.style.display = "none";
      regForm.style.display = "none";
      forgotForm.style.display = "block";
      resetForm.style.display = "none";
    }

    function showReset() {
      loginForm.style.display = "none";
      regForm.style.display = "none";
      forgotForm.style.display = "none";
      resetForm.style.display = "block";
    }

    if (route.mode === "register") {
      showRegister();
    } else if (route.mode === "forgot") {
      showForgot();
    } else if (route.mode === "reset") {
      showReset();
    } else {
      showLogin();
    }

    document.querySelector("[data-action='open-reg']").addEventListener("click", (e) => {
      e.preventDefault();
      setRoute("login", { mode: "register" });
    });

    document.querySelectorAll("[data-action='open-login']").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        setRoute("login", { mode: "login" });
      });
    });

    document.querySelectorAll("[data-action='open-forgot']").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        setRoute("login", { mode: "forgot" });
      });
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const body = {
        credential: loginForm.credential.value.trim(),
        password: loginForm.password.value.trim()
      };

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          alert(data.error || "Ошибка входа");
          return;
        }

        setRoute("lk", {}, true);
      } catch (err) {
        alert(`Ошибка: ${err.message}`);
      }
    });

    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const body = {
        login: regForm.login.value.trim(),
        email: regForm.email.value.trim(),
        password: regForm.password.value.trim(),
        phone: regForm.phone.value.trim()
      };

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          alert(data.error || "Ошибка регистрации");
          return;
        }

        setRoute("lk", {}, true);
      } catch (err) {
        alert(`Ошибка: ${err.message}`);
      }
    });

    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const body = {
        email: forgotForm.email.value.trim()
      };

      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          alert(data.error || "Не удалось отправить код");
          return;
        }

        resetForm.email.value = body.email;
        alert(data.message || "Код отправлен");
        setRoute("login", { mode: "reset" }, true);
      } catch (err) {
        alert(`Ошибка: ${err.message}`);
      }
    });

    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const body = {
        email: resetForm.email.value.trim(),
        code: resetForm.code.value.trim(),
        newPassword: resetForm.newPassword.value.trim()
      };

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          alert(data.error || "Не удалось сменить пароль");
          return;
        }

        alert(data.message || "Пароль изменен");
        setRoute("login", { mode: "login" }, true);
      } catch (err) {
        alert(`Ошибка: ${err.message}`);
      }
    });
  }

  async function initLkView() {
    const data = await fetchUserInfo();
    if (!data.username) {
      setRoute("login", { edit: null }, true);
      return;
    }

    document.getElementById("lk_username").textContent = data.username;
    document.getElementById("lk_email").textContent = data.email || "-";
    document.getElementById("lk_phone").textContent = data.phone || "-";
    document.getElementById("lk_role").textContent = data.role;

    if (data.role === "admin") {
      document.getElementById("lk_avatar").src = "https://avatars.mds.yandex.net/i?id=10a35c04830c25eb71e1dfdc207f3574_l-3613310-images-thumbs&n=13";
    }

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      const ok = confirm("Выйти из аккаунта?");
      if (!ok) return;

      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      setRoute("main", { edit: null }, true);
    });

    document.getElementById("return").addEventListener("click", () => {
      setRoute("main", { edit: null });
    });

    let editMode = false;

    document.getElementById("editProfileBtn").addEventListener("click", async () => {
      const usernameEl = document.getElementById("lk_username");
      const emailEl = document.getElementById("lk_email");
      const phoneEl = document.getElementById("lk_phone");
      const btn = document.getElementById("editProfileBtn");

      if (!editMode) {
        const usernameInput = document.createElement("input");
        usernameInput.id = "edit_username";
        usernameInput.value = usernameEl.textContent;
        usernameInput.className = "edit_input";

        const emailInput = document.createElement("input");
        emailInput.id = "edit_email";
        emailInput.type = "email";
        emailInput.value = emailEl.textContent;
        emailInput.className = "edit_input";

        const phoneInput = document.createElement("input");
        phoneInput.id = "edit_phone";
        phoneInput.value = phoneEl.textContent;
        phoneInput.className = "edit_input";

        usernameEl.replaceWith(usernameInput);
        emailEl.replaceWith(emailInput);
        phoneEl.replaceWith(phoneInput);

        btn.textContent = "Сохранить";
        editMode = true;
        return;
      }

      const newUsername = document.getElementById("edit_username").value.trim();
      const newEmail = document.getElementById("edit_email").value.trim();
      const newPhone = document.getElementById("edit_phone").value.trim();

      const res = await fetch("/update_user_full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: newUsername, email: newEmail, phone: newPhone })
      });

      const result = await res.json();
      if (!result.ok) {
        alert(result.error);
        return;
      }

      const usernameB = document.createElement("b");
      usernameB.id = "lk_username";
      usernameB.textContent = newUsername;

      const emailB = document.createElement("b");
      emailB.id = "lk_email";
      emailB.textContent = newEmail;

      const phoneB = document.createElement("b");
      phoneB.id = "lk_phone";
      phoneB.textContent = newPhone;

      document.getElementById("edit_username").replaceWith(usernameB);
      document.getElementById("edit_email").replaceWith(emailB);
      document.getElementById("edit_phone").replaceWith(phoneB);

      btn.textContent = "Редактировать профиль";
      editMode = false;
    });
  }

  async function initAdminView(route) {
    const data = await fetchUserInfo();
    if (!data.username || data.role !== "admin") {
      setRoute("main", { edit: null }, true);
      return;
    }

    const btn = document.getElementById("addProductBtn");
    const deleteBtn = document.getElementById("deleteProductBtn");
    const returnBtn = document.getElementById("return");
    const usersList = document.getElementById("usersList");
    const refreshUsersBtn = document.getElementById("refreshUsersBtn");
    const saveUserBtn = document.getElementById("saveUserBtn");
    const deleteUserBtn = document.getElementById("deleteUserBtn");
    const resetUserFormBtn = document.getElementById("resetUserFormBtn");
    const userLoginInput = document.getElementById("user_login");
    const userEmailInput = document.getElementById("user_email");
    const userPhoneInput = document.getElementById("user_phone");
    const userRoleInput = document.getElementById("user_role");
    const userPasswordInput = document.getElementById("user_password");
    let editId = route.edit;
    let selectedUserId = null;

    returnBtn.addEventListener("click", () => {
      setRoute("main", { edit: null });
    });

    function resetUserForm() {
      selectedUserId = null;
      userLoginInput.value = "";
      userEmailInput.value = "";
      userPhoneInput.value = "";
      userRoleInput.value = "user";
      userPasswordInput.value = "";
      saveUserBtn.textContent = "Создать пользователя";
      deleteUserBtn.style.display = "none";

      usersList.querySelectorAll(".user_card").forEach((card) => {
        card.classList.remove("active");
      });
    }

    function fillUserForm(user) {
      selectedUserId = user.id;
      userLoginInput.value = user.login;
      userEmailInput.value = user.email;
      userPhoneInput.value = user.phone;
      userRoleInput.value = user.role;
      userPasswordInput.value = "";
      saveUserBtn.textContent = "Сохранить пользователя";
      deleteUserBtn.style.display = "block";
    }

    async function loadUsers() {
      usersList.innerHTML = "<p>Загрузка пользователей...</p>";

      try {
        const res = await fetch("/api/users", { credentials: "include" });
        const result = await res.json();

        if (!res.ok || !result.ok) {
          usersList.innerHTML = `<p>${result.error || "Не удалось загрузить пользователей"}</p>`;
          return;
        }

        if (result.users.length === 0) {
          usersList.innerHTML = "<p>Пользователей пока нет.</p>";
          return;
        }

        usersList.innerHTML = "";

        result.users.forEach((user) => {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "user_card";
          card.innerHTML = `
            <b>${user.login}</b>
            <span>${user.email}</span>
            <span>+${user.phone}</span>
            <span class="user_role_badge">${user.role}</span>
          `;

          if (selectedUserId === user.id) {
            card.classList.add("active");
          }

          card.addEventListener("click", () => {
            usersList.querySelectorAll(".user_card").forEach((item) => item.classList.remove("active"));
            card.classList.add("active");
            fillUserForm(user);
          });

          usersList.appendChild(card);
        });
      } catch (error) {
        usersList.innerHTML = `<p>Ошибка: ${error.message}</p>`;
      }
    }

    async function loadProductForEdit(id) {
      const res = await fetch(`/products/${id}`);
      if (!res.ok) {
        alert("Товар не найден");
        setRoute("admin", { edit: null }, true);
        return;
      }

      const product = await res.json();
      document.getElementById("title").value = product.title;
      document.getElementById("price").value = product.price;
      document.getElementById("image").value = product.image;
      btn.textContent = "Сохранить изменения";
      deleteBtn.style.display = "block";
    }

    if (editId) {
      await loadProductForEdit(editId);
    }

    btn.addEventListener("click", async () => {
      const title = document.getElementById("title").value.trim();
      const price = document.getElementById("price").value.trim();
      const image = document.getElementById("image").value.trim();

      if (!title || !price || !image) {
        alert("Заполни все поля");
        return;
      }

      if (editId) {
        const res = await fetch(`/products/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, price, image })
        });

        const result = await res.json();
        if (!result.ok) {
          alert(`Ошибка: ${result.error}`);
          return;
        }

        alert("Товар обновлен");
        setRoute("admin", { edit: editId }, true);
        return;
      }

      const res = await fetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, price, image })
      });

      const result = await res.json();
      if (!result.ok) {
        alert(`Ошибка: ${result.error}`);
        return;
      }

      alert("Товар добавлен");
      setRoute("admin", { edit: null }, true);
    });

    deleteBtn.addEventListener("click", async () => {
      if (!editId) return;

      const ok = confirm("Удалить этот товар?");
      if (!ok) return;

      const res = await fetch(`/products/${editId}`, {
        method: "DELETE",
        credentials: "include"
      });

      const result = await res.json();
      if (!result.ok) {
        alert(`Ошибка: ${result.error}`);
        return;
      }

      alert("Товар удален");
      setRoute("admin", { edit: null }, true);
    });

    refreshUsersBtn.addEventListener("click", async () => {
      await loadUsers();
    });

    resetUserFormBtn.addEventListener("click", () => {
      resetUserForm();
    });

    saveUserBtn.addEventListener("click", async () => {
      const payload = {
        login: userLoginInput.value.trim(),
        email: userEmailInput.value.trim(),
        phone: userPhoneInput.value.trim(),
        role: userRoleInput.value,
        password: userPasswordInput.value.trim()
      };

      if (!selectedUserId && !payload.password) {
        alert("Для создания пользователя нужен пароль");
        return;
      }

      const method = selectedUserId ? "PUT" : "POST";
      const endpoint = selectedUserId ? `/api/users/${selectedUserId}` : "/api/users";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        alert(result.error || "Не удалось сохранить пользователя");
        return;
      }

      alert(selectedUserId ? "Пользователь обновлен" : "Пользователь создан");
      if (result.user) {
        fillUserForm(result.user);
      } else {
        resetUserForm();
      }
      await loadUsers();
    });

    deleteUserBtn.addEventListener("click", async () => {
      if (!selectedUserId) return;

      const ok = confirm("Удалить выбранного пользователя?");
      if (!ok) return;

      const res = await fetch(`/api/users/${selectedUserId}`, {
        method: "DELETE",
        credentials: "include"
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        alert(result.error || "Не удалось удалить пользователя");
        return;
      }

      alert("Пользователь удален");
      resetUserForm();
      await loadUsers();
    });

    resetUserForm();
    await loadUsers();
  }

  async function render() {
    const route = getRoute();

    activateStyles(route.view);
    applySavedTheme();

    app.innerHTML = templates[route.view];

    bindThemeButton();

    if (route.view === "main") await initMainView();
    if (route.view === "login") await initLoginView(route);
    if (route.view === "lk") await initLkView();
    if (route.view === "admin") await initAdminView(route);
  }

  window.addEventListener("scroll", () => {
    const box = document.getElementById("box");
    if (!box) return;

    box.style.opacity = window.scrollY > 50 ? "0.5" : "1";
  });

  window.addEventListener("popstate", () => {
    render();
  });

  render();
})();
