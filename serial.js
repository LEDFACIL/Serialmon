class SerialMonitor {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.inputBuffer = '';
        this.autoScroll = true;
        this.showTimestamp = true;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkBrowserSupport();
        this.setupBaudrateHandlers();
    }

    initializeElements() {
        this.connectBtn = document.getElementById('connectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sendBtn = document.getElementById('sendBtn');
        this.commandInput = document.getElementById('commandInput');
        this.terminal = document.getElementById('terminal');
        this.status = document.getElementById('status');
        this.baudrateSelect = document.getElementById('baudrate');
        this.customBaudrateContainer = document.getElementById('customBaudrateContainer');
        this.customBaudrateInput = document.getElementById('customBaudrate');
        this.toggleScrollBtn = document.getElementById('toggleScrollBtn');
        this.toggleTimestampBtn = document.getElementById('toggleTimestampBtn');
    }

    setupBaudrateHandlers() {
        // Manejar cambio en el selector de baudrates
        this.baudrateSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                // Mostrar campo para baudrate personalizado
                this.customBaudrateContainer.style.display = 'flex';
                this.customBaudrateInput.focus();
            } else {
                // Ocultar campo personalizado
                this.customBaudrateContainer.style.display = 'none';
            }
        });

        // Validar baudrate personalizado mientras se escribe
        this.customBaudrateInput.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 300) {
                e.target.style.borderColor = '#ff6b6b';
            } else if (value > 4000000) {
                e.target.style.borderColor = '#ffa500';
                this.showMessage('⚠️ Baudrate muy alto. Algunos sistemas pueden no soportarlo.', 'error');
            } else {
                e.target.style.borderColor = '#51cf66';
            }
        });

        // Guardar baudrate personalizado cuando pierde el foco
        this.customBaudrateInput.addEventListener('blur', (e) => {
            let value = parseInt(e.target.value);
            if (!isNaN(value) && value >= 300) {
                this.showMessage(`✅ Baudrate personalizado configurado a ${value}`, 'success');
            }
        });

        // Permitir Enter en baudrate personalizado
        this.customBaudrateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.customBaudrateInput.blur();
            }
        });
    }

    attachEventListeners() {
        this.connectBtn.addEventListener('click', () => this.connect());
        this.clearBtn.addEventListener('click', () => this.clearTerminal());
        this.sendBtn.addEventListener('click', () => this.sendCommand());
        this.toggleScrollBtn.addEventListener('click', () => this.toggleAutoScroll());
        this.toggleTimestampBtn.addEventListener('click', () => this.toggleTimestamp());
        
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCommand();
        });
        
        this.terminal.addEventListener('scroll', () => {
            if (!this.autoScroll) {
                const isNearBottom = this.terminal.scrollHeight - this.terminal.scrollTop <= this.terminal.clientHeight + 50;
                if (isNearBottom) {
                    // Opcional: Podrías reactivar auto-scroll aquí si quieres
                }
            }
        });
    }

    getSelectedBaudrate() {
        const selectedValue = this.baudrateSelect.value;
        
        if (selectedValue === 'custom') {
            // Obtener valor del campo personalizado
            const customValue = parseInt(this.customBaudrateInput.value);
            
            // Validar el valor personalizado
            if (isNaN(customValue) || customValue < 300) {
                this.showError('❌ Baudrate personalizado inválido. Usa un valor de 300 o mayor.');
                return 115200; // Valor por defecto si es inválido
            }
            
            // Limitar a un máximo razonable (4M baud)
            if (customValue > 4000000) {
                this.showError('⚠️ Baudrate demasiado alto. Se usará 4000000 como máximo.');
                return 4000000;
            }
            
            return customValue;
        }
        
        return parseInt(selectedValue);
    }

    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        
        if (this.autoScroll) {
            this.toggleScrollBtn.innerHTML = '<span class="scroll-icon">⏸️</span> Pausar Scroll';
            this.toggleScrollBtn.title = "Pausar scroll automático";
            this.autoScrollToBottom();
            this.showMessage('✅ Scroll automático activado', 'success');
        } else {
            this.toggleScrollBtn.innerHTML = '<span class="scroll-icon">▶️</span> Activar Scroll';
            this.toggleScrollBtn.title = "Activar scroll automático";
            this.showMessage('⏸️ Scroll automático pausado', 'info');
        }
    }

    toggleTimestamp() {
        this.showTimestamp = !this.showTimestamp;
        
        if (this.showTimestamp) {
            this.toggleTimestampBtn.innerHTML = '<span class="timestamp-icon">🕐</span> Ocultar TS';
            this.toggleTimestampBtn.title = "Ocultar timestamp";
            this.showMessage('✅ Timestamp activado', 'success');
        } else {
            this.toggleTimestampBtn.innerHTML = '<span class="timestamp-icon">🕐</span> Mostrar TS';
            this.toggleTimestampBtn.title = "Mostrar timestamp";
            this.showMessage('⏱️ Timestamp desactivado', 'info');
        }
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
            
            // Obtener baudrate seleccionado
            const baudRate = this.getSelectedBaudrate();
            
            // Si ya está conectado, desconectar primero
            if (this.isConnected) {
                await this.handleDisconnection();
            }
            
            // Mostrar mensaje con baudrate seleccionado
            this.showMessage(`🔄 Buscando puertos seriales a ${baudRate} baud...`, 'info');
            
            // Solicitar puerto al usuario
            this.port = await navigator.serial.requestPort();
            console.log('Puerto seleccionado:', this.port);
            
            this.showMessage(`🔧 Configurando puerto a ${baudRate} baud...`, 'info');
            
            // Configurar el puerto con el baudrate seleccionado
            await this.port.open({ 
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            
            console.log(`Puerto abierto exitosamente a ${baudRate} baud`);
            
            // Configurar evento de desconexión
            this.port.addEventListener('disconnect', () => {
                console.log('Puerto desconectado físicamente');
                this.handleDisconnection();
            });
            
            this.isConnected = true;
            this.updateUI();
            
            this.showMessage(`✅ Conectado a ${baudRate} baud - Listo para recibir comandos`, 'success');
            
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
            } else if (error.name === 'InvalidAccessError') {
                this.showError('❌ Baudrate no soportado por el dispositivo');
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
            this.inputBuffer = lines.pop();
        } else {
            this.inputBuffer = '';
        }
        
        // Procesar líneas completas
        lines.forEach(line => {
            if (line === '') {
                this.displayData('\n', 'incoming');
            } else {
                this.displayData(line + '\n', 'incoming');
            }
        });
    }

    displayData(text, type = 'incoming') {
        try {
            if (!text || !this.terminal) return;

            const lineDiv = document.createElement('div');
            lineDiv.className = 'terminal-line';
            
            const timestamp = this.showTimestamp ? new Date().toLocaleTimeString() : '';
            
            if (type === 'outgoing') {
                if (this.showTimestamp) {
                    lineDiv.textContent = `[${timestamp}] > ${text}`;
                } else {
                    lineDiv.textContent = `> ${text}`;
                }
                lineDiv.style.color = '#ffa500';
            } else if (type === 'error') {
                if (this.showTimestamp) {
                    lineDiv.textContent = `[${timestamp}] ${text}`;
                } else {
                    lineDiv.textContent = text;
                }
                lineDiv.style.color = '#ff6b6b';
            } else if (type === 'success') {
                if (this.showTimestamp) {
                    lineDiv.textContent = `[${timestamp}] ${text}`;
                } else {
                    lineDiv.textContent = text;
                }
                lineDiv.style.color = '#51cf66';
            } else {
                if (this.showTimestamp) {
                    lineDiv.textContent = `[${timestamp}] ${text}`;
                } else {
                    lineDiv.textContent = text;
                }
                lineDiv.style.color = '#87ceeb';
            }
            
            this.terminal.appendChild(lineDiv);
            
            if (this.autoScroll) {
                this.autoScrollToBottom();
            }
            
        } catch (error) {
            console.error('Error en displayData:', error);
        }
    }

    autoScrollToBottom() {
        if (!this.terminal) return;
        
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
            this.displayData(command, 'outgoing');
            
            const encoder = new TextEncoder();
            const data = encoder.encode(command + '\r\n');
            
            this.writer = this.port.writable.getWriter();
            await this.writer.write(data);
            this.writer.releaseLock();
            this.writer = null;
            
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
        
        if (this.autoScroll) {
            this.autoScrollToBottom();
        }
    }

    updateUI() {
        if (this.isConnected) {
            this.connectBtn.disabled = false;
            this.connectBtn.textContent = '🔄 Reconectar';
            this.sendBtn.disabled = false;
            this.commandInput.disabled = false;
            this.toggleScrollBtn.disabled = false;
            this.toggleTimestampBtn.disabled = false;
            this.baudrateSelect.disabled = true;
            this.customBaudrateInput.disabled = true;
            
            this.status.className = 'status connected';
            this.status.innerHTML = '<span class="status-icon">🟢</span><span class="status-text">Conectado</span>';
        } else {
            this.connectBtn.disabled = false;
            this.connectBtn.textContent = '🔗 Conectar Puerto Serial';
            this.sendBtn.disabled = true;
            this.commandInput.disabled = true;
            this.toggleScrollBtn.disabled = true;
            this.toggleTimestampBtn.disabled = true;
            this.baudrateSelect.disabled = false;
            this.customBaudrateInput.disabled = false;
            
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
