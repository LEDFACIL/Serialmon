class SerialMonitor {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkBrowserSupport();
    }

    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.commandInput = document.getElementById('commandInput');
        this.terminal = document.getElementById('terminal');
        this.status = document.getElementById('status');
        this.baudrateSelect = document.getElementById('baudrate');
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.clearBtn.addEventListener('click', () => this.clearTerminal());
        this.sendBtn.addEventListener('click', () => this.sendCommand());
        
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });
    }

    checkBrowserSupport() {
        if (!('serial' in navigator)) {
            this.showError('Web Serial API no es soportada por este navegador. Usa Chrome, Edge u Opera.');
            this.connectBtn.disabled = true;
        }
    }

    async connect() {
        try {
            // Solicitar puerto al usuario
            this.port = await navigator.serial.requestPort();
            
            const baudRate = parseInt(this.baudrateSelect.value);
            await this.port.open({ baudRate });
            
            this.isConnected = true;
            this.updateUI();
            this.startReading();
            
            this.showMessage('✅ Conectado al ESP32 - Listo para recibir comandos', 'success');
            
        } catch (error) {
            this.handleError(error);
        }
    }

    async startReading() {
        try {
            while (this.port.readable && this.isConnected) {
                this.reader = this.port.readable.getReader();
                
                try {
                    while (true) {
                        const { value, done } = await this.reader.read();
                        if (done) break;
                        
                        this.displayData(value, 'incoming');
                    }
                } catch (error) {
                    if (this.isConnected) {
                        this.handleError(error);
                    }
                } finally {
                    this.reader.releaseLock();
                }
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    async sendCommand() {
        if (!this.isConnected || !this.port.writable) {
            this.showError('No hay conexión serial activa');
            return;
        }

        const command = this.commandInput.value.trim();
        if (!command) return;

        try {
            this.displayData(command + '\n', 'outgoing');
            
            this.writer = this.port.writable.getWriter();
            const encoder = new TextEncoder();
            await this.writer.write(encoder.encode(command + '\r\n'));
            this.writer.releaseLock();
            this.writer = null;
            
            this.commandInput.value = '';
            this.commandInput.focus();
            
        } catch (error) {
            this.handleError(error);
        }
    }

    displayData(data, type = 'incoming') {
    const div = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    
    if (typeof data === 'string') {
        // Limpiar y formatear el texto
        const cleanData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        div.textContent = cleanData;
    } else {
        // Convertir Uint8Array a string
        const decoder = new TextDecoder();
        const text = decoder.decode(data);
        const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        div.textContent = cleanText;
    }
    
    // Aplicar estilos según el tipo
    if (type === 'outgoing') {
        div.className = 'command-outgoing';
        // Agregar indicador de comando enviado
        div.innerHTML = `<span style="color: #ffa500;">[${timestamp}] &gt; </span>${div.innerHTML}`;
    } else if (type === 'error') {
        div.className = 'error';
    } else if (type === 'success') {
        div.className = 'success';
    } else {
        div.className = 'data-incoming';
        // Agregar timestamp a datos entrantes
        div.innerHTML = `<span style="color: #888;">[${timestamp}] </span>${div.innerHTML}`;
    }
    
    this.terminal.appendChild(div);
    
    // Auto-scroll solo si ya está cerca del final
    const isNearBottom = this.terminal.scrollHeight - this.terminal.clientHeight <= this.terminal.scrollTop + 50;
    if (isNearBottom) {
        this.terminal.scrollTop = this.terminal.scrollHeight;
    }
}

    async disconnect() {
        this.isConnected = false;
        
        if (this.reader) {
            await this.reader.cancel();
            this.reader = null;
        }
        
        if (this.writer) {
            this.writer.releaseLock();
            this.writer = null;
        }
        
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
        
        this.updateUI();
        this.showMessage('🔴 Desconectado del puerto serial', 'disconnected');
    }

    clearTerminal() {
        this.terminal.innerHTML = '';
    }

    updateUI() {
        if (this.isConnected) {
            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
            this.sendBtn.disabled = false;
            this.commandInput.disabled = false;
            
            this.status.className = 'status connected';
            this.status.innerHTML = '<span class="status-icon">🟢</span><span class="status-text">Conectado</span>';
        } else {
            this.connectBtn.disabled = false;
            this.disconnectBtn.disabled = true;
            this.sendBtn.disabled = true;
            this.commandInput.disabled = true;
            
            this.status.className = 'status disconnected';
            this.status.innerHTML = '<span class="status-icon">🔴</span><span class="status-text">Desconectado</span>';
        }
    }

    showMessage(message, type = 'info') {
        this.displayData(`[${new Date().toLocaleTimeString()}] ${message}\n`, type);
    }

    showError(message) {
        this.displayData(`[ERROR] ${message}\n`, 'error');
        console.error('Serial Monitor Error:', message);
    }

    handleError(error) {
        const errorMessage = error.message || 'Error desconocido';
        this.showError(errorMessage);
        
        if (this.isConnected) {
            this.disconnect();
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new SerialMonitor();

});
