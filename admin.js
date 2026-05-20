function showConfirmModal(message, onConfirm, onCancel = null) {
  const modal = document.createElement("div");
  modal.className = "confirm_modal_overlay";
  modal.innerHTML = `
    <div class="confirm_modal">
      <p class="confirm_modal_text">${message}</p>
      <div class="confirm_modal_actions">
        <button class="confirm_modal_cancel">Отмена</button>
        <button class="confirm_modal_confirm">Удалить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cancelBtn = modal.querySelector(".confirm_modal_cancel");
  const confirmBtn = modal.querySelector(".confirm_modal_confirm");

  function cleanup() {
    modal.remove();
  }

  cancelBtn.addEventListener("click", () => {
    if (onCancel) onCancel();
    cleanup();
  });

  confirmBtn.addEventListener("click", () => {
    onConfirm();
    cleanup();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      if (onCancel) onCancel();
      cleanup();
    }
  });
}

const btn = document.getElementById("addProductBtn");
let editId = null;

function showProductError(message) {
  let feedback = document.getElementById("product_feedback");
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.id = "product_feedback";
    feedback.className = "form_feedback error";
    btn.parentNode.insertBefore(feedback, btn.nextSibling);
  }
  feedback.textContent = message;
  feedback.style.display = "block";
}

function clearProductError() {
  const feedback = document.getElementById("product_feedback");
  if (feedback) feedback.style.display = "none";
}

btn.addEventListener("click", async () => {
  clearProductError();
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const image = document.getElementById("image").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const flowerType = document.getElementById("flowerType").value;

  if (!title || !price || !image) {
    showProductError("Заполни все поля");
    return;
  }

  if (editId) {
    const res = await fetch(`/products/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, price, image, description, category, flowerType })
    });

    const data = await res.json();
    if (data.ok) {
      showProductError("Товар обновлён");
      setTimeout(() => location.reload(), 1500);
    } else {
      showProductError("Ошибка: " + data.error);
    }
    return;
  }

  const res = await fetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, price, image, description, category, flowerType })
  });

  const data = await res.json();
  if (data.ok) {
    showProductError("Товар добавлен");
    setTimeout(() => location.reload(), 1500);
  } else {
    showProductError("Ошибка: " + data.error);
  }
});

const params = new URLSearchParams(window.location.search);
editId = params.get("edit");

if (editId) {
  loadProductForEdit(editId);
}

async function loadProductForEdit(id) {
  const res = await fetch(`/products/${id}`);
  const product = await res.json();

  document.getElementById("title").value = product.title;
  document.getElementById("price").value = product.price;
  document.getElementById("image").value = product.image;
  document.getElementById("description").value = product.description || "";
  document.getElementById("category").value = product.category || "";
  document.getElementById("flowerType").value = product.flowerType || "";

  btn.textContent = "Сохранить изменения";
  document.getElementById("deleteProductBtn").style.display = "block";
}

const deleteBtn = document.getElementById("deleteProductBtn");

deleteBtn.addEventListener("click", async () => {
  if (!editId) return;

  showConfirmModal("Удалить этот товар?", async () => {
    const res = await fetch(`/products/${editId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();

    if (data.ok) {
      showProductError("Товар удалён");
      setTimeout(() => location.reload(), 1500);
    } else {
      showProductError("Ошибка: " + data.error);
    }
  });
});

const returnBtn = document.getElementById("return");

returnBtn.addEventListener("click", () => {
  window.location.href = "/main.html";
});
