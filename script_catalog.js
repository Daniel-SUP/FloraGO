(() => {
  const templates = {
    catalog: `
      <div id="page_content" class="catalog_page">
        <div id="box" class="box">
          <div class="box_inner">
            <button id="home_logo" class="brand_link" type="button">FloraGo</button>
          </div>
        </div>

        <button id="floating_home" class="floating_home" type="button">Главная</button>
        <button id="theme_change" class="theme_change">🌗</button>
        <button id="user_login" class="user_login" data-tooltip="Войти/Зарегистрироваться"></button>
        <button id="admin_panel" class="admin_panel" style="display:none;">⚙️</button>

        <main class="main_content">
          <section class="catalog_intro">
            <p class="eyebrow">Каталог FloraGo</p>
            <h1 class="catalog_title">Все букеты в одном месте</h1>
            <p class="catalog_text">Полная коллекция цветочных композиций. Открывайте карточки, чтобы посмотреть рейтинг, цену и быстро перейти к покупке.</p>
          </section>

          <section class="products_section">
            <div class="section_heading">
              <div>
                <p class="section_kicker">Ассортимент</p>
                <h2>Каталог букетов</h2>
              </div>
              <span id="catalog_count" class="section_note"></span>
            </div>
            <div id="products_container" class="products_container"></div>
          </section>
        </main>

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
    `,
    product: `
      <div id="page_content" class="catalog_page product_page">
        <div id="box" class="box">
          <div class="box_inner">
            <button id="home_logo" class="brand_link" type="button">FloraGo</button>
          </div>
        </div>

        <button id="theme_change" class="theme_change">🌗</button>
        <button id="user_login" class="user_login" data-tooltip="Войти/Зарегистрироваться"></button>
        <button id="admin_panel" class="admin_panel" style="display:none;">⚙️</button>

        <main class="main_content">
          <section class="product_shell">
            <div class="product_topbar">
              <button id="back_to_catalog" class="ghost_btn" type="button">← В каталог</button>
            </div>

            <div id="product_detail" class="product_detail">
              <p class="products_status">Загрузка букета...</p>
            </div>
          </section>
        </main>

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
    `
  };

  async function fetchProducts() {
    const res = await fetch("/products");
    return res.json();
  }

  async function fetchProductById(productId) {
    const res = await fetch(`/products/${productId}`);
    if (!res.ok) {
      throw new Error("Товар не найден");
    }

    return res.json();
  }

  function sortProductsByPopularity(products) {
    return [...products].sort((a, b) => {
      const ratingDiff = Number(b.rating) - Number(a.rating);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return Number(b.reviews) - Number(a.reviews);
    });
  }

  function renderProductCards(productsContainer, products, onOpenProduct) {
    productsContainer.innerHTML = "";

    products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product_card";
      card.innerHTML = `
        <img src="${product.image}" class="product_image" alt="${product.title}">
        <div class="product_info">
          <div class="product_title">${product.title}</div>
          <div class="product_rating">★ ${product.rating} (${product.reviews})</div>
          <div class="product_price">${product.price} Br</div>
        </div>
      `;

      card.addEventListener("click", () => onOpenProduct(product));
      productsContainer.appendChild(card);
    });
  }

  function bindSharedStorefrontButtons(setRoute) {
    const homeLogo = document.getElementById("home_logo");
    const heroCatalog = document.getElementById("hero_catalog");
    const floatingHome = document.getElementById("floating_home");

    if (homeLogo) {
      homeLogo.addEventListener("click", () => {
        setRoute("main");
      });
    }

    if (heroCatalog) {
      heroCatalog.addEventListener("click", () => {
        setRoute("catalog");
      });
    }

    if (floatingHome) {
      floatingHome.addEventListener("click", () => {
        setRoute("main");
      });
    }
  }

  async function initStorefrontView({ view, limit = null, fetchUserInfo, setRoute }) {
    const nicknameDiv = document.getElementById("user_login");
    const adminBtn = document.getElementById("admin_panel");
    const productsContainer = document.getElementById("products_container");
    let currentUser = { username: null, role: "user" };

    function setGuestUI() {
      nicknameDiv.textContent = "👻 Гость";
      nicknameDiv.setAttribute("data-tooltip", "Войти/Зарегистрироваться");
      adminBtn.style.display = "none";
    }

    function setUserUI(name, isAdmin = false) {
      nicknameDiv.textContent = isAdmin ? `🛡️ ${name}` : `👤 ${name}`;
      nicknameDiv.setAttribute("data-tooltip", "Личный кабинет");
      adminBtn.style.display = isAdmin ? "block" : "none";
    }

    async function loadProducts() {
      productsContainer.innerHTML = '<p class="products_status">Загрузка букетов...</p>';

      try {
        const products = await fetchProducts();
        const sortedProducts = view === "main" ? sortProductsByPopularity(products) : products;
        const visibleProducts = limit ? sortedProducts.slice(0, limit) : sortedProducts;

        if (view === "catalog") {
          const catalogCount = document.getElementById("catalog_count");
          if (catalogCount) {
            catalogCount.textContent = `${visibleProducts.length} позиций`;
          }
        }

        if (visibleProducts.length === 0) {
          productsContainer.innerHTML = '<p class="products_status">Пока нет доступных букетов.</p>';
          return;
        }

        renderProductCards(productsContainer, visibleProducts, (product) => {
          setRoute("product", { productId: product.id });
        });
      } catch (err) {
        console.error("Ошибка загрузки товаров:", err);
        productsContainer.innerHTML = '<p class="products_status">Не удалось загрузить каталог.</p>';
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

    bindSharedStorefrontButtons(setRoute);
    await loadProducts();
  }

  async function initMainView(deps) {
    await initStorefrontView({ view: "main", limit: 4, ...deps });
  }

  async function initCatalogView(deps) {
    await initStorefrontView({ view: "catalog", ...deps });
  }

  async function initProductView(route, { fetchUserInfo, setRoute }) {
    const nicknameDiv = document.getElementById("user_login");
    const adminBtn = document.getElementById("admin_panel");
    const backToCatalog = document.getElementById("back_to_catalog");
    const productDetail = document.getElementById("product_detail");
    const productId = route.productId;
    let currentUser = { username: null, role: "user" };

    function setGuestUI() {
      nicknameDiv.textContent = "👻 Гость";
      nicknameDiv.setAttribute("data-tooltip", "Войти/Зарегистрироваться");
      adminBtn.style.display = "none";
    }

    function setUserUI(name, isAdmin = false) {
      nicknameDiv.textContent = isAdmin ? `🛡️ ${name}` : `👤 ${name}`;
      nicknameDiv.setAttribute("data-tooltip", "Личный кабинет");
      adminBtn.style.display = isAdmin ? "block" : "none";
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

    bindSharedStorefrontButtons(setRoute);

    if (backToCatalog) {
      backToCatalog.addEventListener("click", () => {
        setRoute("catalog");
      });
    }

    if (!productId) {
      productDetail.innerHTML = '<p class="products_status">Некорректный адрес товара.</p>';
      return;
    }

    try {
      const product = await fetchProductById(productId);
      const isAdmin = currentUser.role === "admin";
      const isAuthorized = Boolean(currentUser.username);

      productDetail.innerHTML = `
        <div class="product_media">
          <img src="${product.image}" class="product_detail_image" alt="${product.title}">
        </div>
        <div class="product_content">
          <p class="eyebrow">Букет FloraGo</p>
          <h1 class="product_detail_title">${product.title}</h1>
          <div class="product_detail_meta">
            <span class="product_detail_rating">★ ${product.rating} (${product.reviews} отзывов)</span>
            <span class="product_detail_badge">Доставка 40-60 минут</span>
          </div>
          <p class="product_detail_text">Свежая композиция, аккуратная сборка и быстрая доставка. Мы бережно подготавливаем каждый букет, чтобы он приехал красивым, свежим и действительно порадовал получателя.</p>
          <div class="product_detail_price">${product.price} Br</div>
          <div class="product_detail_actions">
            ${isAuthorized ? '<button id="add_to_cart" class="modal_btn" type="button">Добавить в корзину</button>' : '<button id="login_to_order" class="modal_btn" type="button">Войти</button>'}
            ${isAuthorized ? '<button id="buy_now" class="modal_btn" type="button">Купить сейчас</button>' : ""}
            ${isAdmin ? '<button id="product_edit" class="modal_btn" type="button">Редактировать</button>' : ""}
          </div>
          ${isAuthorized ? "" : '<p class="product_auth_note">Чтобы купить товар или добавить его в корзину, войдите в аккаунт.</p>'}
        </div>
      `;

      const loginToOrderBtn = document.getElementById("login_to_order");
      const editBtn = document.getElementById("product_edit");

      if (loginToOrderBtn) {
        loginToOrderBtn.addEventListener("click", () => {
          setRoute("login", { mode: "login" });
        });
      }

      if (editBtn) {
        editBtn.addEventListener("click", () => {
          setRoute("admin", { edit: product.id });
        });
      }
    } catch (error) {
      productDetail.innerHTML = `
        <div class="product_not_found">
          <h1>Букет не найден</h1>
          <p>Возможно, товар был удалён или ссылка указана неверно.</p>
          <button id="product_fallback" class="section_cta" type="button">Вернуться в каталог</button>
        </div>
      `;

      const fallbackBtn = document.getElementById("product_fallback");
      if (fallbackBtn) {
        fallbackBtn.addEventListener("click", () => {
          setRoute("catalog");
        });
      }
    }
  }

  window.FloraCatalog = {
    templates,
    initMainView,
    initCatalogView,
    initProductView
  };
})();
