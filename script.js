const GITHUB_JSON_URL =
  "https://dioragao.github.io/Carticas/miColeccion.json?ts=" + Date.now();

document.addEventListener("DOMContentLoaded", () => {

  const loginOverlay = document.getElementById("loginOverlay");
  const mainContent = document.getElementById("mainContent");
  const loginBtn = document.getElementById("loginBtn");
  const loginPassword = document.getElementById("loginPassword");
  const loginError = document.getElementById("loginError");

  const PASSWORD = "mmmmm";

  loginBtn.addEventListener("click", () => {
    if (loginPassword.value === PASSWORD) {
      loginOverlay.style.display = "none";
      mainContent.style.display = "block";
      iniciarWeb();   // 👈 SOLO esto
    } else {
      loginError.style.display = "block";
    }
  });

  loginPassword.addEventListener("keypress", e => {
    if (e.key === "Enter") loginBtn.click();
  });



  async function iniciarWeb() {

    const container = document.getElementById("cards");
    const contador = document.getElementById("contador");
    const filtroTengo = document.getElementById("filtroTengo");
    const filtroNoTengo = document.getElementById("filtroNoTengo");
    const filtroFoil = document.getElementById("filtroFoil");
    const filtroNoFoil = document.getElementById("filtroNoFoil");
    const ordenarBtn = document.getElementById("ordenarBtn");
    const selectorTierra = document.getElementById("selectorTierra");
    const btnTierra = document.getElementById("btnTierra");
    const btnToken = document.getElementById("btnToken");
    const candadoBtn = document.getElementById("candadoBtn");
    const spinner = document.getElementById("spinner");
    const scrollBtn = document.getElementById("scrollTopBtn");
    const btnModoBorrar = document.getElementById("btnModoBorrar");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const syncGithubBtn = document.getElementById("syncGithubBtn");

    let owned = JSON.parse(localStorage.getItem("ownedCards") || "{}");
    let todasCartas = [], ordenAscendente = true, tierraSeleccionada = selectorTierra.value;
    let pestañaActiva = "tierra", marcadoBloqueado = false, modoBorrar = false;
    let cartasMostradas = 0, LOTE = 30;

    // --- Cargar colección desde GitHub ---
    async function cargarColeccionGitHub() {
      try {
        const res = await fetch(GITHUB_JSON_URL);
        if (!res.ok) throw new Error("Error al descargar JSON");
        const data = await res.json();
        owned = data;
        localStorage.setItem("ownedCards", JSON.stringify(owned));
      } catch (e) {
        console.log("No se pudo cargar la colección desde GitHub");
      }
    }

    // --- Sincronizar desde GitHub ---
    syncGithubBtn.addEventListener("click", async () => {
      const confirmar = confirm(
        "Esto sobrescribirá la colección guardada en este dispositivo.\n\n" +
        "Se cargará la colección desde GitHub.\n\n¿Deseas continuar?"
      );
      if (!confirmar) return;

      await cargarColeccionGitHub();
      mostrarCartasFiltradas();
    });

    // --- Importar y Exportar ---
    function exportarColeccion() {
      const dataStr = JSON.stringify(owned, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "miColeccion.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    function importarColeccion() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          owned = JSON.parse(reader.result);
          localStorage.setItem("ownedCards", JSON.stringify(owned));
          mostrarCartasFiltradas(cartasMostradas);
        };
        reader.readAsText(file);
      });
      input.click();
    }

    exportBtn.addEventListener("click", exportarColeccion);
    importBtn.addEventListener("click", importarColeccion);

    // --- Funciones de cartas ---
    async function cargarCartas(url) {
      const res = await fetch(url);
      const data = await res.json();
      data.data.forEach(c => { if (!c.image_uris) return; todasCartas.push(c); });
      if (data.has_more) await cargarCartas(data.next_page);
    }

    function actualizarContador() {
      const totalTodasCartas = todasCartas.length;
      let tengo = 0;
      todasCartas.forEach(c => { if (owned[c.id]) tengo++; });
      const faltan = totalTodasCartas - tengo;
      const porcentaje = totalTodasCartas === 0 ? 0 : ((tengo / totalTodasCartas) * 100).toFixed(1);
      let nombreCartas = pestañaActiva === "token" ? "Tokens" : `${tierraSeleccionada}s`;
      contador.textContent = `Tengo ${tengo} de ${totalTodasCartas} ${nombreCartas} (${faltan} me faltan, ${porcentaje}%)`;
    }

    function mostrarCartasFiltradas(limite = LOTE) {
      container.innerHTML = "";
      let cartasParaMostrar = [...todasCartas];
      cartasParaMostrar.sort((a, b) => ordenAscendente ? (new Date(a.released_at) - new Date(b.released_at)) : (new Date(b.released_at) - new Date(a.released_at)));
      cartasMostradas = 0;

      for (let card of cartasParaMostrar) {
        if (cartasMostradas >= limite) break;
        if (!card.image_uris) continue;
        const id = card.id, isOwned = owned[id];

        if (filtroTengo.checked && !isOwned) continue;
        if (filtroNoTengo.checked && isOwned) continue;
        if (filtroFoil.checked && !card.foil) continue;
        if (filtroNoFoil.checked && card.foil) continue;

        const div = document.createElement("div");
        div.className = "card" + (isOwned ? " owned" : "");
        if (modoBorrar) div.classList.add("seleccionable");

        div.innerHTML = `
          ${card.foil ? '<span class="foil-star">★</span><div class="foil-brillo"></div>' : ''}
          <img src="${card.image_uris.normal}" alt="${pestañaActiva==='token'?'Token':tierraSeleccionada}">
          <h3>${card.set_name}</h3>
          <p>${card.released_at}</p>
          <label><input type="checkbox" ${isOwned ? "checked" : ""}> La tengo</label>
        `;

        const checkbox = div.querySelector("input");
        checkbox.addEventListener("change", () => {
          if (marcadoBloqueado) { checkbox.checked = !checkbox.checked; return; }
          owned[id] = checkbox.checked;
          localStorage.setItem("ownedCards", JSON.stringify(owned));
          mostrarCartasFiltradas(cartasMostradas);
        });

        if (modoBorrar) {
          div.addEventListener("click", () => {
            if (confirm(`¿Seguro que quieres borrar "${card.name}"?`)) {
              todasCartas = todasCartas.filter(c => c.id !== card.id);
              delete owned[card.id];
              localStorage.setItem("ownedCards", JSON.stringify(owned));
              modoBorrar = false;
              btnModoBorrar.textContent = "🗑️ Borrar carta";
              mostrarCartasFiltradas(cartasMostradas);
            }
          });
        }

        container.appendChild(div);
        cartasMostradas++;
      }

      actualizarContador();
    }

    async function cargarNuevaTierra() {
      spinner.style.display = "block"; container.innerHTML = "";
      todasCartas = []; cartasMostradas = 0;
      const url = `https://api.scryfall.com/cards/search?q=name:${tierraSeleccionada}+type:basic&unique=prints&order=released`;
      await cargarCartas(url);
      mostrarCartasFiltradas();
      spinner.style.display = "none";
    }

    async function cargarTokens() {
      spinner.style.display = "block"; container.innerHTML = "";
      todasCartas = []; cartasMostradas = 0;
      const url = `https://api.scryfall.com/cards/search?q=type:token&unique=prints&order=released`;
      await cargarCartas(url);
      mostrarCartasFiltradas();
      spinner.style.display = "none";
    }

    // --- Event listeners ---
    [filtroTengo,filtroNoTengo,filtroFoil,filtroNoFoil].forEach(f => f.addEventListener("change", () => mostrarCartasFiltradas(cartasMostradas)));
    ordenarBtn.addEventListener("click", () => { ordenAscendente = !ordenAscendente; ordenarBtn.textContent = ordenAscendente ? "Orden: Ascendente" : "Orden: Descendente"; mostrarCartasFiltradas(cartasMostradas); });
    selectorTierra.addEventListener("change", () => { tierraSeleccionada = selectorTierra.value; document.querySelector("h1").textContent = `${tierraSeleccionada} – Magic the Gathering`; cargarNuevaTierra(); });
    btnTierra.addEventListener("click", () => { pestañaActiva = "tierra"; btnTierra.classList.add("active"); btnToken.classList.remove("active"); cargarNuevaTierra(); });
    btnToken.addEventListener("click", () => { pestañaActiva = "token"; btnToken.classList.add("active"); btnTierra.classList.remove("active"); cargarTokens(); });
    candadoBtn.addEventListener("click", () => { marcadoBloqueado = !marcadoBloqueado; candadoBtn.textContent = marcadoBloqueado ? "🔒" : "🔓"; });
    scrollBtn.addEventListener("click", () => { window.scrollTo({top:0,behavior:'smooth'}); });
    window.addEventListener("scroll", () => {
      if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 100){
        mostrarCartasFiltradas(cartasMostradas + LOTE);
      }
      scrollBtn.style.display = (window.scrollY>200) ? "block" : "none";
    });
    btnModoBorrar.addEventListener("click", () => { modoBorrar = !modoBorrar; btnModoBorrar.textContent = modoBorrar ? "Cancelar borrar" : "🗑️ Borrar carta"; mostrarCartasFiltradas(cartasMostradas); });

    // --- Formulario añadir carta ---
    document.getElementById("btnAgregarCarta").addEventListener("click", async (e) => {
      e.preventDefault();
      const nombre = document.getElementById("nombreCarta").value.trim();
      const set = document.getElementById("setCarta").value.trim();
      const fecha = document.getElementById("fechaCarta").value;
      const foil = document.getElementById("esFoil").checked;
      const url = document.getElementById("urlImagen").value.trim();
      const fileInput = document.getElementById("fileImagen");

      if(!nombre || !set || !fecha || (!url && !fileInput.files.length)){ alert("Rellena todos los campos o sube una imagen"); return; }

      let imageSrc = "";
      if(fileInput.files.length>0){
        const file = fileInput.files[0];
        imageSrc = await new Promise(resolve=>{
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      } else imageSrc = url;

      const nuevaCarta = { id:"carta"+Date.now(), name:nombre, set_name:set, released_at:fecha, foil:foil, image_uris:{ normal:imageSrc } };
      todasCartas.push(nuevaCarta);
      mostrarCartasFiltradas(cartasMostradas);

      document.getElementById("nombreCarta").value = "";
      document.getElementById("setCarta").value = "";
      document.getElementById("fechaCarta").value = "";
      document.getElementById("urlImagen").value = "";
      document.getElementById("fileImagen").value = "";
      document.getElementById("esFoil").checked = false;
    });

    // --- Inicialización ---
    if (Object.keys(owned).length === 0) await cargarColeccionGitHub();
    cargarNuevaTierra();
  }
});
