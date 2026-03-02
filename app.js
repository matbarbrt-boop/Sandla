import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let carrinho = []; // Armazena os itens: {id, nome, preco, qtd}
let configSemana = [];
const TELEFONE = "5513988250532";

// --- FUNÇÕES DO CARRINHO ---

window.adicionarAoCarrinho = (id, nome, preco) => {
    const itemExistente = carrinho.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({ id, nome, preco: parseFloat(preco), qtd: 1 });
    }
    atualizarBarraCarrinho();
    renderLoja(); // Para atualizar os números nos botões
};

window.removerDoCarrinho = (id) => {
    const index = carrinho.findIndex(item => item.id === id);
    if (index !== -1) {
        carrinho[index].qtd--;
        if (carrinho[index].qtd <= 0) carrinho.splice(index, 1);
    }
    atualizarBarraCarrinho();
    renderLoja();
};

function atualizarBarraCarrinho() {
    const bar = document.getElementById('carrinho-bar');
    const totalEl = document.getElementById('cart-total');
    const countEl = document.getElementById('cart-count');

    if (carrinho.length > 0) {
        bar.classList.remove('hidden');
        const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
        const itensT = carrinho.reduce((acc, item) => acc + item.qtd, 0);
        totalEl.innerText = `R$ ${total.toFixed(2)}`;
        countEl.innerText = `${itensT} ${itensT === 1 ? 'item' : 'itens'} no carrinho`;
    } else {
        bar.classList.add('hidden');
    }
}

window.abrirCheckout = () => {
    const modal = document.getElementById('modal-checkout');
    const lista = document.getElementById('itens-checkout');
    modal.style.display = 'flex';

    lista.innerHTML = carrinho.map(item => `
        <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
            <div>
                <p class="font-bold text-sm">${item.nome}</p>
                <p class="text-xs text-slate-500">${item.qtd}x R$ ${item.preco.toFixed(2)}</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="removerDoCarrinho('${item.id}'); abrirCheckout()" class="bg-white border w-8 h-8 rounded-full font-bold">-</button>
                <span class="font-bold text-sm">${item.qtd}</span>
                <button onclick="adicionarAoCarrinho('${item.id}', '${item.nome}', ${item.preco}); abrirCheckout()" class="bg-white border w-8 h-8 rounded-full font-bold">+</button>
            </div>
        </div>
    `).join('');
};

window.fecharCheckout = () => {
    document.getElementById('modal-checkout').style.display = 'none';
};

window.finalizarPedido = () => {
    const nome = document.getElementById('order-nome').value;
    const rua = document.getElementById('order-rua').value;
    const ref = document.getElementById('order-ref').value;

    if (!nome || !rua) return alert("Por favor, preencha nome e endereço!");

    let texto = `*NOVO PEDIDO - SANDLA*\n\n`;
    texto += `👤 *Nome:* ${nome}\n`;
    texto += `📍 *Endereço:* ${rua}\n`;
    if(ref) texto += `🏁 *Referência:* ${ref}\n\n`;
    texto += `🛒 *ITENS:*\n`;

    carrinho.forEach(item => {
        texto += `• ${item.qtd}x ${item.nome} (R$ ${(item.preco * item.qtd).toFixed(2)})\n`;
    });

    const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    texto += `\n💰 *TOTAL: R$ ${total.toFixed(2)}*`;

    window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=${encodeURIComponent(texto)}`, '_blank');
};

// --- RENDERIZAÇÃO DA LOJA (ATUALIZADA) ---

function renderLoja(filtro = "") {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    
    container.innerHTML = produtosLocal.filter(p => p.nome.toLowerCase().includes(filtro)).map(p => {
        const precoF = p.precoPromo > 0 ? p.precoPromo : p.preco;
        const itemNoCart = carrinho.find(c => c.id === p.id);
        const qtd = itemNoCart ? itemNoCart.qtd : 0;

        return `
            <div class="food-card ${p.emEstoque ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}" loading="lazy">
                <div class="p-3 flex flex-col flex-grow">
                    <h3 class="font-bold text-[11px] truncate uppercase text-slate-700">${p.nome}</h3>
                    <p class="text-orange-600 font-black text-sm mt-1">R$ ${precoF}</p>
                    
                    <div class="mt-2">
                        ${qtd > 0 ? `
                            <div class="flex items-center justify-between bg-orange-50 rounded-xl p-1 border border-orange-200">
                                <button onclick="removerDoCarrinho('${p.id}')" class="w-8 h-8 font-black text-orange-600">-</button>
                                <span class="font-bold text-orange-600">${qtd}</span>
                                <button onclick="adicionarAoCarrinho('${p.id}', '${p.nome}', ${precoF})" class="w-8 h-8 font-black text-orange-600">+</button>
                            </div>
                        ` : `
                            <button onclick="adicionarAoCarrinho('${p.id}', '${p.nome}', ${precoF})" class="btn-add">ADICIONAR</button>
                        `}
                    </div>
                </div>
            </div>`;
    }).join('');
}

// (Manter funções de Firebase: onSnapshot, carregarHorarios, etc. que enviamos antes)
// ...
