const btn = document.getElementById("addProductBtn");
let editId = null; // если null — добавляем, если есть — редактируем

// один обработчик на кнопку
btn.addEventListener("click", async () => {
  const title = document.getElementById("title").value;
  const price = document.getElementById("price").value;
  const image = document.getElementById("image").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const flowerType = document.getElementById("flowerType").value;

  if (!title || !price || !image) {
    alert("Заполни все поля");
    return;
  }

  // режим РЕДАКТИРОВАНИЯ
  if (editId) {
    const res = await fetch(`/products/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, price, image, description, category, flowerType })
    });

    const data = await res.json();
    if (data.ok) {
      alert("Товар обновлён");
      location.reload();

    } else {
      alert("Ошибка: " + data.error);
    }
    return;
  }

  // режим ДОБАВЛЕНИЯ
  const res = await fetch("/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title, price, image, description, category, flowerType })
  });

  const data = await res.json();
  if (data.ok) {
    alert("Товар добавлен");
    location.reload();
  } else {
    alert("Ошибка: " + data.error);
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
  // показываем кнопку удаления
  document.getElementById("deleteProductBtn").style.display = "block";

}

const deleteBtn = document.getElementById("deleteProductBtn");

deleteBtn.addEventListener("click", async () => {
  if (!editId) return;

  const ok = confirm("Удалить этот товар?");
  if (!ok) return;

  const res = await fetch(`/products/${editId}`, {
    method: "DELETE",
    credentials: "include"
  });

  const data = await res.json();

  if (data.ok) {
    alert("Товар удалён");
    location.reload();
  } else {
    alert("Ошибка: " + data.error);
  }
});

const returnBtn = document.getElementById("return");

returnBtn.addEventListener("click", () => {
  window.location.href = "/main.html";
});
