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
const TELEFONE = "5513988250532";
const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// --- HORÁRIOS ---
async function initHorarios() {
    const snap = await getDoc(configDoc);
    configSemana = snap.exists() ? snap.data().grade : dias.map(d => ({ dia: d, abre: "18:00", fecha: "23:00", fechado: false }));
    renderGrade();
    renderLoja();
}

function renderGrade() {
    const el = document.getElementById('grade-horarios');
    if (!el) return;
    el.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between text-[11px] py-1 border-b">
            <span class="w-12 font-bold">${h.dia.slice(0,3)}</span>
            <input type="time" value="${h.abre}" onchange="window.upH(${i},'abre',this.value)" class="border rounded p-1">
            <input type="time" value="${h.fecha}" onchange="window.upH(${i},'fecha',this.value)" class="border rounded p-1">
            <input type="checkbox" ${h.fechado ? 'checked' : ''} onchange="window.upH(${i},'fechado',this.checked)"> Folga
        </div>
    `).join('');
}

window.upH = (i, f, v) => { configSemana[i][f] = v; };
const btnH = document.getElementById('btn-salvar-horarios');
if(btnH) btnH.onclick = async () => { await setDoc(configDoc, { grade: configSemana }); alert("Salvo!"); location.reload(); };

function estaAberta() {
    const agora = new Date();
    const hoje = configSemana[agora.getDay()];
    if (!hoje || hoje.fechado) return false;
    const hora = agora.getHours().toString().padStart(2,'0') + ":" + agora.getMinutes().toString().padStart(2,'0');
    return hora >= hoje.abre && hora <= hoje.fecha;
}

// --- PRODUTOS (ADMIN) ---
const form = document.getElementById('form-produto');
if(form) form.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const dados = {
        nome: document.getElementById('nome').value,
        preco: parseFloat(document.getElementById('preco').value),
        imagem: document.getElementById('img-preview').src,
        emEstoque: document.getElementById('emEstoque').checked
    };
    if(!id) await addDoc(produtosRef, dados);
    else await updateDoc(doc(db, "produtos", id), dados);
    location.reload();
};

const fileIn = document.getElementById('imagemFile');
if(fileIn) fileIn.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = () => { const img = document.getElementById('img-preview'); img.src = reader.result; img.classList.remove('hidden'); };
    reader.readAsDataURL(e.target.files[0]);
};

// --- LOJA E CARRINHO ---
onSnapshot(produtosRef, (snap) => {
    produtosLocal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLoja();
    if (document.getElementById('admin-lista-produtos')) renderAdmin();
});

function renderLoja() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const aberta = estaAberta();
    
    // Status Header
    const hStatus = document.getElementById('loja-status-header');
    if(hStatus) hStatus.innerHTML = aberta ? `<span class="text-green-600 font-bold text-xs">● ABERTO</span>` : `<span class="text-red-600 font-bold text-xs">○ FECHADO</span>`;

    container.innerHTML = produtosLocal.map(p => {
        const item = carrinho.find(c => c.id === p.id);
        const qtd = item ? item.qtd : 0;
        return `
            <div class="food-card ${p.emEstoque && aberta ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}">
                <div class="p-3">
                    <h3 class="font-bold text-[10px] uppercase truncate">${p.nome}</h3>
                    <p class="text-orange-600 font-black">R$ ${p.preco.toFixed(2)}</p>
                    <div class="mt-2">
                        ${qtd > 0 ? `
                            <div class="flex justify-between items-center border rounded-lg p-1 bg-orange-50">
                                <button onclick="window.mudarQtd('${p.id}', -1)" class="px-2 font-bold">-</button>
                                <span class="text-sm font-bold">${qtd}</span>
                                <button onclick="window.mudarQtd('${p.id}', 1)" class="px-2 font-bold">+</button>
                            </div>
                        ` : `
                            <button onclick="window.mudarQtd('${p.id}', 1)" class="w-full bg-orange-500 text-white py-2 rounded-lg text-[10px] font-bold" ${p.emEstoque && aberta ? '' : 'disabled'}>ADICIONAR</button>
                        `}
                    </div>
                </div>
            </div>`;
    }).join('');
    
    // Barra Carrinho
    const bar = document.getElementById('carrinho-bar');
    if(bar) {
        if(carrinho.length > 0) {
            bar.classList.remove('hidden');
            const total = carrinho.reduce((a, b) => a + (b.preco * b.qtd), 0);
            document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
            document.getElementById('cart-count').innerText = `${carrinho.length} ITENS NO CARRINHO`;
        } else { bar.classList.add('hidden'); }
    }
}

window.mudarQtd = (id, delta) => {
    const prod = produtosLocal.find(p => p.id === id);
    const item = carrinho.find(c => c.id === id);
    if (item) {
        item.qtd += delta;
        if (item.qtd <= 0) carrinho = carrinho.filter(c => c.id !== id);
    } else if (delta > 0) {
        carrinho.push({ id: prod.id, nome: prod.nome, preco: prod.preco, qtd: 1 });
    }
    renderLoja();
};

window.abrirCheckout = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('itens-checkout').innerHTML = carrinho.map(i => `
        <div class="flex justify-between text-sm"><span>${i.qtd}x ${i.nome}</span><span class="font-bold">R$ ${(i.preco*i.qtd).toFixed(2)}</span></div>
    `).join('');
};

window.fecharCheckout = () => { document.getElementById('modal-checkout').style.display = 'none'; };

window.finalizarPedido = () => {
    const nome = document.getElementById('order-nome').value;
    const rua = document.getElementById('order-rua').value;
    if(!nome || !rua) return alert("Preencha Nome e Endereço!");

    let msg = `*PEDIDO SANDLA*\n\n*Cliente:* ${nome}\n*Endereço:* ${rua}\n\n*ITENS:*\n`;
    carrinho.forEach(i => msg += `- ${i.qtd}x ${i.nome} (R$ ${(i.preco*i.qtd).toFixed(2)})\n`);
    const total = carrinho.reduce((a, b) => a + (b.preco * b.qtd), 0);
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*`;

    window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=${encodeURIComponent(msg)}`);
};

function renderAdmin() {
    const container = document.getElementById('admin-lista-produtos');
    container.innerHTML = produtosLocal.map(p => `
        <div class="flex justify-between items-center p-3 bg-slate-50 border rounded-xl text-[10px] font-bold">
            <span>${p.nome}</span>
            <div class="flex gap-2">
                <button onclick="window.editP('${p.id}')" class="text-blue-500">EDITAR</button>
                <button onclick="window.delP('${p.id}')" class="text-red-500">APAGAR</button>
            </div>
        </div>
    `).join('');
}

window.delP = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "produtos", id)); };
window.editP = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('preco').value = p.preco;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('img-preview').src = p.imagem;
    document.getElementById('img-preview').classList.remove('hidden');
    window.scrollTo(0,0);
};

initHorarios();
