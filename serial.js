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
        
        // AGREGAR: Detectar cuando el puerto se desconecta
        this.port.addEventListener('disconnect', () => {
            console.log('Puerto desconectado físicamente');
            this.handleDisconnection();
        });
        
        this.isConnected = true;
        this.updateUI();
        this.startReading();
        
        this.showMessage('✅ Conectado al ESP32 - Listo para recibir comandos', 'success');
        
    } catch (error) {
        this.handleError(error);
    }
}

// MODIFICAR la función disconnect para ser más robusta
async disconnect() {
    console.log('Solicitando desconexión manual...');
    this.handleDisconnection();
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
    try {
        if (!this.terminal) return;

        let text = '';
        
        // Convertir datos a string
        if (typeof data === 'string') {
            text = data;
        } else {
            const decoder = new TextDecoder();
            text = decoder.decode(data);
        }

        // Limpiar y normalizar saltos de línea
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Si el texto está vacío después de limpiar, no hacer nada
        if (!text.trim() && text !== '\n') return;

        const timestamp = new Date().toLocaleTimeString();
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
            // Saltar líneas vacías excepto si son importantes para el formato
            if (line.trim() === '' && lines.length > 1 && index < lines.length - 1) {
                return;
            }

            const lineDiv = document.createElement('div');
            lineDiv.className = 'terminal-line';
            
            // Preservar espacios múltiples
            lineDiv.style.whiteSpace = 'pre';
            lineDiv.style.fontFamily = "'Courier New', monospace";
            lineDiv.style.minHeight = '1.6em';
            
            // Agregar timestamp solo a la primera línea de un bloque
            if (index === 0 && (type === 'incoming' || type === 'error' || type === 'success')) {
                lineDiv.innerHTML = `<span style="color: #888;">[${timestamp}] </span>`;
            } else if (type === 'outgoing' && index === 0) {
                lineDiv.innerHTML = `<span style="color: #ffa500;">[${timestamp}] &gt; </span>`;
            }
            
            // Aplicar colores según el tipo
            if (type === 'outgoing') {
                lineDiv.style.color = '#ffa500';
                lineDiv.textContent += line;
            } else if (type === 'error') {
                lineDiv.style.color = '#ff6b6b';
                lineDiv.textContent += line;
            } else if (type === 'success') {
                lineDiv.style.color = '#51cf66';
                lineDiv.textContent += line;
            } else {
                lineDiv.style.color = '#87ceeb';
                lineDiv.textContent += line;
            }
            
            this.terminal.appendChild(lineDiv);
        });

        // Auto-scroll mejorado
        this.autoScroll();
        
    } catch (error) {
        console.error('Error en displayData:', error);
    }
}

// AGREGAR esta nueva función para el auto-scroll
autoScroll() {
    if (!this.terminal) return;
    
    const threshold = 100; // Pixeles desde el fondo para considerar "cerca del final"
    const isNearBottom = this.terminal.scrollHeight - this.terminal.clientHeight <= this.terminal.scrollTop + threshold;
    
    if (isNearBottom) {
        setTimeout(() => {
            this.terminal.scrollTop = this.terminal.scrollHeight;
        }, 10);
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

async startReading() {
    try {
        while (this.port.readable && this.isConnected) {
            this.reader = this.port.readable.getReader();
            
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    
                    if (done) {
                        console.log('Lectura finalizada - puerto probablemente desconectado');
                        this.handleDisconnection();
                        break;
                    }
                    
                    if (value && value.length > 0) {
                        this.displayData(value, 'incoming');
                    }
                }
            } catch (error) {
                console.error('Error en lectura continua:', error);
                if (this.isConnected) {
                    this.handleDisconnection();
                }
            } finally {
                if (this.reader) {
                    this.reader.releaseLock();
                    this.reader = null;
                }
            }
        }
    } catch (error) {
        console.error('Error en startReading:', error);
        this.handleDisconnection();
    }
}

// AGREGAR esta nueva función para manejar desconexiones
handleDisconnection() {
    if (this.isConnected) {
        console.log('Manejando desconexión del puerto...');
        this.isConnected = false;
        
        // Limpiar recursos
        if (this.reader) {
            this.reader.cancel().catch(() => {});
            this.reader = null;
        }
        
        if (this.writer) {
            this.writer.releaseLock();
            this.writer = null;
        }
        
        if (this.port) {
            this.port.close().catch(() => {});
            this.port = null;
        }
        
        // Actualizar UI
        this.updateUI();
        this.showMessage('🔌 Puerto serial desconectado', 'error');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new SerialMonitor();

});

