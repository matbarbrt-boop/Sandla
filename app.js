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
let configSemana = [];
const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TELEFONE = "5513988250532";

// --- CARREGAR HORÁRIOS ---
async function carregarConfig() {
    const snap = await getDoc(configDoc);
    if (snap.exists()) {
        configSemana = snap.data().grade;
    } else {
        configSemana = diasSemana.map(dia => ({ dia, abre: "18:00", fecha: "23:00", fechado: false }));
    }
    renderGrade();
    checkStatus();
}

function renderGrade() {
    const div = document.getElementById('grade-horarios');
    if (!div) return;
    div.innerHTML = configSemana.map((h, i) => `
        <div class="flex items-center justify-between text-[11px] border-b py-2">
            <span class="w-16 font-bold">${h.dia}</span>
            <input type="time" value="${h.abre}" onchange="updateH(${i},'abre',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <input type="time" value="${h.fecha}" onchange="updateH(${i},'fecha',this.value)" class="border p-1 rounded" ${h.fechado ? 'disabled' : ''}>
            <input type="checkbox" ${h.fechado ? 'checked' : ''} onchange="updateH(${i},'fechado',this.checked)"> Folga
        </div>
    `).join('');
}

window.updateH = (i, f, v) => { configSemana[i][f] = v; renderGrade(); };

window.salvarHorariosSemana = async () => {
    try {
        await setDoc(configDoc, { grade: configSemana });
        alert("Horários salvos!");
        location.reload();
    } catch (e) { alert("Erro de permissão nas Rules do Firebase!"); }
};

// --- STATUS DA LOJA ---
function checkStatus() {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours().toString().padStart(2,'0') + ":" + agora.getMinutes().toString().padStart(2,'0');
    const hoje = configSemana[dia];
    const aberta = hoje && !hoje.fechado && (hora >= hoje.abre && hora <= hoje.fecha);

    const elStatus = document.getElementById('loja-status-header');
    if (elStatus) elStatus.innerHTML = aberta ? `<span class="text-green-600 font-bold text-xs">● ABERTO</span>` : `<span class="text-red-600 font-bold text-xs">○ FECHADO</span>`;
    
    const alertF = document.getElementById('alerta-fechado');
    if (alertF && !aberta) {
        alertF.classList.remove('hidden');
        document.getElementById('texto-horario-retorno').innerText = hoje?.fechado ? "Hoje estamos fechados!" : `Abrimos das ${hoje?.abre} às ${hoje?.fecha}`;
    }
    return aberta;
}

// --- PRODUTOS ---
onSnapshot(produtosRef, (snap) => {
    produtosLocal = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLoja();
    if (document.getElementById('admin-lista-produtos')) renderAdmin();
});

function renderLoja(filtro = "") {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    const aberta = checkStatus();

    container.innerHTML = produtosLocal.filter(p => p.nome.toLowerCase().includes(filtro)).map(p => {
        const preco = p.precoPromo > 0 ? p.precoPromo : p.preco;
        const pode = p.emEstoque && aberta;
        return `
            <div class="food-card ${pode ? '' : 'opacity-50'}">
                <img src="${p.imagem || ''}">
                <div class="p-3 flex flex-col flex-grow">
                    <h3 class="font-bold text-[11px] truncate uppercase">${p.nome}</h3>
                    <p class="text-orange-600 font-black mt-1">R$ ${preco}</p>
                    <button onclick="enviarPedido('${p.nome}', '${preco}')" class="btn-order mt-2" ${pode ? '' : 'disabled'}>
                        ${aberta ? (p.emEstoque ? 'PEDIR' : 'FALTA') : 'FECHADO'}
                    </button>
                </div>
            </div>`;
    }).join('');
}

window.enviarPedido = (n, p) => window.open(`https://api.whatsapp.com/send?phone=${TELEFONE}&text=Olá! Quero pedir um *${n}* (R$ ${p})`, '_blank');

// --- ADMIN PRODUTOS ---
const form = document.getElementById('form-produto');
if (form) {
    form.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const btnSubmit = document.getElementById('btn-submit');
    
    // Função para diminuir a imagem
    const redimensionarImagem = (imgHtml) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxW = 400; // Define largura máxima de 400px (ideal para celular)
        const scale = maxW / imgHtml.naturalWidth;
        
        canvas.width = maxW;
        canvas.height = imgHtml.naturalHeight * scale;
        
        ctx.drawImage(imgHtml, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.7); // Salva em JPEG com 70% de qualidade
    };

    const imgElement = document.getElementById('img-preview');
    let fotoFinal = "";

    // Se houver imagem no preview, a gente diminui ela
    if (imgElement.src && imgElement.src.startsWith('data:image')) {
        fotoFinal = redimensionarImagem(imgElement);
    }

    const dados = {
        nome: document.getElementById('nome').value.trim(),
        descricao: document.getElementById('descricao').value.trim(),
        preco: parseFloat(document.getElementById('preco').value) || 0,
        precoPromo: parseFloat(document.getElementById('precoPromo').value) || 0,
        imagem: fotoFinal,
        emEstoque: document.getElementById('emEstoque').checked
    };

    try {
        if(btnSubmit) btnSubmit.innerText = "Processando...";
        
        if (!id) {
            await addDoc(produtosRef, dados);
        } else {
            await updateDoc(doc(db, "produtos", id), dados);
        }
        
        alert("✅ SALVOU COM SUCESSO!");
        form.reset();
        imgElement.classList.add('hidden');
        imgElement.src = "";
        document.getElementById('edit-id').value = "";
        if(btnSubmit) btnSubmit.innerText = "Salvar Produto";
        
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar: Imagem ainda muito grande ou erro de permissão.");
        if(btnSubmit) btnSubmit.innerText = "Tentar Novamente";
    }
};
}

const fileIn = document.getElementById('imagemFile');
if (fileIn) {
    fileIn.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = document.getElementById('img-preview');
            img.src = reader.result;
            img.classList.remove('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };
}

function renderAdmin() {
    const container = document.getElementById('admin-lista-produtos');
    container.innerHTML = produtosLocal.map(p => `
        <div class="flex justify-between p-3 bg-white border rounded-xl items-center shadow-sm">
            <span class="text-xs font-bold uppercase truncate w-32">${p.nome}</span>
            <div class="flex gap-2">
                <button onclick="editar('${p.id}')" class="text-blue-500 font-bold text-xs">EDITAR</button>
                <button onclick="apagar('${p.id}')" class="text-red-500 font-bold text-xs">X</button>
            </div>
        </div>
    `).join('');
}

window.apagar = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "produtos", id)); };
window.editar = (id) => {
    const p = produtosLocal.find(x => x.id === id);
    document.getElementById('nome').value = p.nome;
    document.getElementById('descricao').value = p.descricao;
    document.getElementById('preco').value = p.preco;
    document.getElementById('precoPromo').value = p.precoPromo;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('img-preview').src = p.imagem;
    document.getElementById('img-preview').classList.remove('hidden');
    window.scrollTo(0,0);
};

// --- START ---
carregarConfig();
document.addEventListener('DOMContentLoaded', () => {
    const btnS = document.getElementById('btn-salvar-horarios');
    if (btnS) btnS.onclick = window.salvarHorariosSemana;
    
    const btnT = document.getElementById('btn-toggle-horarios');
    if (btnT) btnT.onclick = () => document.getElementById('secao-horarios').classList.toggle('hidden');

    const busca = document.getElementById('inputBusca');
    if (busca) busca.oninput = (e) => renderLoja(e.target.value.toLowerCase());
});