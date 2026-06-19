/* ==========================================================================
   0. CONFIGURAÇÃO DO FIREBASE (BACK-END)
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2sPFZTSoayC_9pr_VUVQ3C3WtU_tQCkc",
  authDomain: "webpasseios.firebaseapp.com",
  projectId: "webpasseios",
  storageBucket: "webpasseios.firebasestorage.app",
  messagingSenderId: "112124754333",
  appId: "1:112124754333:web:be6f12e0f17b551b1c1774"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ==========================================================================
   0.1 UTILITÁRIO: ESCAPE DE HTML (evita XSS em conteúdo vindo do Firestore)
   ========================================================================== */
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================================
   1. GERENCIAMENTO DE TEMA (DARK / LIGHT MODE)
   ========================================================================== */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}
window.toggleTheme = toggleTheme; 

/* ==========================================================================
   1.1 MENU HAMBÚRGUER (MOBILE)
   ========================================================================== */
function setupNavToggle() {
    const toggleBtn = document.getElementById("nav-toggle");
    const navLinks = document.getElementById("nav-links");
    const authContainer = document.getElementById("auth-container");
    const overlay = document.getElementById("nav-overlay");

    if (!toggleBtn || !navLinks || !overlay) return;

    function openMenu() {
        toggleBtn.classList.add("is-active");
        navLinks.classList.add("is-active");
        if (authContainer) authContainer.classList.add("is-active");
        overlay.classList.add("is-active");
        toggleBtn.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
    }

    function closeMenu() {
        toggleBtn.classList.remove("is-active");
        navLinks.classList.remove("is-active");
        if (authContainer) authContainer.classList.remove("is-active");
        overlay.classList.remove("is-active");
        toggleBtn.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
    }

    toggleBtn.addEventListener("click", () => {
        const isOpen = navLinks.classList.contains("is-active");
        isOpen ? closeMenu() : openMenu();
    });

    overlay.addEventListener("click", closeMenu);

    // Fecha o menu ao clicar em qualquer link de navegação (âncoras)
    navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    // Fecha o menu se a tela for redimensionada para desktop
    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) closeMenu();
    });
}

/* ==========================================================================
   2. GERENCIAMENTO DE ESTADO DE LOGIN (FIREBASE AUTH)
   ========================================================================== */
function setupAuthListener() {
    const btnLogin = document.getElementById("nav-btn-login");
    const userProfile = document.getElementById("nav-user-profile");
    const userEmailDisplay = document.getElementById("nav-user-email");
    const btnLogout = document.getElementById("nav-btn-logout");

    onAuthStateChanged(auth, (user) => {
        if (!btnLogin || !userProfile || !userEmailDisplay) return;

        if (user) {
            btnLogin.style.display = "none";
            userProfile.style.display = "flex";
            userEmailDisplay.textContent = user.email; 
        } else {
            btnLogin.style.display = "inline-block";
            userProfile.style.display = "none";
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            signOut(auth).then(() => window.location.reload());
        });
    }
}

/* ==========================================================================
   3. INICIALIZAÇÃO GERAL
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    setupAuthListener();
    setupNavToggle();
    setupContactForm();
    setupCheckoutPage();
    setupProfilePage();
    carregarPacotesAdmin();    // Para o Dashboard
    carregarPacotesVitrine();  // Para o Index (Pública)
});

/* ==========================================================================
   4.1 FORMULÁRIO DE CONTATO (FALE CONOSCO)
   ========================================================================== */
function setupContactForm() {
    const form = document.getElementById("form-contato");
    if (!form) return;

    const feedbackSuccess = document.getElementById("contato-feedback-success");
    const feedbackError = document.getElementById("contato-feedback-error");
    const nomeInput = document.getElementById("nome-contato");
    const emailInput = document.getElementById("email-contato");
    const telefoneInput = document.getElementById("telefone-contato");

    function hideFeedback() {
        feedbackSuccess.classList.remove("is-visible");
        feedbackError.classList.remove("is-visible");
    }

    function markInvalid(input, invalid) {
        input.classList.toggle("is-invalid", invalid);
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        hideFeedback();

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
        const telefoneValido = telefoneInput.value.trim().replace(/\D/g, "").length >= 8;
        const nomeValido = nomeInput.value.trim().length >= 2;

        markInvalid(nomeInput, !nomeValido);
        markInvalid(emailInput, !emailValido);
        markInvalid(telefoneInput, !telefoneValido);

        if (!nomeValido || !emailValido || !telefoneValido) {
            feedbackError.classList.add("is-visible");
            feedbackError.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        // Sem backend: apenas confirma visualmente o envio para o usuário.
        feedbackSuccess.classList.add("is-visible");
        form.reset();
        [nomeInput, emailInput, telefoneInput].forEach((input) => markInvalid(input, false));
        feedbackSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Remove o destaque de erro assim que o usuário corrige o campo
    [nomeInput, emailInput, telefoneInput].forEach((input) => {
        input.addEventListener("input", () => markInvalid(input, false));
    });
}

/* ==========================================================================
   4. AUTENTICAÇÃO: REGISTRO E LOGIN
   ========================================================================== */
const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const email = document.getElementById('email-registro').value;
        const senha = document.getElementById('senha-registro').value;

        createUserWithEmailAndPassword(auth, email, senha)
            .then(() => {
                alert("Conta criada! Redirecionando...");
                window.location.href = "login.html"; 
            })
            .catch((error) => alert("Erro: " + error.message));
    });
}

const formLogin = document.getElementById('form-login');
const adminEmail = "lagsalve87@gmail.com"; 

if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const email = document.getElementById('email').value;
        const senha = document.getElementById('password').value;

        signInWithEmailAndPassword(auth, email, senha)
            .then((userCredential) => {
                window.location.href = (userCredential.user.email === adminEmail) ? "dashboard.html" : "../index.html"; 
            })
            .catch(() => alert("E-mail ou senha incorretos."));
    });
}

/* ==========================================================================
   6. LOGOUT DASHBOARD
   ========================================================================== */
const btnLogoutDashboard = document.getElementById("btn-logout-dashboard");
if (btnLogoutDashboard) {
    btnLogoutDashboard.addEventListener("click", () => {
        signOut(auth).then(() => window.location.href = "../index.html");
    });
}

/* ==========================================================================
   7. BANCO DE DADOS: FUNÇÕES ADMIN
   ========================================================================== */
const travelForm = document.getElementById('travel-form');
const adminGrid = document.getElementById('admin-grid');

async function carregarPacotesAdmin() {
    if (!adminGrid) return;
    const querySnapshot = await getDocs(collection(db, "pacotes"));
    adminGrid.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const pacote = doc.data();
        adminGrid.innerHTML += `
            <div class="travel-card admin-card">
                <img src="${escapeHtml(pacote.imagem)}" alt="${escapeHtml(pacote.destino)}" class="card-img">
                <div class="card-content">
                    <h3>${escapeHtml(pacote.destino)}</h3>
                    <p>${escapeHtml(pacote.descricao)}</p>
                    <p>R$ ${parseFloat(pacote.preco).toFixed(2)}</p>
                    <button class="btn-action" onclick="deletarPacote('${doc.id}')">🗑️ Excluir</button>
                </div>
            </div>`;
    });
}

if (travelForm) {
    travelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "pacotes"), {
            destino: document.getElementById('destino').value,
            preco: Number(document.getElementById('preco').value),
            imagem: document.getElementById('imagem-url').value,
            descricao: document.getElementById('descricao').value
        });
        alert("Cadastrado!");
        travelForm.reset();
        carregarPacotesAdmin();
    });
}

window.deletarPacote = async function(id) {
    await deleteDoc(doc(db, "pacotes", id));
    carregarPacotesAdmin();
}

/* ==========================================================================
   8. VITRINE PÚBLICA: CARREGAR PACOTES NO INDEX.HTML
   ========================================================================== */
let pacotesVitrineData = [];

async function carregarPacotesVitrine() {
    const publicGrid = document.getElementById("public-grid");
    if (!publicGrid) return;

    try {
        const querySnapshot = await getDocs(collection(db, "pacotes"));
        publicGrid.innerHTML = '';
        pacotesVitrineData = [];

        querySnapshot.forEach((doc) => {
            const p = doc.data();
            const index = pacotesVitrineData.length;
            pacotesVitrineData.push(p);

            publicGrid.innerHTML += `
                <div class="travel-card">
                    <img src="${escapeHtml(p.imagem)}" alt="${escapeHtml(p.destino)}" class="card-img">
                    <div class="card-content">
                        <h3>${escapeHtml(p.destino)}</h3>
                        <p class="card-desc">${escapeHtml(p.descricao)}</p>
                        <p class="card-price">R$ ${parseFloat(p.preco).toFixed(2)}</p>
                        <button class="form-btn form-btn--submit" style="margin-top: 10px;" onclick="abrirModalPacote(${index})">Tenho Interesse</button>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error("Erro ao carregar vitrine:", e);
    }
}

/* ==========================================================================
   8.1 MODAL DE INTERESSE NO PACOTE
   ========================================================================== */
function garantirModalPacote() {
    if (document.getElementById("pacote-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "pacote-modal-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.55);
        display: none; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
    `;

    overlay.innerHTML = `
        <div id="pacote-modal-box" style="
            background: var(--color-bg, #fff); color: var(--color-text, #222);
            max-width: 420px; width: 100%; border-radius: 14px; overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;
        ">
            <button id="pacote-modal-close" aria-label="Fechar" style="
                position: absolute; top: 10px; right: 12px; background: rgba(0,0,0,0.4);
                color: #fff; border: none; width: 30px; height: 30px; border-radius: 50%;
                font-size: 16px; cursor: pointer; line-height: 1; z-index: 1;
            ">✕</button>

            <img id="pacote-modal-img" src="" alt="" style="width: 100%; height: 220px; object-fit: cover; display: block;">

            <div style="padding: 24px;">
                <h3 id="pacote-modal-titulo" style="margin: 0 0 10px; font-size: 22px;"></h3>
                <p id="pacote-modal-desc" style="margin: 0 0 16px; color: var(--color-placeholder, #666); line-height: 1.5;"></p>
                <p id="pacote-modal-preco" style="font-size: 26px; font-weight: 700; margin: 0 0 20px; color: var(--color-primary);"></p>

                <button id="pacote-modal-btn-contratar" class="form-btn form-btn--submit" style="
                    width: 100%; box-sizing: border-box;
                ">Contratar este pacote</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    function fecharModal() {
        overlay.style.display = "none";
        document.body.style.overflow = "";
    }

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fecharModal();
    });
    overlay.querySelector("#pacote-modal-close").addEventListener("click", fecharModal);
    overlay.querySelector("#pacote-modal-btn-contratar").addEventListener("click", () => {
        const p = pacotesVitrineData[overlay.dataset.indexAtual];
        if (!p) return;
        localStorage.setItem("pacoteSelecionado", JSON.stringify(p));

        // Detecta se estamos na home (raiz) ou em /pages/
        const estaEmPages = window.location.pathname.includes("/pages/");
        window.location.href = (estaEmPages ? "checkout.html" : "pages/checkout.html") + "?pacote=1";
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.style.display === "flex") fecharModal();
    });
}

window.abrirModalPacote = function (index) {
    const p = pacotesVitrineData[index];
    if (!p) return;

    garantirModalPacote();

    const overlay = document.getElementById("pacote-modal-overlay");
    overlay.dataset.indexAtual = index;

    document.getElementById("pacote-modal-img").src = p.imagem || "";
    document.getElementById("pacote-modal-img").alt = p.destino || "";
    document.getElementById("pacote-modal-titulo").textContent = p.destino || "";
    document.getElementById("pacote-modal-desc").textContent = p.descricao || "";
    document.getElementById("pacote-modal-preco").textContent =
        "R$ " + parseFloat(p.preco || 0).toFixed(2);

    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
};

/* ==========================================================================
   9. CHECKOUT: ASSINATURA DE PLANOS
   ========================================================================== */
const PLANOS = {
    essencial: {
        nome: "Plano Essencial",
        desc: "Para quem ama explorar com liberdade",
        preco: 999,
    },
    conforto: {
        nome: "Plano Conforto",
        desc: "O equilíbrio perfeito para suas férias",
        preco: 1599,
    },
    vip: {
        nome: "Plano VIP Premium",
        desc: "A experiência definitiva sem preocupações",
        preco: 2499,
    },
};

function formatarPreco(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function setupCheckoutPage() {
    const checkoutForm = document.getElementById("checkout-form");
    if (!checkoutForm) return; // Não estamos na página de checkout

    const params = new URLSearchParams(window.location.search);
    const planoId = params.get("plano");
    const ehPacote = params.get("pacote") === "1";

    let item; // objeto genérico { nome, desc, preco, tipo, idOriginal, imagem }

    if (ehPacote) {
        const dados = JSON.parse(localStorage.getItem("pacoteSelecionado") || "null");
        if (dados) {
            item = {
                nome: dados.destino,
                desc: dados.descricao,
                preco: parseFloat(dados.preco) || 0,
                tipo: "pacote",
                imagem: dados.imagem || "",
            };
        }
    }

    // Se não veio pacote válido, cai no fluxo padrão de planos (assinatura)
    if (!item) {
        const plano = PLANOS[planoId] || PLANOS.conforto;
        item = {
            nome: plano.nome,
            desc: plano.desc,
            preco: plano.preco,
            tipo: "plano",
            planoId: Object.keys(PLANOS).includes(planoId) ? planoId : "conforto",
        };
    }

    // Preenche o resumo do pedido
    document.getElementById("summary-nome").textContent = item.nome;
    document.getElementById("summary-desc").textContent = item.desc;
    document.getElementById("summary-preco").textContent =
        formatarPreco(item.preco) + (item.tipo === "plano" ? "/ano" : "");
    document.getElementById("summary-subtotal").textContent = formatarPreco(item.preco);
    document.getElementById("summary-total").textContent = formatarPreco(item.preco);

    // Ajusta os rótulos da seção "Assinatura anual" quando for compra de pacote avulso
    const linhaResumo = document.querySelector(".checkout-summary-row span:first-child");
    if (linhaResumo && item.tipo === "pacote") {
        linhaResumo.textContent = "Pacote selecionado";
    }

    // Alternância de método de pagamento
    const methodButtons = document.querySelectorAll(".payment-method-option");
    const cardFields = document.getElementById("card-fields");
    const pixInfo = document.getElementById("pix-info");
    const boletoInfo = document.getElementById("boleto-info");
    let metodoSelecionado = "cartao";

    methodButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            methodButtons.forEach((b) => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");
            metodoSelecionado = btn.dataset.method;

            cardFields.style.display = metodoSelecionado === "cartao" ? "block" : "none";
            pixInfo.style.display = metodoSelecionado === "pix" ? "block" : "none";
            boletoInfo.style.display = metodoSelecionado === "boleto" ? "block" : "none";

            // Campos do cartão só são obrigatórios quando o método é cartão
            const cardInputs = cardFields.querySelectorAll(".input-field");
            cardInputs.forEach((input) => {
                input.required = metodoSelecionado === "cartao";
            });
        });
    });

    // Máscara simples de validade MM/AA
    const validadeInput = document.getElementById("card-validade");
    if (validadeInput) {
        validadeInput.addEventListener("input", () => {
            let v = validadeInput.value.replace(/\D/g, "").slice(0, 4);
            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
            validadeInput.value = v;
        });
    }

    const feedbackError = document.getElementById("checkout-feedback-error");

    checkoutForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        feedbackError.classList.remove("is-visible");

        if (metodoSelecionado === "cartao" && !checkoutForm.checkValidity()) {
            feedbackError.classList.add("is-visible");
            feedbackError.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        const submitBtn = checkoutForm.querySelector("button[type=submit]");
        const textoOriginal = submitBtn.textContent;
        submitBtn.textContent = "Processando...";
        submitBtn.disabled = true;

        const user = auth.currentUser;

        try {
            // Se o usuário estiver logado, registra a viagem/pacote contratado no perfil dele
            if (user) {
                await addDoc(collection(db, "viagens"), {
                    userId: user.uid,
                    userEmail: user.email,
                    tipo: item.tipo,
                    planoId: item.tipo === "plano" ? item.planoId : null,
                    planoNome: item.nome,
                    planoDesc: item.desc,
                    preco: item.preco,
                    metodoPagamento: metodoSelecionado,
                    status: "confirmada",
                    criadoEm: serverTimestamp(),
                });
            }

            if (item.tipo === "pacote") {
                localStorage.removeItem("pacoteSelecionado");
            }

            document.getElementById("checkout-content").style.display = "none";
            const successBox = document.getElementById("checkout-success");
            const successText = document.getElementById("checkout-success-text");
            if (!user) {
                successText.textContent = "Compra confirmada! Faça login para acompanhar na aba “Viagens Contratadas” do seu perfil.";
            }
            successBox.style.display = "block";
            successBox.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
            console.error("Erro ao confirmar assinatura:", err);
            submitBtn.textContent = textoOriginal;
            submitBtn.disabled = false;
            feedbackError.querySelector("span:last-child").textContent =
                "Não foi possível confirmar sua compra agora. Tente novamente.";
            feedbackError.classList.add("is-visible");
        }
    });
}

/* ==========================================================================
   10. PERFIL DO USUÁRIO: VIAGENS CONTRATADAS
   ========================================================================== */
function setupProfilePage() {
    const profileContent = document.getElementById("profile-content");
    const profileGuard = document.getElementById("profile-guard");
    if (!profileContent || !profileGuard) return; // Não estamos na página de perfil

    // Abas (Viagens Contratadas / Meus Dados)
    const tabButtons = document.querySelectorAll(".profile-tab-btn");
    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabButtons.forEach((b) => b.classList.remove("is-active"));
            document.querySelectorAll(".profile-tab-panel").forEach((p) => p.classList.remove("is-active"));
            btn.classList.add("is-active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("is-active");
        });
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            profileGuard.style.display = "block";
            profileContent.style.display = "none";
            return;
        }

        profileGuard.style.display = "none";
        profileContent.style.display = "block";

        // Cabeçalho do perfil
        const inicial = user.email ? user.email.charAt(0).toUpperCase() : "U";
        document.getElementById("profile-avatar").textContent = inicial;
        document.getElementById("profile-name").textContent = user.email;
        document.getElementById("profile-email").textContent = user.email;

        // Aba "Meus Dados"
        document.getElementById("dados-nome").textContent = user.displayName || user.email.split("@")[0];
        document.getElementById("dados-email").textContent = user.email;
        document.getElementById("dados-criado").textContent = user.metadata?.creationTime
            ? new Date(user.metadata.creationTime).toLocaleDateString("pt-BR")
            : "—";

        await carregarViagensContratadas(user.uid);
    });
}

async function carregarViagensContratadas(uid) {
    const loading = document.getElementById("trips-loading");
    const empty = document.getElementById("trips-empty");
    const list = document.getElementById("trips-list");

    try {
        const q = query(collection(db, "viagens"), where("userId", "==", uid));
        const snapshot = await getDocs(q);

        loading.style.display = "none";

        if (snapshot.empty) {
            empty.style.display = "block";
            list.innerHTML = "";
            return;
        }

        empty.style.display = "none";

        // Ordena no client (evita exigir índice composto no Firestore)
        const viagens = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));

        list.innerHTML = viagens
            .map((v) => {
                const data = v.criadoEm?.seconds
                    ? new Date(v.criadoEm.seconds * 1000).toLocaleDateString("pt-BR")
                    : "Data indisponível";
                return `
                    <div class="trip-card">
                        <div class="trip-card-body">
                            <span class="trip-status">${escapeHtml(v.status || "confirmada")}</span>
                            <h3>${escapeHtml(v.planoNome)}</h3>
                            <p class="card-desc">${escapeHtml(v.planoDesc || "")}</p>
                            <div class="trip-card-meta">
                                <span>📅 Contratado em ${data}</span>
                                <span>💳 ${escapeHtml(formatarMetodoPagamento(v.metodoPagamento))}</span>
                                <span>💰 ${formatarPreco(v.preco || 0)}</span>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");
    } catch (e) {
        console.error("Erro ao carregar viagens contratadas:", e);
        loading.textContent = "Não foi possível carregar suas viagens agora. Tente recarregar a página.";
    }
}

function formatarMetodoPagamento(metodo) {
    const nomes = { cartao: "Cartão de crédito", pix: "Pix", boleto: "Boleto" };
    return nomes[metodo] || "Não informado";
}
