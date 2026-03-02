// --- CARREGAR CONFIG (CORRIGIDA) ---
async function carregarConfig() {
    try {
        const snap = await getDoc(configDoc);
        if (snap.exists() && snap.data().grade) {
            configSemana = snap.data().grade;
        } else {
            // Se não existir no banco, cria um padrão local
            configSemana = diasSemana.map(dia => ({ 
                dia, 
                abre: "18:00", 
                fecha: "23:00", 
                fechado: false 
            }));
        }
        renderGrade();
        checkStatus();
    } catch (e) { 
        console.error("Erro ao carregar horários:", e); 
    }
}

// --- CHECK STATUS (CORRIGIDA) ---
function checkStatus() {
    const agora = new Date();
    const dia = agora.getDay();
    const hora = agora.getHours().toString().padStart(2,'0') + ":" + agora.getMinutes().toString().padStart(2,'0');
    
    // Pega o dia de hoje da nossa lista
    const hoje = configSemana[dia] || { abre: "00:00", fecha: "00:00", fechado: true };
    
    // Se algum valor for nulo, usamos um padrão para não dar 'undefined'
    const hAbre = hoje.abre || "18:00";
    const hFecha = hoje.fecha || "23:00";

    const aberta = !hoje.fechado && (hora >= hAbre && hora <= hFecha);

    const elStatus = document.getElementById('loja-status-header');
    if (elStatus) {
        elStatus.innerHTML = aberta 
            ? `<span class="bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold text-[10px]">● ABERTO</span>` 
            : `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-[10px]">○ FECHADO</span>`;
    }
    
    const alertF = document.getElementById('alerta-fechado');
    const txtRetorno = document.getElementById('texto-horario-retorno');
    
    if (alertF && txtRetorno) {
        if (!aberta) {
            alertF.classList.remove('hidden');
            txtRetorno.innerText = hoje.fechado 
                ? "Hoje estamos de folga!" 
                : `Abrimos das ${hAbre} às ${hFecha}`;
        } else {
            alertF.classList.add('hidden');
        }
    }
    return aberta;
}
