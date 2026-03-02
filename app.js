import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD_QSgu2NVX9MBVHtYwtmmnp6Jiq-rgCGo",
    authDomain: "oiahrf072.firebaseapp.com",
    projectId: "oiahrf072",
    storageBucket: "oiahrf072.firebasestorage.app",
    messagingSenderId: "708593405417",
    appId: "1:708593405417:web:0e15ce6d06c8bd8f918f78"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const produtosRef = collection(db, "produtos");
const configDoc = doc(db, "configuracoes", "horarios");

let produtosLocal = [];
let carrinho = [];
let configSemana = [];
const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TELEFONE = "5513988250532";

// --- GESTÃO DE HORÁRIOS (ADMIN) ---
async function carregarHorarios() {
    try {
        const snap = await getDoc(configDoc);
        if (snap.exists() && snap.data().grade) {
            configSemana = snap.data().grade;
        } else {
            configSemana = diasSemana.map(dia => ({ dia, abre: "18:00", fecha: "23:00", fechado: false }));
        }
        renderGradeAdmin();
        verificarStatus();
    } catch (e) { console.error("Erro ao carregar horários:", e); }
}

function renderGradeAdmin() {
    const container = document.getElementById('grade-horarios');
    if (!container) return;
    container.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between text-[11px] border-b py-2">
            <span class="w-16 font-bold uppercase">${h.dia}</span>
            <input type="time" value="${h.abre || '18:00'}" onchange="updateH(${i},'abre',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <input type="time" value="${h.fecha || '23:00'}" onchange="updateH(${i},'fecha',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <input type="checkbox" ${h.fechado ? 'checked' : ''} onchange="updateH(${i},'fechado',this.checked)"> Folga
        </div>
    `).join('');
}

window.updateH = (i, campo, valor) => {
    configSemana[i][campo] = valor;
    renderGradeAdmin();
};

window.salvarHorariosSemana = async () => {
    try {
        await setDoc(configDoc, { grade: configSemana });
        alert("✅ Horários salvos!");
        location.reload();
    } catch (e) { alert("Erro ao salvar horários!"); }
};

// --- STATUS DA LOJA ---
function verificarStatus() {
    const agora = new Date();
    const diaIdx = agora.getDay();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');
    const hoje = configSemana[diaIdx] || { abre: "18:00", fecha: "23:00", fechado: true };
    const aberta = !hoje.fechado && (horaAtual >= hoje.abre && horaAtual <= hoje.fecha);

    const elStatus = document.getElementById('loja-status-header');
    if (elStatus) {
        elStatus.innerHTML = aberta 
            ? `<span class="text-green-600 font-bold text-[10px]">● ABERTO</span>` 
            : `<span class="text-red-600 font-bold text-[10px]">○ FECHADO</span>`;
    }
    return aberta;
}

// --- GESTÃO DE PRODUTOS (SALVAR/EDITAR) ---
const form = document.getElementById('form-produto');
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const btn = document.getElementById('btn-submit');
        
        const dados = {
            nome: document.getElementById('nome').value,
            descricao: document.getElementById('descricao').value,
            preco: parseFloat(document.getElementById('preco').value),
            precoPromo: parseFloat(document.getElementById('precoPromo').value) || 0,
            imagem: document.getElementById('img-preview').src || "",
            emEstoque: document.getElementById('emEstoque').checked
        };

        try {
            if(btn) btn.innerText = "Salvando...";
            if (!id) await addDoc(produtosRef, dados);
            else await updateDoc(doc(db, "produtos", id), dados);
            alert("✅ Produto salvo!");
            location.reload();
        } catch (err) { alert("Erro ao salvar produto!"); }
    };
}

// Lógica de Preview de Imagem
const inputImg = document.getElementById('imagemFile');
if (inputImg) {
    inputImg.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = document.getElementById('img-preview');
            img.src = reader.result;
            img.classList.remove('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };
}

// --- CARRINHO DE COMPRAS ---
window.adicionarAoCarrinho = (id, nome, preco) => {
    const item = carrinho.find(c => c.id === id);
    if (item) item.qtd++;
    else carrinho.push({ id, nome, preco, qtd: 1 });
    atualizarInterface();
};

window.removerDoCarrinho = (id) => {
    const idx = carrinho.findIndex(c => c.id === id);
    if (idx !== -1) {
        carrinho[idx].qtd--;
        if (carrinho[idx].qtd <= 0) carrinho.splice(idx, 1);
    }
    atualizarInterface();
};

function atualizarInterface() {
    renderLoja();
    const bar = document.getElementById('carrinho-bar');
    if (!bar) return;
    
    if (carrinho.length > 0) {
        bar.classList.remove('hidden');
        const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
        document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
    } else {
        bar.classList.add('hidden');
    }
}

// --- FINALIZAR PEDIDO (WHATSAPP) ---
window.abrirCheckout = () => {
    const modal = document.getElementById('modal-checkout');
    if (modal) modal.style.display = 'flex';
    const lista = document.getElementById('itens-checkout');
    if (lista) {
        lista.innerHTML = carrinho.map(i => `
            <div class="flex justify-between p-2 border-b text-sm">
                <span>${i.qtd}x ${i.nome}</span>
                <span>R$ ${(i.preco * i.qtd).toFixed(2)}</span>
            </div>
        `).join('');
    }
};

window.fecharCheckout = () => { document.getElementById('modal-checkout').style.display = 'none'; };

window.finalizarPedido = () => {
    const nome = document.getElementById('order-nome').value;
    const rua = document.getElementById('order-rua').value;
    if (!nome || !rua) return alert("Preencha nome e endereço!");

    let msg = `*PEDIDO SANDLA*\n\n*Cliente:* ${nome}\n*Endereço:* ${rua}\n\n*ITENS:*\n`;
    carrinho.forEach(i => msg += `- ${i.qtd}x ${i.nome}\n`);
    const total = carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*`;

    window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=${encodeURIComponent(msg)}`);
};

// --- RENDERIZAÇÃO ---
onSnapshot(produtosRef, (snap) => {
    produtosLocal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLoja();
    if (document.getElementById('admin-lista-produtos')) renderAdmin();
});

function renderLoja() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const aberta = verificarStatus();

    container.innerHTML = produtosLocal.map(p => {
        const itemNoCart = carrinho.find(c => c.id === p.id);
        const qtd = itemNoCart ? itemNoCart.qtd : 0;
        const preco = p.precoPromo > 0 ? p.precoPromo : p.preco;

        return `
            <div class="food-card ${p.emEstoque && aberta ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}">
                <div class="p-3">
                    <h3 class="font-bold text-[11px] uppercase">${p.nome}</h3>
                    <p class="text-orange-600 font-black">R$ ${preco}</p>
                    <div class="mt-2">
                        ${qtd > 0 ? `
                            <div class="flex items-center justify-between border rounded-lg p-1">
                                <button onclick="removerDoCarrinho('${p.id}')" class="px-2 font-bold">-</button>
                                <span class="text-sm font-bold">${qtd}</span>
                                <button onclick="adicionarAoCarrinho('${p.id}','${p.nome}',${preco})" class="px-2 font-bold">+</button>
                            </div>
                        ` : `
                            <button onclick="adicionarAoCarrinho('${p.id}','${p.nome}',${preco})" class="btn-add" ${p.emEstoque && aberta ? '' : 'disabled'}>ADICIONAR</button>
                        `}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function renderAdmin() {
    const container = document.getElementById('admin-lista-produtos');
    container.innerHTML = produtosLocal.map(p => `
        <div class="flex justify-between p-2 bg-white border mb-2 rounded-lg text-xs">
            <span class="font-bold">${p.nome}</span>
            <div class="flex gap-2">
                <button onclick="window.editarProd('${p.id}')" class="text-blue-500">EDITAR</button>
                <button onclick="window.removerProd('${p.id}')" class="text-red-500 font-bold">X</button>
            </div>
        </div>
    `).join('');
}

window.removerProd = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "produtos", id)); };
window.editarProd = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('preco').value = p.preco;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('img-preview').src = p.imagem;
    document.getElementById('img-preview').classList.remove('hidden');
};

// --- INICIALIZAÇÃO ---
carregarHorarios();
document.addEventListener('DOMContentLoaded', () => {
    const btnSalvarH = document.getElementById('btn-salvar-horarios');
    if (btnSalvarH) btnSalvarH.onclick = window.salvarHorariosSemana;
    
    const btnToggleH = document.getElementById('btn-toggle-horarios');
    if (btnToggleH) btnToggleH.onclick = () => document.getElementById('secao-horarios').classList.toggle('hidden');
});
