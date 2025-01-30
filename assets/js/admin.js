const { createApp } = Vue;

// Função para criar um hash da senha
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "salt_secreto_123"); // Salt simplificado
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

createApp({
    data() {
        return {
            isAuthenticated: false,
            password: '',
            loginError: '',
            membros: [],
            termoPesquisa: '',
            modalEditarAberto: false,
            membroEditando: {},
            indexEditando: -1,
            showSuccessModal: false,
            successMessage: '',
            modalClass: 'opacity-0 scale-95',
            showDeleteModal: false,
            membroParaExcluir: null,
            lastUpdate: localStorage.getItem('lastUpdate') || '0',
            showUpdateAlert: false
        };
    },
    computed: {
        membrosFiltrados() {
            if (!this.termoPesquisa) return this.membros;
            
            const termo = this.termoPesquisa.toLowerCase().trim();
            return this.membros.filter(membro => {
                return (
                    (membro.nome && membro.nome.toLowerCase().includes(termo)) ||
                    (membro.email && membro.email.toLowerCase().includes(termo)) ||
                    (membro.telefone && membro.telefone.includes(termo)) ||
                    (membro.cpf && membro.cpf.includes(termo)) ||
                    (membro.congregacao && membro.congregacao.toLowerCase().includes(termo)) ||
                    (membro.endereco && membro.endereco.toLowerCase().includeas(termo))
                );
            });
        }
    },
    methods: {
        async login() {
            try {
                
                const senhaCorretaHash = "976fd1d4ec8ac9d7809ec2cba05f825597bbfaf4d3dce610143cf3709b55761d";
                
                const senhaDigitadaHash = await hashPassword(this.password);
                
                if (senhaDigitadaHash === senhaCorretaHash) {
                    this.isAuthenticated = true;
                    this.loginError = '';
                    this.loadMembros();
                    
                    const expiraEm = new Date();
                    expiraEm.setHours(expiraEm.getHours() + 2);
                    
                    const sessao = {
                        autenticado: true,
                        expiraEm: expiraEm.getTime()
                    };
                    
                    sessionStorage.setItem('adminSession', JSON.stringify(sessao));
                } else {
                    this.loginError = 'Senha incorreta';
                    this.password = '';
                }
            } catch (error) {
                console.error('Erro no login:', error);
                this.loginError = 'Erro ao fazer login';
            }
        },

        verificarSessao() {
            const sessao = JSON.parse(sessionStorage.getItem('adminSession'));
            if (sessao && sessao.autenticado) {
                const agora = new Date().getTime();
                if (agora < sessao.expiraEm) {
                    this.isAuthenticated = true;
                    this.loadMembros();
                } else {
                    sessionStorage.removeItem('adminSession');
                }
            }
        },

        logout() {
            this.isAuthenticated = false;
            sessionStorage.removeItem('adminSession');
        },

        loadMembros() {
            this.membros = JSON.parse(localStorage.getItem('membros') || '[]');
        },
        exportToExcel() {
            try {
                const ws = XLSX.utils.json_to_sheet(this.membros);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Membros");
                XLSX.writeFile(wb, "membros.xlsx");
            } catch (error) {
                alert("Erro ao exportar para Excel: " + error.message);
            }
        },
        exportarBackup() {
            try {
                const dados = JSON.stringify(this.membros);
                const blob = new Blob([dados], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_membros_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                alert("Erro ao exportar backup: " + error.message);
            }
        },
        async importarBackup(event) {
            try {
                const arquivo = event.target.files[0];
                if (!arquivo) return;

                const texto = await arquivo.text();
                const dados = JSON.parse(texto);

                if (Array.isArray(dados)) {
                    if (confirm("Isso substituirá todos os dados existentes. Deseja continuar?")) {
                        this.membros = dados;
                        localStorage.setItem('membros', JSON.stringify(dados));
                        alert("Backup importado com sucesso!");
                    }
                } else {
                    throw new Error("Formato de arquivo inválido");
                }
            } catch (error) {
                alert("Erro ao importar backup: " + error.message);
            } finally {
                event.target.value = ''; // Limpa o input
            }
        },
        editarMembro(index) {
            this.indexEditando = index;
            this.membroEditando = { ...this.membros[index] };
            this.modalEditarAberto = true;

            // Aguarda o DOM ser atualizado
            this.$nextTick(() => {
                this.inicializarValidacoes();
            });
        },
        inicializarValidacoes() {
            const telefoneInput = document.getElementById('edit-telefone');
            const cpfInput = document.getElementById('edit-cpf');
            const nomeInput = document.getElementById('edit-nome');
            const emailInput = document.getElementById('edit-email');

            // Máscara para telefone (corrigida)
            telefoneInput.addEventListener('input', (e) => {
                let valor = e.target.value.replace(/\D/g, '');
                if (valor.length > 11) valor = valor.slice(0, 11);
                
                let numeroFormatado = '';
                if (valor.length > 0) numeroFormatado = '(' + valor.slice(0, 2);
                if (valor.length > 2) numeroFormatado += ') ' + valor.slice(2, 7);
                if (valor.length > 7) numeroFormatado += '-' + valor.slice(7, 11);
                
                this.membroEditando.telefone = numeroFormatado;
            });

            // Validação e máscara para nome
            nomeInput.addEventListener('input', (e) => {
                const errorSpan = document.getElementById('nome-error');
                let valor = e.target.value;
                
                // Capitaliza a primeira letra de cada palavra
                valor = valor.toLowerCase().replace(/(?:^|\s)\S/g, function(letra) {
                    return letra.toUpperCase();
                });
                
                this.membroEditando.nome = valor;

                if (valor.length < 3) {
                    errorSpan.textContent = 'Nome deve ter no mínimo 3 caracteres';
                    errorSpan.classList.remove('hidden');
                } else {
                    errorSpan.classList.add('hidden');
                }
            });

            // Máscara para CPF
            cpfInput.addEventListener('input', (e) => {
                let valor = e.target.value.replace(/\D/g, '');
                if (valor.length > 11) valor = valor.slice(0, 11);
                
                if (valor.length > 3) {
                    valor = `${valor.slice(0,3)}.${valor.slice(3)}`;
                }
                if (valor.length > 7) {
                    valor = `${valor.slice(0,7)}.${valor.slice(7)}`;
                }
                if (valor.length > 11) {
                    valor = `${valor.slice(0,11)}-${valor.slice(11)}`;
                }
                
                this.membroEditando.cpf = valor;
            });

            // Validação de email
            emailInput.addEventListener('input', (e) => {
                const errorSpan = document.getElementById('email-error');
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                if (!emailRegex.test(e.target.value)) {
                    errorSpan.textContent = 'Email inválido';
                    errorSpan.classList.remove('hidden');
                } else {
                    errorSpan.classList.add('hidden');
                }
            });
        },
        validarFormulario() {
            const nome = this.membroEditando.nome;
            const email = this.membroEditando.email;
            const telefone = this.membroEditando.telefone;
            const cpf = this.membroEditando.cpf;
            
            if (nome.length < 3) return false;
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return false;
            
            if (telefone.replace(/\D/g, '').length < 10) return false;
            
            if (cpf.replace(/\D/g, '').length !== 11) return false;
            
            return true;
        },
        fecharModal() {
            this.modalEditarAberto = false;
            this.membroEditando = {};
            this.indexEditando = -1;
        },
        salvarEdicao() {
            if (!this.validarFormulario()) {
                alert('Por favor, preencha todos os campos corretamente');
                return;
            }

            if (this.indexEditando > -1) {
                this.membros[this.indexEditando] = { ...this.membroEditando };
                localStorage.setItem('membros', JSON.stringify(this.membros));
                this.fecharModal();
                this.showModalSuccess('Membro atualizado com sucesso!');
            }
        },
        apagarMembro(index) {
            this.membroParaExcluir = index;
            this.showDeleteModal = true;
            // Adiciona classe para animação de entrada
            setTimeout(() => {
                this.modalClass = 'opacity-100 scale-100';
            }, 10);
        },
        closeDeleteModal() {
            // Adiciona classe para animação de saída
            this.modalClass = 'opacity-0 scale-95';
            setTimeout(() => {
                this.showDeleteModal = false;
                this.membroParaExcluir = null;
            }, 300);
        },
        confirmarExclusao() {
            if (this.membroParaExcluir !== null) {
                this.membros.splice(this.membroParaExcluir, 1);
                localStorage.setItem('membros', JSON.stringify(this.membros));
                this.closeDeleteModal();
                this.showModalSuccess('Membro removido com sucesso!');
            }
        },
        showModalSuccess(message) {
            this.successMessage = message;
            this.showSuccessModal = true;
            // Adiciona classe para animação de entrada
            setTimeout(() => {
                this.modalClass = 'opacity-100 scale-100';
            }, 10);
        },
        closeSuccessModal() {
            // Adiciona classe para animação de saída
            this.modalClass = 'opacity-0 scale-95';
            setTimeout(() => {
                this.showSuccessModal = false;
            }, 300);
        },
        verificarNovosCadastros() {
            const currentUpdate = localStorage.getItem('lastUpdate');
            if (currentUpdate && currentUpdate !== this.lastUpdate) {
                this.showUpdateAlert = true;
                this.membros = JSON.parse(localStorage.getItem('membros') || '[]');
                this.lastUpdate = currentUpdate;
                
                // Mostra notificação
                this.showModalSuccess('Novo membro cadastrado! A lista foi atualizada automaticamente.');
            }
        },
    },
    mounted() {
        this.verificarSessao();
        
        // Verifica atualizações a cada 5 segundos
        setInterval(() => {
            if (this.isAuthenticated) {
                this.verificarNovosCadastros();
            }
        }, 5000);
    }
}).mount('#admin'); 