import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuração do seu Firebase
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
let configSemana = [];
const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TELEFONE = "5513988250532";

// --- 2. GESTÃO DE HORÁRIOS ---

async function carregarConfig() {
    try {
        const snap = await getDoc(configDoc);
        if (snap.exists() && snap.data().grade) {
            configSemana = snap.data().grade;
        } else {
            // Padrão caso o banco esteja vazio
            configSemana = diasSemana.map(dia => ({ dia, abre: "18:00", fecha: "23:00", fechado: false }));
        }
        renderGradeAdmin();
        checkStatusLoja();
    } catch (e) {
        console.error("Erro ao carregar horários:", e);
    }
}

function renderGradeAdmin() {
    const div = document.getElementById('grade-horarios');
    if (!div) return;
    div.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between text-[11px] border-b py-2">
            <span class="w-16 font-bold uppercase">${h.dia}</span>
            <input type="time" value="${h.abre || '18:00'}" onchange="updateH(${i},'abre',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <input type="time" value="${h.fecha || '23:00'}" onchange="updateH(${i},'fecha',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <label class="flex items-center gap-1">
                <input type="checkbox" ${h.fechado ? 'checked' : ''} onchange="updateH(${i},'fechado',this.checked)">
                <span class="text-red-500 font-bold">FOLGA</span>
            </label>
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
        alert("✅ Horários atualizados!");
        location.reload();
    } catch (e) {
        alert("Erro ao salvar! Verifique as Rules no Firebase.");
    }
};

// --- 3. LÓGICA DE STATUS (ABERTO/FECHADO) ---

function checkStatusLoja() {
    const agora = new Date();
    const diaIdx = agora.getDay();
    const horaMinuto = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');
    
    const hoje = configSemana[diaIdx] || { abre: "18:00", fecha: "23:00", fechado: false };
    const hAbre = hoje.abre || "18:00";
    const hFecha = hoje.fecha || "23:00";

    const estaAberta = !hoje.fechado && (horaMinuto >= hAbre && horaMinuto <= hFecha);

    const elStatus = document.getElementById('loja-status-header');
    if (elStatus) {
        elStatus.innerHTML = estaAberta 
            ? `<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold text-[10px]">● ABERTO</span>` 
            : `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-[10px]">○ FECHADO</span>`;
    }

    const alertF = document.getElementById('alerta-fechado');
    const txtRetorno = document.getElementById('texto-horario-retorno');
    if (alertF && txtRetorno) {
        if (!estaAberta) {
            alertF.classList.remove('hidden');
            txtRetorno.innerText = hoje.fechado ? "Hoje estamos de folga!" : `Abrimos das ${hAbre} às ${hFecha}`;
        } else {
            alertF.classList.add('hidden');
        }
    }
    return estaAberta;
}

// --- 4. GESTÃO DE PRODUTOS ---

onSnapshot(produtosRef, (snap) => {
    produtosLocal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLojaCliente();
    if (document.getElementById('admin-lista-produtos')) renderListaAdmin();
});

// Redimensiona imagem para não travar o Firebase
const comprimirImagem = (imgId) => {
    const img = document.getElementById(imgId);
    if (!img.src || img.src.length < 1000) return ""; // Retorna vazio se não tiver imagem real
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const maxW = 400;
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = img.naturalHeight * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
};

const form = document.getElementById('form-produto');
if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const btn = document.getElementById('btn-submit');
        
        const dados = {
            nome: document.getElementById('nome').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            preco: document.getElementById('preco').value,
            precoPromo: document.getElementById('precoPromo').value || 0,
            imagem: comprimirImagem('img-preview'),
            emEstoque: document.getElementById('emEstoque').checked
        };

        try {
            if(btn) btn.innerText = "Enviando...";
            if (!id) await addDoc(produtosRef, dados);
            else await updateDoc(doc(db, "produtos", id), dados);
            
            form.reset();
            document.getElementById('img-preview').classList.add('hidden');
            document.getElementById('edit-id').value = "";
            if(btn) btn.innerText = "Salvar Produto";
            alert("✅ Produto Salvo!");
        } catch (err) {
            alert("Erro ao salvar! Tente uma imagem menor.");
            if(btn) btn.innerText = "Tentar Novamente";
        }
    };
}

// Preview da Imagem
const inputImg = document.getElementById('imagemFile');
if (inputImg) {
    inputImg.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = () => {
            const pre = document.getElementById('img-preview');
            pre.src = reader.result;
            pre.classList.remove('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };
}

// --- 5. RENDERIZAÇÃO ---

function renderLojaCliente(filtro = "") {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const aberta = checkStatusLoja();

    container.innerHTML = produtosLocal.filter(p => p.nome.toLowerCase().includes(filtro)).map(p => {
        const precoFinal = p.precoPromo > 0 ? p.precoPromo : p.preco;
        const disponivel = p.emEstoque && aberta;
        return `
            <div class="food-card ${disponivel ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}" alt="${p.nome}" loading="lazy">
                <div class="p-3 flex flex-col flex-grow">
                    <h3 class="font-bold text-[11px] truncate uppercase">${p.nome}</h3>
                    <p class="text-orange-600 font-black text-base mt-1">R$ ${precoFinal}</p>
                    <button onclick="fazerPedido('${p.nome}', '${precoFinal}')" class="btn-order mt-2" ${disponivel ? '' : 'disabled'}>
                        ${aberta ? (p.emEstoque ? 'PEDIR' : 'FALTA') : 'FECHADO'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

window.fazerPedido = (n, p) => {
    const msg = encodeURIComponent(`Olá! Gostaria de pedir: *${n}* (R$ ${p})`);
    window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=${msg}`, '_blank');
};

function renderListaAdmin() {
    const container = document.getElementById('admin-lista-produtos');
    container.innerHTML = produtosLocal.map(p => `
        <div class="flex justify-between items-center p-3 bg-white border rounded-xl mb-2 shadow-sm">
            <span class="text-[10px] font-bold uppercase truncate w-32">${p.nome}</span>
            <div class="flex gap-2">
                <button onclick="prepararEdicao('${p.id}')" class="text-blue-500 font-bold text-[10px]">EDITAR</button>
                <button onclick="removerProduto('${p.id}')" class="text-red-500 font-bold text-[10px]">X</button>
            </div>
        </div>
    `).join('');
}

window.removerProduto = async (id) => { if(confirm("Apagar item?")) await deleteDoc(doc(db, "produtos", id)); };

window.prepararEdicao = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('descricao').value = p.descricao;
    document.getElementById('preco').value = p.preco;
    document.getElementById('precoPromo').value = p.precoPromo;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('emEstoque').checked = p.emEstoque;
    const img = document.getElementById('img-preview');
    img.src = p.imagem;
    img.classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// --- INICIALIZAÇÃO ---
carregarConfig();

document.addEventListener('DOMContentLoaded', () => {
    const btnS = document.getElementById('btn-salvar-horarios');
    if (btnS) btnS.onclick = window.salvarHorariosSemana;
    
    const btnT = document.getElementById('btn-toggle-horarios');
    if (btnT) btnT.onclick = () => document.getElementById('secao-horarios').classList.toggle('hidden');

    const busca = document.getElementById('inputBusca');
    if (busca) busca.oninput = (e) => renderLojaCliente(e.target.value.toLowerCase());
});
