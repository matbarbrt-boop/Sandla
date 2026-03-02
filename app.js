import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO FIREBASE ---
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

// --- LOGICA DE HORÁRIOS ---
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
    } catch (e) { console.error("Erro ao carregar:", e); }
}

function renderGradeAdmin() {
    const container = document.getElementById('grade-horarios');
    if (!container) return;
    container.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between text-[11px] border-b py-2">
            <span class="w-16 font-bold uppercase text-slate-500">${h.dia}</span>
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
        alert("✅ Horários atualizados com sucesso!");
        location.reload();
    } catch (e) { alert("Erro ao salvar! Verifique as regras (Rules) do Firebase."); }
};

// --- STATUS DA LOJA (ABERTO/FECHADO) ---
function verificarStatus() {
    const agora = new Date();
    const diaIdx = agora.getDay();
    const horaMinuto = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');
    
    const hoje = configSemana[diaIdx] || { abre: "18:00", fecha: "23:00", fechado: true };
    const hAbre = hoje.abre || "18:00";
    const hFecha = hoje.fecha || "23:00";

    const estaAberta = !hoje.fechado && (horaMinuto >= hAbre && horaMinuto <= hFecha);

    const elStatus = document.getElementById('loja-status-header');
    if (elStatus) {
        elStatus.innerHTML = estaAberta 
            ? `<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold text-[10px] shadow-sm">● ABERTO</span>` 
            : `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-[10px] shadow-sm">○ FECHADO</span>`;
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

// --- GESTÃO DE PRODUTOS ---
onSnapshot(produtosRef, (snap) => {
    produtosLocal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLoja();
    if (document.getElementById('admin-lista-produtos')) renderAdmin();
});

// Comprime imagem para não estourar o limite do Firebase
const processarImagem = () => {
    const img = document.getElementById('img-preview');
    if (!img.src || !img.src.startsWith('data:image')) return "";
    const canvas = document.createElement('canvas');
    const maxW = 400;
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
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
            imagem: processarImagem(),
            emEstoque: document.getElementById('emEstoque').checked
        };

        try {
            if(btn) btn.innerText = "Salvando...";
            if (!id) await addDoc(produtosRef, dados);
            else await updateDoc(doc(db, "produtos", id), dados);
            
            form.reset();
            document.getElementById('img-preview').classList.add('hidden');
            document.getElementById('edit-id').value = "";
            if(btn) btn.innerText = "SALVAR PRODUTO";
            alert("✅ Salvo!");
        } catch (err) {
            alert("Erro! Certifique-se de que a imagem não é muito pesada.");
            if(btn) btn.innerText = "SALVAR PRODUTO";
        }
    };
}

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

// --- RENDERIZAÇÃO DA LOJA ---
function renderLoja(filtro = "") {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const aberta = verificarStatus();

    container.innerHTML = produtosLocal.filter(p => p.nome.toLowerCase().includes(filtro)).map(p => {
        const precoF = p.precoPromo > 0 ? p.precoPromo : p.preco;
        const disp = p.emEstoque && aberta;
        return `
            <div class="food-card ${disp ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}" loading="lazy">
                <div class="p-3 flex flex-col flex-grow">
                    <h3 class="font-bold text-[11px] truncate uppercase text-slate-700">${p.nome}</h3>
                    <p class="text-orange-600 font-black text-sm mt-1">R$ ${precoF}</p>
                    <button onclick="window.enviarPedido('${p.nome}', '${precoF}')" class="btn-order mt-2" ${disp ? '' : 'disabled'}>
                        ${aberta ? (p.emEstoque ? 'PEDIR' : 'FALTA') : 'FECHADO'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

window.enviarPedido = (n, p) => {
    const msg = encodeURIComponent(`Olá! Gostaria de um *${n}* (R$ ${p})`);
    window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=${msg}`, '_blank');
};

function renderAdmin() {
    const container = document.getElementById('admin-lista-produtos');
    container.innerHTML = produtosLocal.map(p => `
        <div class="flex justify-between items-center p-3 bg-white border rounded-xl mb-2 shadow-sm">
            <span class="text-[10px] font-bold uppercase truncate w-32">${p.nome}</span>
            <div class="flex gap-3">
                <button onclick="window.editarProd('${p.id}')" class="text-blue-500 font-bold text-[10px]">EDITAR</button>
                <button onclick="window.removerProd('${p.id}')" class="text-red-500 font-bold text-[10px] uppercase">Apagar</button>
            </div>
        </div>
    `).join('');
}

window.removerProd = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "produtos", id)); };

window.editarProd = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('descricao').value = p.descricao;
    document.getElementById('preco').value = p.preco;
    document.getElementById('precoPromo').value = p.precoPromo;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('emEstoque').checked = p.emEstoque;
    const img = document.getElementById('img-preview');
    img.src = p.imagem; img.classList.remove('hidden');
    window.scrollTo({top: 0, behavior: 'smooth'});
};

// --- START ---
carregarHorarios();

document.addEventListener('DOMContentLoaded', () => {
    const btnSalvarH = document.getElementById('btn-salvar-horarios');
    if (btnSalvarH) btnSalvarH.onclick = window.salvarHorariosSemana;
    
    const btnToggleH = document.getElementById('btn-toggle-horarios');
    if (btnToggleH) btnToggleH.onclick = () => document.getElementById('secao-horarios').classList.toggle('hidden');

    const busca = document.getElementById('inputBusca');
    if (busca) busca.oninput = (e) => renderLoja(e.target.value.toLowerCase());
});
