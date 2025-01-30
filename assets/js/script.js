const { createApp } = Vue;

createApp({
    data() {
        return {
            currentView: 'cadastro',
            showModal: false,
            modalMessage: '',
            modalClass: 'opacity-0 scale-95',
            form: {
                nome: '',
                email: '',
                telefone: '',
                cpf: '',
                cep: '',
                endereco: '',
                congregacao: ''
            },
            errors: {
                nome: '',
                email: '',
                telefone: '',
                cpf: '',
                cep: ''
            },
            membros: JSON.parse(localStorage.getItem('membros') || '[]'),
            editandoIndex: -1,
            termoPesquisa: ''
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
                    (membro.endereco && membro.endereco.toLowerCase().includes(termo))
                );
            });
        }
    },
    methods: {
        formatarNome(event) {
            let nome = event.target.value;
            // Capitaliza a primeira letra de cada palavra
            nome = nome.toLowerCase().replace(/(^|\s)\S/g, l => l.toUpperCase());
            this.form.nome = nome;
        },
        // Busca o endereço pelo CEP usando a API ViaCEP
        async buscarEndereco() {
            // Remove todos os caracteres não numéricos do CEP
            const cepLimpo = this.form.cep.replace(/\D/g, '');
            
            if (cepLimpo.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        this.form.endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    } else {
                        this.form.endereco = 'CEP não encontrado';
                    }
                } catch (error) {
                    console.error('Erro ao buscar CEP:', error);
                    this.form.endereco = 'Erro ao buscar CEP';
                }
            }
        },
        showSuccessModal(message) {
            this.modalMessage = message;
            this.showModal = true;
            // Adiciona classe para animação de entrada
            setTimeout(() => {
                this.modalClass = 'opacity-100 scale-100';
            }, 10);
        },
        closeModal() {
            // Adiciona classe para animação de saída
            this.modalClass = 'opacity-0 scale-95';
            setTimeout(() => {
                this.showModal = false;
            }, 300);
        },
        submitForm() {
            if (this.validateForm()) {
                this.membros = JSON.parse(localStorage.getItem('membros') || '[]');
                
                if (this.editandoIndex >= 0) {
                    this.membros[this.editandoIndex] = { ...this.form };
                    this.editandoIndex = -1;
                    this.showSuccessModal('Membro atualizado com sucesso!');
                } else {
                    this.membros.push({ ...this.form });
                    this.showSuccessModal('Membro cadastrado com sucesso!');
                    // Adiciona timestamp da última atualização
                    localStorage.setItem('lastUpdate', Date.now().toString());
                }
                
                localStorage.setItem('membros', JSON.stringify(this.membros));
                
                this.form = {
                    nome: '',
                    email: '',
                    telefone: '',
                    cpf: '',
                    cep: '',
                    endereco: '',
                    congregacao: ''
                };
            }
        },
        // Alterna para a tela de membros com animação
        switchToMembros() {
            this.currentView = 'membros';
        },
        // Exporta a lista de membros para Excel
        exportToExcel() {
            const ws = XLSX.utils.json_to_sheet(this.membros);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Membros');
            XLSX.writeFile(wb, 'membros_cadastrados.xlsx');
        },
        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        validateNome(nome) {
            // Verifica se tem pelo menos duas palavras (nome e sobrenome)
            const palavras = nome.trim().split(/\s+/);
            return palavras.length >= 2;
        },
        validateCPF(cpf) {
            cpf = cpf.replace(/[^\d]/g, '');
            if (cpf.length !== 11) return false;
            if (/^(\d)\1+$/.test(cpf)) return false;

            let sum = 0;
            for (let i = 0; i < 9; i++) {
                sum += parseInt(cpf.charAt(i)) * (10 - i);
            }
            let rev = 11 - (sum % 11);
            if (rev === 10 || rev === 11) rev = 0;
            if (rev !== parseInt(cpf.charAt(9))) return false;

            sum = 0;
            for (let i = 0; i < 10; i++) {
                sum += parseInt(cpf.charAt(i)) * (11 - i);
            }
            rev = 11 - (sum % 11);
            if (rev === 10 || rev === 11) rev = 0;
            if (rev !== parseInt(cpf.charAt(10))) return false;

            return true;
        },
        validateForm() {
            let isValid = true;
            this.errors = {
                nome: '',
                email: '',
                telefone: '',
                cpf: '',
                cep: ''
            };

            // Verifica se já existe um membro com o mesmo email ou CPF
            const membroExistente = this.membros.find(membro => 
                (membro.email === this.form.email && this.editandoIndex !== this.membros.indexOf(membro)) || 
                (membro.cpf === this.form.cpf && this.editandoIndex !== this.membros.indexOf(membro))
            );

            if (membroExistente) {
                if (membroExistente.email === this.form.email) {
                    this.errors.email = 'Este email já está cadastrado';
                    isValid = false;
                }
                if (membroExistente.cpf === this.form.cpf) {
                    this.errors.cpf = 'Este CPF já está cadastrado';
                    isValid = false;
                }
                return false;
            }

            // Validação do nome
            if (!this.form.nome.trim()) {
                this.errors.nome = 'Nome é obrigatório';
                isValid = false;
            } else if (!this.validateNome(this.form.nome)) {
                this.errors.nome = 'Digite o nome completo';
                isValid = false;
            }

            // Validação do email
            if (!this.validateEmail(this.form.email)) {
                this.errors.email = 'Email inválido';
                isValid = false;
            }

            // Validação do telefone
            const telefoneNumeros = this.form.telefone.replace(/\D/g, '');
            if (telefoneNumeros.length !== 11) {
                this.errors.telefone = 'Telefone inválido';
                isValid = false;
            }

            // Validação do CPF
            if (!this.validateCPF(this.form.cpf)) {
                this.errors.cpf = 'CPF inválido';
                isValid = false;
            }

            // Validação do CEP
            const cepNumeros = this.form.cep.replace(/\D/g, '');
            if (cepNumeros.length !== 8) {
                this.errors.cep = 'CEP inválido';
                isValid = false;
            }

            return isValid;
        },
        editarMembro(index) {
            const membroParaEditar = this.membrosFiltrados[index];
            this.editandoIndex = this.membros.findIndex(m => m.cpf === membroParaEditar.cpf);
            this.form = { ...membroParaEditar };
            this.currentView = 'cadastro';
        },
        apagarMembro(index) {
            if (confirm('Tem certeza que deseja apagar este membro?')) {
                const membroParaApagar = this.membrosFiltrados[index];
                const indexOriginal = this.membros.findIndex(m => m.cpf === membroParaApagar.cpf);
                this.membros.splice(indexOriginal, 1);
                localStorage.setItem('membros', JSON.stringify(this.membros));
            }
        },
        // Função para exportar backup
        exportarBackup() {
            const dados = localStorage.getItem('membros');
            const blob = new Blob([dados], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'backup_membros.json';
            a.click();
        },
        // Função para importar backup
        importarBackup(event) {
            const arquivo = event.target.files[0];
            const leitor = new FileReader();
            
            leitor.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    localStorage.setItem('membros', JSON.stringify(dados));
                    this.membros = dados;
                    alert('Backup importado com sucesso!');
                } catch (erro) {
                    alert('Erro ao importar backup');
                }
            };
            
            leitor.readAsText(arquivo);
        },
        mascaraTelefone(event) {
            let valor = event.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.slice(0, 11);
            
            // Aplica a máscara
            if (valor.length > 0) {
                valor = '(' + valor;
                if (valor.length > 3) {
                    valor = valor.slice(0, 3) + ') ' + valor.slice(3);
                }
                if (valor.length > 10) {
                    valor = valor.slice(0, 10) + '-' + valor.slice(10);
                }
            }
            
            this.form.telefone = valor;
        },
        mascaraCPF(event) {
            let valor = event.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.slice(0, 11);
            
            // Aplica a máscara
            if (valor.length > 0) {
                valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
                valor = valor.replace(/(\d{3})(\d)/, '$1.$2');
                valor = valor.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            
            this.form.cpf = valor;
        },
        mascaraCEP(event) {
            let valor = event.target.value.replace(/\D/g, '');
            if (valor.length > 8) valor = valor.slice(0, 8);
            
            // Aplica a máscara
            if (valor.length > 5) {
                valor = valor.slice(0, 5) + '-' + valor.slice(5);
            }
            
            this.form.cep = valor;
            
            // Se completou o CEP (8 dígitos numéricos), busca o endereço
            if (valor.replace(/\D/g, '').length === 8) {
                this.buscarEndereco();
            }
        }
    }
}).mount('#app');