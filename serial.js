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
        
        window.addEventListener('beforeunload', () => {
            if (this.isConnected) {
                this.disconnect();
            }
        });
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
            this.port = await navigator.serial.requestPort();
            
            const baudRate = parseInt(this.baudrateSelect.value);
            await this.port.open({ baudRate });
            
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

    displayData(data, type = 'incoming') {
        try {
            if (!this.terminal) return;

            let text = '';
            
            if (typeof data === 'string') {
                text = data;
            } else {
                const decoder = new TextDecoder();
                text = decoder.decode(data);
            }

            if (!text && text !== '\n') return;

            if (type === 'incoming') {
                if (!this.inputBuffer) {
                    this.inputBuffer = '';
                }
                
                this.inputBuffer += text;
                
                const lines = this.inputBuffer.split('\n');
                
                if (!text.endsWith('\n')) {
                    this.inputBuffer = lines.pop();
                } else {
                    this.inputBuffer = '';
                }
                
                lines.forEach(line => {
                    if (line.trim() === '') {
                        const emptyLine = document.createElement('div');
                        emptyLine.className = 'terminal-line';
                        emptyLine.style.height = '1.6em';
                        this.terminal.appendChild(emptyLine);
                        return;
                    }
                    
                    const lineDiv = document.createElement('div');
                    lineDiv.className = 'terminal-line';
                    lineDiv.style.whiteSpace = 'pre';
                    lineDiv.style.fontFamily = "'Courier New', monospace";
                    lineDiv.style.minHeight = '1.6em';
                    lineDiv.style.color = '#87ceeb';
                    
                    lineDiv.textContent = line;
                    
                    this.terminal.appendChild(lineDiv);
                });
                
            } else if (type === 'outgoing') {
                const timestamp = new Date().toLocaleTimeString();
                const lineDiv = document.createElement('div');
                lineDiv.className = 'terminal-line';
                lineDiv.style.whiteSpace = 'pre';
                lineDiv.style.fontFamily = "'Courier New', monospace";
                lineDiv.style.minHeight = '1.6em';
                lineDiv.style.color = '#ffa500';
                
                lineDiv.textContent = `[${timestamp}] > ${text}`;
                this.terminal.appendChild(lineDiv);
                
            } else if (type === 'error' || type === 'success') {
                const timestamp = new Date().toLocaleTimeString();
                const lineDiv = document.createElement('div');
                lineDiv.className = 'terminal-line';
                lineDiv.style.whiteSpace = 'pre';
                lineDiv.style.fontFamily = "'Courier New', monospace";
                lineDiv.style.minHeight = '1.6em';
                lineDiv.style.color = type === 'error' ? '#ff6b6b' : '#51cf66';
                
                lineDiv.textContent = `[${timestamp}] ${text}`;
                this.terminal.appendChild(lineDiv);
            }

            this.autoScroll();
            
        } catch (error) {
            console.error('Error en displayData:', error);
        }
    }

    autoScroll() {
        if (!this.terminal) return;
        
        const threshold = 100;
        const isNearBottom = this.terminal.scrollHeight - this.terminal.clientHeight <= this.terminal.scrollTop + threshold;
        
        if (isNearBottom) {
            setTimeout(() => {
                this.terminal.scrollTop = this.terminal.scrollHeight;
            }, 10);
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
            this.displayData(command, 'outgoing');
            
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

    handleDisconnection() {
        if (this.isConnected) {
            console.log('Manejando desconexión del puerto...');
            this.isConnected = false;
            
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
            
            this.updateUI();
            this.showMessage('🔌 Puerto serial desconectado', 'error');
        }
    }

    async disconnect() {
        console.log('Solicitando desconexión manual...');
        this.handleDisconnection();
    }

    clearTerminal() {
        this.terminal.innerHTML = '';
        this.inputBuffer = '';
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
            this.disconnect();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SerialMonitor();
});
