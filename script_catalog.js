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
        <button id="favorites_header" class="header_quick_action" type="button" aria-label="Избранное">❤</button>
        <button id="cart_header" class="header_quick_action" type="button" aria-label="Корзина">🛒</button>
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
            <div class="catalog_search">
              <input id="product_search" class="catalog_search_input" type="search" placeholder="Поиск по названию..." autocomplete="off" />
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
        <button id="favorites_header" class="header_quick_action" type="button" aria-label="Избранное">❤</button>
        <button id="cart_header" class="header_quick_action" type="button" aria-label="Корзина">🛒</button>
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

  async function fetchProductReviews(productId) {
    const res = await fetch(`/products/${productId}/reviews`);
    if (!res.ok) {
      throw new Error("Не удалось загрузить отзывы");
    }

    return res.json();
  }

  async function createProductReview(productId, payload) {
    const res = await fetch(`/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Не удалось добавить отзыв");
    }

    return data;
  }

  async function fetchProductState(productId) {
    const res = await fetch(`/api/account/products/${productId}/state`, {
      credentials: "include"
    });

    if (res.status === 401) {
      return { isFavorite: false, cartQuantity: 0 };
    }

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Не удалось получить состояние товара");
    }

    return data.state;
  }

  async function addToCart(productId, quantity = 1) {
    const res = await fetch("/api/account/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId, quantity })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Не удалось добавить в корзину");
    }
  }

  async function addToFavorites(productId) {
    const res = await fetch("/api/account/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Не удалось добавить в избранное");
    }
  }

  async function removeFromFavorites(productId) {
    const res = await fetch(`/api/account/favorites/${productId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Не удалось удалить из избранного");
    }
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

  function formatReviewDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
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

  function renderReviewsList(container, reviews) {
    container.innerHTML = "";

    if (!reviews.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "reviews_empty";
      emptyState.textContent = "Пока нет отзывов. Будьте первым, кто поделится впечатлением.";
      container.appendChild(emptyState);
      return;
    }

    reviews.forEach((review) => {
      const card = document.createElement("article");
      card.className = "review_card";

      const header = document.createElement("div");
      header.className = "review_card_header";

      const author = document.createElement("strong");
      author.className = "review_author";
      author.textContent = review.authorName;

      const meta = document.createElement("div");
      meta.className = "review_meta";

      const rating = document.createElement("span");
      rating.className = "review_rating";
      rating.textContent = `★ ${review.rating}/5`;

      const date = document.createElement("span");
      date.className = "review_date";
      date.textContent = formatReviewDate(review.createdAt);

      meta.appendChild(rating);
      meta.appendChild(date);
      header.appendChild(author);
      header.appendChild(meta);

      const text = document.createElement("p");
      text.className = "review_text";
      text.textContent = review.comment;

      card.appendChild(header);
      card.appendChild(text);
      container.appendChild(card);
    });
  }

  function bindSharedStorefrontButtons(setRoute) {
    const homeLogo = document.getElementById("home_logo");
    const heroCatalog = document.getElementById("hero_catalog");
    const floatingHome = document.getElementById("floating_home");
    const favoritesHeader = document.getElementById("favorites_header");
    const cartHeader = document.getElementById("cart_header");

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

    if (favoritesHeader) {
      favoritesHeader.addEventListener("click", () => {
        setRoute("favorites");
      });
    }

    if (cartHeader) {
      cartHeader.addEventListener("click", () => {
        setRoute("cart");
      });
    }
  }

  async function initStorefrontView({ view, limit = null, fetchUserInfo, setRoute }) {
    const nicknameDiv = document.getElementById("user_login");
    const adminBtn = document.getElementById("admin_panel");
    const productsContainer = document.getElementById("products_container");
    const searchInput = document.getElementById("product_search");
    let currentUser = { username: null, role: "user" };
    let searchQuery = "";
    let allProducts = [];

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

    function getFilteredProducts() {
      const filtered = searchQuery
        ? allProducts.filter((product) => product.title.toLowerCase().includes(searchQuery))
        : allProducts;

      return view === "main" ? sortProductsByPopularity(filtered) : filtered;
    }

    function renderProducts() {
      const visibleProducts = limit ? getFilteredProducts().slice(0, limit) : getFilteredProducts();

      if (view === "catalog") {
        const catalogCount = document.getElementById("catalog_count");
        if (catalogCount) {
          catalogCount.textContent = `${visibleProducts.length} позиций`;
        }
      }

      if (visibleProducts.length === 0) {
        const message = searchQuery
          ? `По запросу «${searchQuery}» ничего не найдено.`
          : 'Пока нет доступных букетов.';

        productsContainer.innerHTML = `<p class="products_status">${message}</p>`;
        return;
      }

      renderProductCards(productsContainer, visibleProducts, (product) => {
        setRoute("product", { productId: product.id });
      });
    }

    async function loadProducts() {
      productsContainer.innerHTML = '<p class="products_status">Загрузка букетов...</p>';

      try {
        allProducts = await fetchProducts();
        renderProducts();
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

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        searchQuery = event.target.value.trim().toLowerCase();
        renderProducts();
      });
    }

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

    async function renderProductView() {
      const [product, reviews] = await Promise.all([
        fetchProductById(productId),
        fetchProductReviews(productId)
      ]);
      const isAdmin = currentUser.role === "admin";
      const isAuthorized = Boolean(currentUser.username);
      const productState = isAuthorized
        ? await fetchProductState(productId)
        : { isFavorite: false, cartQuantity: 0 };

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
          <p class="product_detail_text">${product.description || "Свежая композиция, аккуратная сборка и быстрая доставка. Мы бережно подготавливаем каждый букет, чтобы он приехал красивым, свежим и действительно порадовал получателя."}</p>
          <div class="product_detail_price">${product.price} Br</div>
          <div class="product_detail_actions">
            ${isAuthorized ? `<button id="add_to_cart" class="modal_btn" type="button">${productState.cartQuantity > 0 ? `В корзине: ${productState.cartQuantity}` : "Добавить в корзину"}</button>` : '<button id="login_to_order" class="modal_btn" type="button">Войти</button>'}
            ${isAuthorized ? `<button id="toggle_favorite" class="modal_btn secondary_action" type="button">${productState.isFavorite ? "Убрать из избранного" : "В избранное"}</button>` : ""}
            ${isAuthorized ? '<button id="buy_now" class="modal_btn" type="button">Купить сейчас</button>' : ""}
            ${isAdmin ? '<button id="product_edit" class="modal_btn" type="button">Редактировать</button>' : ""}
          </div>
          ${isAuthorized ? "" : '<p class="product_auth_note">Чтобы купить товар или добавить его в корзину, войдите в аккаунт.</p>'}
          <p id="product_action_feedback" class="product_action_feedback" aria-live="polite"></p>
        </div>
        <section class="reviews_section">
          <div class="reviews_header">
            <div>
              <p class="section_kicker">Отзывы</p>
              <h2 class="reviews_title">Что говорят о букете</h2>
            </div>
          </div>
          ${isAuthorized ? `
            <form id="review_form" class="review_form">
              <label class="review_form_label" for="review_rating">Оценка</label>
              <select id="review_rating" class="review_select" name="rating">
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
              <label class="review_form_label" for="review_comment">Ваш отзыв</label>
              <textarea id="review_comment" class="review_textarea" name="comment" placeholder="Расскажите, что вам понравилось" required></textarea>
              <div class="review_form_actions">
                <button id="review_submit" class="modal_btn" type="submit">Оставить отзыв</button>
                <p id="review_feedback" class="review_feedback" aria-live="polite"></p>
              </div>
            </form>
          ` : '<p class="product_auth_note">Чтобы оставить отзыв, войдите в аккаунт.</p>'}
          <div id="reviews_list" class="reviews_list"></div>
        </section>
      `;

      const reviewsList = document.getElementById("reviews_list");
      const loginToOrderBtn = document.getElementById("login_to_order");
      const editBtn = document.getElementById("product_edit");
      const addToCartBtn = document.getElementById("add_to_cart");
      const buyNowBtn = document.getElementById("buy_now");
      const toggleFavoriteBtn = document.getElementById("toggle_favorite");
      const actionFeedback = document.getElementById("product_action_feedback");
      const reviewForm = document.getElementById("review_form");
      const reviewFeedback = document.getElementById("review_feedback");
      const reviewSubmit = document.getElementById("review_submit");

      if (reviewsList) {
        renderReviewsList(reviewsList, reviews);
      }

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

      if (addToCartBtn) {
        addToCartBtn.addEventListener("click", async () => {
          addToCartBtn.disabled = true;
          if (actionFeedback) {
            actionFeedback.textContent = "Добавляем товар в корзину...";
          }

          try {
            await addToCart(product.id, 1);
            await renderProductView();
            const refreshedFeedback = document.getElementById("product_action_feedback");
            if (refreshedFeedback) {
              refreshedFeedback.textContent = "Товар добавлен в корзину.";
            }
          } catch (error) {
            if (actionFeedback) {
              actionFeedback.textContent = error.message;
            }
            addToCartBtn.disabled = false;
          }
        });
      }

      if (buyNowBtn) {
        buyNowBtn.addEventListener("click", async () => {
          buyNowBtn.disabled = true;
          if (actionFeedback) {
            actionFeedback.textContent = "Добавляем товар в корзину...";
          }

          try {
            await addToCart(product.id, 1);
            setRoute("lk");
          } catch (error) {
            if (actionFeedback) {
              actionFeedback.textContent = error.message;
            }
            buyNowBtn.disabled = false;
          }
        });
      }

      if (toggleFavoriteBtn) {
        toggleFavoriteBtn.addEventListener("click", async () => {
          toggleFavoriteBtn.disabled = true;
          if (actionFeedback) {
            actionFeedback.textContent = productState.isFavorite
              ? "Удаляем из избранного..."
              : "Добавляем в избранное...";
          }

          try {
            if (productState.isFavorite) {
              await removeFromFavorites(product.id);
            } else {
              await addToFavorites(product.id);
            }

            await renderProductView();
            const refreshedFeedback = document.getElementById("product_action_feedback");
            if (refreshedFeedback) {
              refreshedFeedback.textContent = productState.isFavorite
                ? "Товар удалён из избранного."
                : "Товар добавлен в избранное.";
            }
          } catch (error) {
            if (actionFeedback) {
              actionFeedback.textContent = error.message;
            }
            toggleFavoriteBtn.disabled = false;
          }
        });
      }

      if (reviewForm) {
        reviewForm.addEventListener("submit", async (event) => {
          event.preventDefault();

          const formData = new FormData(reviewForm);
          const rating = Number(formData.get("rating"));
          const comment = String(formData.get("comment") || "").trim();

          if (!comment) {
            reviewFeedback.textContent = "Введите текст отзыва.";
            return;
          }

          reviewSubmit.disabled = true;
          reviewFeedback.textContent = "Сохраняем отзыв...";

          try {
            await createProductReview(productId, { rating, comment });
            await renderProductView();
          } catch (submitError) {
            reviewFeedback.textContent = submitError.message;
            reviewSubmit.disabled = false;
          }
        });
      }
    }

    try {
      await renderProductView();
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
