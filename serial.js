class SerialMonitor {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.inputBuffer = '';
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkBrowserSupport();
    }

    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.commandInput = document.getElementById('commandInput');
        this.terminal = document.getElementById('terminal');
        this.status = document.getElementById('status');
        this.baudrateSelect = document.getElementById('baudrate');
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.clearBtn.addEventListener('click', () => this.clearTerminal());
        this.sendBtn.addEventListener('click', () => this.sendCommand());
        
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });
    }

    checkBrowserSupport() {
        if (!('serial' in navigator)) {
            this.showError('❌ Web Serial API no es soportada por este navegador. Usa Chrome, Edge u Opera.');
            this.connectBtn.disabled = true;
            this.connectBtn.textContent = '❌ Navegador no compatible';
        } else {
            this.showMessage('✅ Navegador compatible con Web Serial API', 'success');
        }
    }

    async connect() {
        try {
            console.log('Iniciando conexión serial...');
            
            // Si ya está conectado, desconectar primero
            if (this.isConnected) {
                await this.handleDisconnection();
            }
            
            // Mostrar mensaje de ayuda
            this.showMessage('🔄 Buscando puertos seriales disponibles...', 'info');
            
            // Solicitar puerto al usuario
            this.port = await navigator.serial.requestPort();
            console.log('Puerto seleccionado:', this.port);
            
            const baudRate = parseInt(this.baudrateSelect.value);
            this.showMessage(`🔧 Configurando puerto a ${baudRate} baud...`, 'info');
            
            // Configurar el puerto
            await this.port.open({ 
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            
            console.log('Puerto abierto exitosamente');
            
            // Configurar evento de desconexión
            this.port.addEventListener('disconnect', () => {
                console.log('Puerto desconectado físicamente');
                this.handleDisconnection();
            });
            
            this.isConnected = true;
            this.updateUI();
            
            this.showMessage('✅ Conectado - Listo para recibir comandos', 'success');
            
            // Actualizar texto del botón de conexión
            this.connectBtn.textContent = '🔄 Reconectar';
            
            // Iniciar lectura en segundo plano
            this.startReading().catch(error => {
                console.error('Error en lectura:', error);
                this.handleError(error);
            });
            
        } catch (error) {
            console.error('Error en conexión:', error);
            if (error.name === 'NotFoundError') {
                this.showError('❌ No se seleccionó ningún puerto');
            } else if (error.name === 'InvalidStateError') {
                this.showError('❌ El puerto ya está abierto');
            } else if (error.name === 'NetworkError') {
                this.showError('❌ Error de red al acceder al puerto');
            } else {
                this.showError(`❌ Error de conexión: ${error.message}`);
            }
        }
    }

    async startReading() {
        if (!this.port || !this.port.readable) {
            throw new Error('Puerto no disponible para lectura');
        }

        try {
            this.reader = this.port.readable.getReader();
            const decoder = new TextDecoder();
            
            console.log('Iniciando lectura continua...');
            
            while (this.isConnected) {
                try {
                    const { value, done } = await this.reader.read();
                    
                    if (done) {
                        console.log('Lectura finalizada por el sistema');
                        break;
                    }
                    
                    if (value && value.length > 0) {
                        const text = decoder.decode(value);
                        this.processIncomingData(text);
                    }
                    
                } catch (readError) {
                    if (this.isConnected) {
                        console.error('Error leyendo datos:', readError);
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error en startReading:', error);
            throw error;
        } finally {
            if (this.reader) {
                this.reader.releaseLock();
                this.reader = null;
            }
        }
    }

    processIncomingData(text) {
        if (!this.inputBuffer) {
            this.inputBuffer = '';
        }
        
        this.inputBuffer += text;
        
        // Dividir en líneas pero mantener el buffer para líneas incompletas
        const lines = this.inputBuffer.split('\n');
        
        // Si el último carácter no es \n, la última línea está incompleta
        if (!text.endsWith('\n') && lines.length > 0) {
            this.inputBuffer = lines.pop(); // Guardar la línea incompleta
        } else {
            this.inputBuffer = ''; // Reset si terminó con \n
        }
        
        // Procesar líneas completas
        lines.forEach(line => {
            if (line === '') {
                // Línea vacía, solo mostrar salto de línea
                this.displayData('\n', 'incoming');
            } else {
                // Mostrar línea con salto de línea
                this.displayData(line + '\n', 'incoming');
            }
        });
    }

    displayData(text, type = 'incoming') {
        try {
            if (!text || !this.terminal) return;

            const lineDiv = document.createElement('div');
            lineDiv.className = 'terminal-line';
            
            if (type === 'outgoing') {
                // Comando enviado por el usuario
                const timestamp = new Date().toLocaleTimeString();
                lineDiv.textContent = `[${timestamp}] > ${text}`;
                lineDiv.style.color = '#ffa500';
            } else if (type === 'error') {
                // Mensaje de error
                const timestamp = new Date().toLocaleTimeString();
                lineDiv.textContent = `[${timestamp}] ${text}`;
                lineDiv.style.color = '#ff6b6b';
            } else if (type === 'success') {
                // Mensaje de éxito
                const timestamp = new Date().toLocaleTimeString();
                lineDiv.textContent = `[${timestamp}] ${text}`;
                lineDiv.style.color = '#51cf66';
            } else {
                // Datos entrantes del ESP32 - SIN TIMESTAMP
                lineDiv.textContent = text;
                lineDiv.style.color = '#87ceeb';
            }
            
            this.terminal.appendChild(lineDiv);
            this.autoScroll();
            
        } catch (error) {
            console.error('Error en displayData:', error);
        }
    }

    autoScroll() {
        if (!this.terminal) return;
        
        // Scroll suave al final
        setTimeout(() => {
            this.terminal.scrollTop = this.terminal.scrollHeight;
        }, 10);
    }

    async sendCommand() {
        if (!this.isConnected || !this.port || !this.port.writable) {
            this.showError('❌ No hay conexión serial activa');
            return;
        }

        const command = this.commandInput.value.trim();
        if (!command) return;

        try {
            // Mostrar comando en terminal
            this.displayData(command, 'outgoing');
            
            // Enviar comando al ESP32
            const encoder = new TextEncoder();
            const data = encoder.encode(command + '\r\n'); // \r\n para compatibilidad
            
            this.writer = this.port.writable.getWriter();
            await this.writer.write(data);
            this.writer.releaseLock();
            this.writer = null;
            
            // Limpiar input
            this.commandInput.value = '';
            this.commandInput.focus();
            
        } catch (error) {
            console.error('Error enviando comando:', error);
            this.showError(`❌ Error enviando comando: ${error.message}`);
        }
    }

    handleDisconnection() {
        if (this.isConnected) {
            console.log('Manejando desconexión...');
            this.isConnected = false;
            
            // Limpiar recursos
            if (this.reader) {
                this.reader.cancel().catch(() => {});
                this.reader.releaseLock().catch(() => {});
                this.reader = null;
            }
            
            if (this.writer) {
                this.writer.releaseLock().catch(() => {});
                this.writer = null;
            }
            
            if (this.port) {
                this.port.close().catch(() => {});
                this.port = null;
            }
            
            this.inputBuffer = '';
            this.updateUI();
            this.showMessage('🔌 Puerto serial desconectado', 'error');
        }
    }

    clearTerminal() {
        if (this.terminal) {
            this.terminal.innerHTML = '';
        }
        this.inputBuffer = '';
    }

    updateUI() {
        if (this.isConnected) {
            this.connectBtn.disabled = false;
            this.connectBtn.textContent = '🔄 Reconectar';
            this.sendBtn.disabled = false;
            this.commandInput.disabled = false;
            
            this.status.className = 'status connected';
            this.status.innerHTML = '<span class="status-icon">🟢</span><span class="status-text">Conectado</span>';
        } else {
            this.connectBtn.disabled = false;
            this.connectBtn.textContent = '🔗 Conectar Puerto Serial';
            this.sendBtn.disabled = true;
            this.commandInput.disabled = true;
            
            this.status.className = 'status disconnected';
            this.status.innerHTML = '<span class="status-icon">🔴</span><span class="status-text">Desconectado</span>';
        }
    }

    showMessage(message, type = 'info') {
        this.displayData(message, type);
    }

    showError(message) {
        this.displayData(message, 'error');
        console.error('Serial Monitor Error:', message);
    }

    handleError(error) {
        const errorMessage = error.message || 'Error desconocido';
        this.showError(errorMessage);
        
        if (this.isConnected) {
            this.handleDisconnection();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.serialMonitor = new SerialMonitor();
    console.log('Serial Monitor inicializado');
});
