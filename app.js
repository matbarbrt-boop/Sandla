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

// --- INICIALIZAR HORÁRIOS ---
async function init() {
    const snap = await getDoc(configDoc);
    configSemana = snap.exists() ? snap.data().grade : dias.map(d => ({ dia: d, abre: "18:00", fecha: "23:00", fechado: false }));
    renderGrade();
    renderLoja();
}

function renderGrade() {
    const el = document.getElementById('grade-horarios');
    if (!el) return;
    el.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between py-1 border-b">
            <span class="w-12 font-bold">${h.dia.slice(0,3)}</span>
            <input type="time" value="${h.abre}" onchange="window.upH(${i},'abre',this.value)" class="border rounded p-1">
            <input type="time" value="${h.fecha}" onchange="window.upH(${i},'fecha',this.value)" class="border rounded p-1">
            <input type="checkbox" ${h.fechado ? 'checked' : ''} onchange="window.upH(${i},'fechado',this.checked)"> Folga
        </div>
    `).join('');
}

window.upH = (i, f, v) => { configSemana[i][f] = v; };
const btnH = document.getElementById('btn-salvar-horarios');
if(btnH) btnH.onclick = async () => { await setDoc(configDoc, { grade: configSemana }); alert("Horários Salvos!"); location.reload(); };

function estaAberta() {
    const agora = new Date();
    const hoje = configSemana[agora.getDay()];
    if (!hoje || hoje.fechado) return false;
    const hora = agora.getHours().toString().padStart(2,'0') + ":" + agora.getMinutes().toString().padStart(2,'0');
    return hora >= hoje.abre && hora <= hoje.fecha;
}

// --- REDIMENSIONAR IMAGEM (PARA NÃO DAR ERRO) ---
const comprimirImagem = (imgHtml) => {
    const canvas = document.createElement('canvas');
    const maxW = 400; // Reduz para 400px de largura
    const scale = maxW / imgHtml.naturalWidth;
    canvas.width = maxW;
    canvas.height = imgHtml.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgHtml, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7); // Qualidade 70%
};

// --- PRODUTOS (ADMIN) ---
const form = document.getElementById('form-produto');
if(form) form.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const btn = document.getElementById('btn-submit');
    const imgPreview = document.getElementById('img-preview');
    
    btn.innerText = "Processando...";
    const fotoFinal = imgPreview.src.startsWith('data:image') ? comprimirImagem(imgPreview) : imgPreview.src;

    const dados = {
        nome: document.getElementById('nome').value,
        descricao: document.getElementById('descricao').value,
        preco: parseFloat(document.getElementById('preco').value),
        precoPromo: parseFloat(document.getElementById('precoPromo').value) || 0,
        imagem: fotoFinal,
        emEstoque: document.getElementById('emEstoque').checked
    };

    try {
        if(!id) await addDoc(produtosRef, dados);
        else await updateDoc(doc(db, "produtos", id), dados);
        alert("Produto Salvo!");
        location.reload();
    } catch (err) { alert("Erro ao salvar! Tente uma imagem menor."); btn.innerText = "Salvar Produto"; }
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
    const hStatus = document.getElementById('loja-status-header');
    if(hStatus) hStatus.innerHTML = aberta ? `<span class="text-green-600 font-bold text-[10px]">● ABERTO</span>` : `<span class="text-red-600 font-bold text-[10px]">○ FECHADO</span>`;

    container.innerHTML = produtosLocal.map(p => {
        const item = carrinho.find(c => c.id === p.id);
        const qtd = item ? item.qtd : 0;
        const temPromo = p.precoPromo > 0;
        const precoExibir = temPromo ? p.precoPromo : p.preco;

        return `
            <div class="food-card ${p.emEstoque && aberta ? '' : 'opacity-50'} shadow-sm">
                <img src="${p.imagem || ''}">
                <div class="p-3">
                    <h3 class="font-bold text-[10px] uppercase truncate">${p.nome}</h3>
                    <p class="text-[9px] text-slate-400 leading-tight h-6 overflow-hidden">${p.descricao || ''}</p>
                    <div class="mt-1">
                        ${temPromo ? `<span class="text-[9px] line-through text-slate-400">R$ ${p.preco.toFixed(2)}</span>` : ''}
                        <p class="text-orange-600 font-black text-sm">R$ ${precoExibir.toFixed(2)}</p>
                    </div>
                    <div class="mt-2">
                        ${qtd > 0 ? `
                            <div class="flex justify-between items-center border rounded-lg p-1 bg-orange-50">
                                <button onclick="window.mudarQtd('${p.id}', -1)" class="px-2 font-bold">-</button>
                                <span class="text-sm font-bold text-orange-600">${qtd}</span>
                                <button onclick="window.mudarQtd('${p.id}', 1)" class="px-2 font-bold">+</button>
                            </div>
                        ` : `
                            <button onclick="window.mudarQtd('${p.id}', 1)" class="w-full bg-orange-500 text-white py-2 rounded-lg text-[10px] font-bold" ${p.emEstoque && aberta ? '' : 'disabled'}>ADICIONAR</button>
                        `}
                    </div>
                </div>
            </div>`;
    }).join('');
    
    atualizarBarra();
}

function atualizarBarra() {
    const bar = document.getElementById('carrinho-bar');
    if(!bar) return;
    if(carrinho.length > 0) {
        bar.classList.remove('hidden');
        const total = carrinho.reduce((a, b) => a + (b.precoUnit * b.qtd), 0);
        document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('cart-count').innerText = `${carrinho.reduce((a,b)=>a+b.qtd, 0)} ITENS`;
    } else { bar.classList.add('hidden'); }
}

window.mudarQtd = (id, delta) => {
    const prod = produtosLocal.find(p => p.id === id);
    const item = carrinho.find(c => c.id === id);
    const precoU = prod.precoPromo > 0 ? prod.precoPromo : prod.preco;
    if (item) {
        item.qtd += delta;
        if (item.qtd <= 0) carrinho = carrinho.filter(c => c.id !== id);
    } else if (delta > 0) {
        carrinho.push({ id: prod.id, nome: prod.nome, precoUnit: precoU, qtd: 1 });
    }
    renderLoja();
};

window.abrirCheckout = () => {
    document.getElementById('modal-checkout').style.display = 'flex';
    document.getElementById('itens-checkout').innerHTML = carrinho.map(i => `
        <div class="flex justify-between text-sm"><span>${i.qtd}x ${i.nome}</span><span class="font-bold">R$ ${(i.precoUnit*i.qtd).toFixed(2)}</span></div>
    `).join('');
};

window.fecharCheckout = () => { document.getElementById('modal-checkout').style.display = 'none'; };

window.finalizarPedido = () => {
    const nome = document.getElementById('order-nome').value;
    const rua = document.getElementById('order-rua').value;
    const ref = document.getElementById('order-ref').value;
    if(!nome || !rua) return alert("Preencha Nome e Endereço!");

    let msg = `*PEDIDO SANDLA*\n\n*Cliente:* ${nome}\n*Endereço:* ${rua}\n*Ref:* ${ref}\n\n*ITENS:*\n`;
    carrinho.forEach(i => msg += `- ${i.qtd}x ${i.nome} (R$ ${(i.precoUnit*i.qtd).toFixed(2)})\n`);
    const total = carrinho.reduce((a, b) => a + (b.precoUnit * b.qtd), 0);
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
                <button onclick="window.delP('${p.id}')" class="text-red-500 font-bold uppercase">X</button>
            </div>
        </div>
    `).join('');
}

window.delP = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "produtos", id)); };
window.editP = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('descricao').value = p.descricao || '';
    document.getElementById('preco').value = p.preco;
    document.getElementById('precoPromo').value = p.precoPromo || '';
    document.getElementById('edit-id').value = p.id;
    document.getElementById('img-preview').src = p.imagem;
    document.getElementById('img-preview').classList.remove('hidden');
    document.getElementById('emEstoque').checked = p.emEstoque;
    window.scrollTo(0,0);
};

init();
