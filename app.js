// --------------- UTILIDAD LOCAL STORAGE
function getProducts() {
  return JSON.parse(localStorage.getItem('products_v2') || '[]');
}
function saveProducts(products) {
  localStorage.setItem('products_v2', JSON.stringify(products));
}
function escapeHTML(txt) {
  return (txt+'').replace(/[<>&"'\/]/g, function(c) {
    return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','/':'&#x2F;'}[c];
  });
}
// --------------- TEMA MANAGER LIGHT/DARK
function setTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('inventory_theme', theme);
}
function loadTheme() {
  const t = localStorage.getItem('inventory_theme');
  setTheme((t==='dark')?'dark':'light');
}
document.getElementById('theme-toggle').addEventListener('click',function(){
  const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(theme);
});
loadTheme();

// --------------- FILTRO Y BUSCADOR (puntos 1 y 10)
let currentFilter = 'all';
let searchQuery = '';
document.getElementById('filtro-todos').onclick = () => {currentFilter='all'; renderProducts();setActiveFilter();}
document.getElementById('filtro-bajo').onclick = () => {currentFilter='low'; renderProducts();setActiveFilter();}
document.getElementById('filtro-cero').onclick = () => {currentFilter='zero'; renderProducts(); setActiveFilter();}
function setActiveFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn=>btn.classList.remove('active'));
  if(currentFilter==='low')document.getElementById('filtro-bajo').classList.add('active');
  else if(currentFilter==='zero')document.getElementById('filtro-cero').classList.add('active');
  else document.getElementById('filtro-todos').classList.add('active');
}
document.getElementById('buscador').addEventListener('input', function(){
  searchQuery = this.value.toLowerCase().trim();
  renderProducts();
});
// --------------- RENDER TABLA
function renderProducts() {
  document.getElementById('loading-indicator').style.display = 'block';
  setTimeout(() => {
    let products = getProducts();
    // Filtro stock
    if(currentFilter==='low') products = products.filter(p=>p.stock>0 && p.stock<=5);
    else if(currentFilter==='zero') products = products.filter(p=>p.stock<=0);
    // Filtro búsqueda
    if(searchQuery.length>0){
      products = products.filter(p =>
        p.nombre.toLowerCase().includes(searchQuery) ||
        p.marca.toLowerCase().includes(searchQuery)
      );
    }
    // Render
    const tbody = document.getElementById('product-list');
    tbody.innerHTML = '';
    products.forEach((prod, idx) => {
      // Chip de stock color
      let stockClass='stock-chip--ok'; // verde
      if(prod.stock==0) stockClass='stock-chip--low';
      else if(prod.stock>0 && prod.stock<=5)stockClass='stock-chip--mid';
      // Fila tabla
      const tr = document.createElement('tr');
      tr.setAttribute('data-index', idx);
      tr.innerHTML = `
        <td>${escapeHTML(prod.nombre)}</td>
        <td>${escapeHTML(prod.marca)}</td>
        <td>
          <span class="stock-chip ${stockClass}">${prod.stock}</span>
          <button title="Restar stock" class="action-btn action-btn--stock-down" data-action="stockdown"><span class="material-icons">remove</span></button>
          <button title="Sumar stock" class="action-btn action-btn--stock-up" data-action="stockup"><span class="material-icons">add</span></button>
          <input class="edit-field edit-stock" type="number" value="${prod.stock}" min="0" max="9999" style="display:none;" />
        </td>
        <td>
          <span class="costo-value">${parseFloat(prod.costo).toFixed(2)}</span>
          <input class="edit-field edit-costo" type="number" value="${prod.costo}" min="0" max="99999" step="0.01" style="display:none;" />
        </td>
        <td>
          <span class="precio-value">${parseFloat(prod.precio).toFixed(2)}</span>
          <input class="edit-field edit-precio" type="number" value="${prod.precio}" min="0" max="99999" step="0.01" style="display:none;" />
        </td>
        <td>
          <span class="ganancia-chip">${(prod.precio - prod.costo).toFixed(2)}</span>
        </td>
        <td>
          <button class="action-btn action-btn--edit" title="Editar" aria-label="Editar" data-action="edit" tabindex="0">
            <span class="material-icons" style="font-size:19px;">edit</span>
          </button>
          <button class="action-btn action-btn--save" title="Guardar" aria-label="Guardar" data-action="save" style="display:none;">
            <span class="material-icons" style="font-size:19px;">check</span>
          </button>
          <button class="action-btn action-btn--delete" title="Eliminar" aria-label="Eliminar" data-action="delete" tabindex="0">
            <span class="material-icons" style="font-size:20px;">delete</span>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    setActiveFilter();
    document.getElementById('loading-indicator').style.display = 'none';
  }, 150);
}
// --------------- ACCIONES TABLA
let deleteIdx = null;
document.getElementById('product-list').addEventListener('click', function(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const idx = tr.getAttribute('data-index');
  const actionBtn = e.target.closest('.action-btn');
  if (!actionBtn) return;
  const action = actionBtn.dataset.action;

  // EDITAR
  if (action === 'edit') {
    tr.setAttribute('data-edit', 'true');
    toggleEditFields(tr, true);
  }
  // GUARDAR
  else if (action === 'save') {
    const stockInput = tr.querySelector('.edit-stock');
    const costoInput = tr.querySelector('.edit-costo');
    const precioInput = tr.querySelector('.edit-precio');
    const stock = parseInt(stockInput.value);
    const costo = parseFloat(costoInput.value);
    const precio = parseFloat(precioInput.value);
    if ([stock, costo, precio].some(val => isNaN(val) || val < 0)) {
      alert('Valores inválidos.');
      return;
    }
    const products = getProducts();
    const allProducts = products; // se mantiene index correcto porque render respeta orden de filtro
    const filtered = getProductsFiltered();
    const prodIndex = getIndexFromFiltered(idx, filtered, allProducts);
    if(prodIndex!==-1) {
      products[prodIndex].stock = stock;
      products[prodIndex].costo = costo;
      products[prodIndex].precio = precio;
      saveProducts(products);
      toggleEditFields(tr, false);
      tr.removeAttribute('data-edit');
      renderProducts();
    }
  }
  // ELIMINAR
  else if (action === 'delete') {
    // Obtener index real
    const products = getProducts();
    const allProducts = products;
    const filtered = getProductsFiltered();
    deleteIdx = getIndexFromFiltered(idx, filtered, allProducts);
    showModal(true);
  }
  // + STOCK
  else if (action === 'stockup') {
    const products = getProducts();
    const allProducts = products;
    const filtered = getProductsFiltered();
    const prodIndex = getIndexFromFiltered(idx, filtered, allProducts);
    if(prodIndex!==-1){
      products[prodIndex].stock++;
      saveProducts(products);
      renderProducts();
    }
  }
  // - STOCK
  else if (action === 'stockdown') {
    const products = getProducts();
    const allProducts = products;
    const filtered = getProductsFiltered();
    const prodIndex = getIndexFromFiltered(idx, filtered, allProducts);
    if(prodIndex!==-1 && products[prodIndex].stock>0){
      products[prodIndex].stock--;
      saveProducts(products);
      renderProducts();
    }
  }
});
function getProductsFiltered(){
  let prods = getProducts();
  if(currentFilter==='low') prods = prods.filter(p=>p.stock>0 && p.stock<=5);
  else if(currentFilter==='zero') prods = prods.filter(p=>p.stock<=0);
  if(searchQuery.length>0){
    prods = prods.filter(p =>
      p.nombre.toLowerCase().includes(searchQuery) ||
      p.marca.toLowerCase().includes(searchQuery)
    );
  }
  return prods;
}
function getIndexFromFiltered(idx, filtered, allProducts){
  const f = filtered[idx];
  if(!f) return -1;
  return allProducts.findIndex(p =>
    p.nombre === f.nombre && p.marca === f.marca &&
    p.costo === f.costo && p.precio === f.precio
  );
}
document.getElementById('product-list').addEventListener('keydown', function(e){
  const tr = e.target.closest('tr');
  if (!tr || tr.getAttribute('data-edit')!=='true') return;
  if (e.key === 'Enter') {
    const saveBtn = tr.querySelector('.action-btn--save');
    if (saveBtn) saveBtn.click();
  }
});
function toggleEditFields(tr, enable) {
  tr.querySelector('.edit-stock').style.display = enable?'':'none';
  tr.querySelector('.edit-costo').style.display = enable?'':'none';
  tr.querySelector('.edit-precio').style.display = enable?'':'none';
  tr.querySelector('.action-btn--edit').style.display = enable?'none':'inline-flex';
  tr.querySelector('.action-btn--save').style.display = enable?'inline-flex':'none';
}
// --------------- MODAL ELIMINAR
function showModal(show) {
  document.getElementById('modal-backdrop').style.display = show ? 'flex' : 'none';
  if (show) { document.querySelector('.modal-confirm').focus(); }
}
document.querySelector('.modal-cancel').onclick = () => {
  showModal(false); deleteIdx = null;
};
document.querySelector('.modal-confirm').onclick = () => {
  const products = getProducts();
  if (deleteIdx !== null && products[deleteIdx]) {
    products.splice(deleteIdx, 1);
    saveProducts(products);
    renderProducts();
  }
  showModal(false); deleteIdx = null;
};
window.addEventListener('keydown', function(e){
  if ((e.key === 'Escape' || e.key === 'Esc') && document.getElementById('modal-backdrop').style.display === 'flex') {
    showModal(false); deleteIdx = null;
  }
});
// --------------- AGREGAR PRODUCTO
document.getElementById('product-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const marca = document.getElementById('marca').value.trim();
  const stock = parseInt(document.getElementById('stock').value);
  const costo = parseFloat(document.getElementById('costo').value);
  const precio = parseFloat(document.getElementById('precio').value);

  if (!nombre || !marca || isNaN(stock) || isNaN(costo) || isNaN(precio)) return;
  // No permitir productos duplicados por nombre + marca
  const products = getProducts();
  if (products.some(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.marca.toLowerCase() === marca.toLowerCase())) {
    alert('Ya existe un producto con ese nombre y marca.');
    return;
  }
  products.push({ nombre, marca, stock, costo, precio });
  saveProducts(products);
  renderProducts();
  this.reset();
  document.getElementById('nombre').focus();
});
// --------------- EXPORTAR CSV
function toCSVLine(vals) {
  return vals.map(v => `"${(v+'').replaceAll('"', '""')}"`).join(',');
}
function exportToCSV() {
  let csv = 'Nombre,Marca,Stock,Costo,Precio,Ganancia\n';
  const filtered = getProductsFiltered();
  filtered.forEach(p => {
    csv += toCSVLine([
      p.nombre, p.marca, p.stock, p.costo.toFixed(2), p.precio.toFixed(2), (p.precio-p.costo).toFixed(2)
    ])+'\n';
  });
  const blob = new Blob([csv],{type:'text/csv'});
  const link = document.createElement('a');
  link.href= URL.createObjectURL(blob);
  link.download = 'inventario.csv';
  document.body.appendChild(link);
  link.click();
  setTimeout(()=>{document.body.removeChild(link);},100);
}
document.getElementById('export-csv').onclick = exportToCSV;

// --------------- IMPORTAR CSV
document.getElementById('import-csv').addEventListener('change', function(e){
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt){
    const csv = evt.target.result;
    let rows = csv.trim().split('\n');
    let headers = rows.shift().split(',').map(h=>h.trim().toLowerCase());
    const expectedHeaders = ['nombre','marca','stock','costo','precio'];
    if (!expectedHeaders.every((h,i)=>headers[i]&&headers[i].startsWith(h))) {
      showImportFeedback('¡El CSV debe contener columnas: Nombre, Marca, Stock, Costo y Precio en ese orden!');
      return;
    }
    let imported = [];
    for (let i=0;i<rows.length;i++){
      const cols = rows[i].split(',');
      if (cols.length < 5) continue;
      let [nombre,marca,stock,costo,precio] = cols.map(s=>s.replaceAll('"','').trim());
      stock = parseInt(stock);
      costo = parseFloat(costo);
      precio = parseFloat(precio);
      if(!nombre || !marca || isNaN(stock) || isNaN(costo) || isNaN(precio)) continue;
      imported.push({nombre,marca,stock,costo,precio});
    }
    if (imported.length===0) {
      showImportFeedback('No se pudieron importar productos válidos.');
      return;
    }
    // No duplicados
    let products = getProducts();
    imported = imported.filter(nuevo=>!products.some(p=>p.nombre.toLowerCase()===nuevo.nombre.toLowerCase() && p.marca.toLowerCase()===nuevo.marca.toLowerCase()));
    products = products.concat(imported);
    saveProducts(products);
    renderProducts();
    showImportFeedback(`${imported.length} productos importados con éxito.`, true);
  };
  reader.readAsText(file);
});
function showImportFeedback(msg, ok=false){
  const div = document.getElementById('import-feedback');
  div.textContent = msg;
  div.style.display = 'block';
  div.style.color = ok ? 'var(--success)' : 'var(--danger)';
  setTimeout(()=>{div.style.display = 'none';},3600);
}

// --------------- INICIALIZAR
renderProducts();
setActiveFilter();
// Atajo: '/' enfoca buscador
window.addEventListener('keydown', function(e){
  if(e.key === '/' && document.activeElement.tagName !== 'INPUT'){
    e.preventDefault();
    document.getElementById('buscador').focus();
  }
});
