# Serial Monitor Online 🌐🔌

**Serial Monitor Online** es una herramienta web gratuita que te permite monitorear y comunicarte con microcontroladores (PICs, Arduino, ESP32, Raspberry Pi Pico, STM, etc.) **directamente desde tu navegador**, sin necesidad de instalar software localmente en tu computadora.

[![Acceder a Serialmon Online](https://img.shields.io/badge/🚀_Acceder_a_Serialmon_Online-007ACC?style=for-the-badge&logo=google-chrome&logoColor=white)](https://ledfacil.github.io/Serialmon/)

## ✨ ¿Por qué usar Serialmon?

- **✅ Cero instalación**: Solo necesitas un browser (navegador) actual como Brave, Chrome, Edge, Opera.. u otros derivados Chromium.
- **✅ Universal**: Funciona con Arduino, ESP32, ESP8266, STM32, Raspberry Pi Pico, PICs, y cualquier dispositivo con comunicaciones serial.
- **✅ En tiempo real**: Los puertos COM se detectan dinámicamente al conectar/desconectar.
- **✅ Familiar**: Interfaz similar al monitor serial del IDE de Arduino, pero en la web.
- **✅ Multiplataforma**: Windows, macOS, Linux, ChromeOS.

## 🚀 Empezar en 3 pasos

1.  **Conecta** tu microcontrolador, sistema o dispositivo serial a tu computadora por USB.
2.  **Abre** [Serialmon](https://ledfacil.github.io/Serialmon/) en tu navegador.
3.  **Haz clic en "Conectar Puerto Serial"**, selecciona tu puerto COM y ¡listo!

### 🔍 **¡La selección del puerto es en tiempo real!**
Mientras el cuadro de diálogo para elegir el puerto COM está abierto, si **enchufas o desenchufas** un dispositivo, lo verás **aparecer o desaparecer al instante** de la lista. No es necesario cerrar y reabrir la ventana.

## 🛠️ Pero... ¿Cómo es posible desde el navegador? 😳😱

Serialmon utiliza la poderosa **Web Serial API**, un estándar web que permite a las aplicaciones web comunicarse con dispositivos seriales de forma segura. Es la misma tecnología que usa **ESPHome** y otras herramientas profesionales.

**Beneficios de esta tecnología:**
- **Acceso directo y seguro**: El navegador gestiona los permisos, sin intermediarios.
- **Comunicación en tiempo real**: Los datos van desde tu placa a la pantalla con latencia mínima.
- **Multiplataforma**: Funciona en cualquier sistema operativo que tenga un navegador compatible.

## ⚙️ Solución de problemas

### 🔌 Si no ves tu puerto COM...
Si tu dispositivo no aparece en la lista, generalmente se debe a que necesita un **controlador (driver) USB** específico.

1.  **Reconocimiento básico**: Asegúrate de que el cable USB es de datos y de que el dispositivo tiene alimentación.
2.  **Instalación de drivers**:
    - **Arduino UNO/Nano**: Usa el driver **CH340**. [Descargar aquí](https://www.wch-ic.com/downloads/CH341SER_EXE.html).
    - **ESP32/ESP8266 (NodeMCU)**: Por lo general, no requieren driver adicional en sistemas modernos. Si es necesario, usa el driver **CP210x** o **CH9102**. [Descargar CP210x](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).
    - **Dispositivos con FTDI**: [Driver FTDI VCP](https://ftdichip.com/drivers/vcp-drivers/).

> 💡 **Foros de referencia**: Para ayuda específica con drivers, puedes consultar comunidades como:
> - [Foro de Arduino en español](https://forum.arduino.cc/c/internacional/espanol/138)
> - [ESP32.com Forum](https://www.esp32.com/)
> - [Stack Overflow](https://stackoverflow.com/questions/tagged/serial-port)

## 📚 Aprende más y descubre

### 🎥 Programa un ESP32 desde el Navegador
¿Sabías que con esta misma familia de tecnologías web también **puedes programar microcontroladores**?
Mira mi serie de videos donde explico cómo programar un **ESP32 directamente desde el navegador**, sin instalar el IDE de Arduino:

[![Ver Playlist en YouTube](https://img.shields.io/badge/▶️_Ver_Playlist_Completa-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/playlist?list=PLyXDLkOhTlfVUzkYBZdUbPJaj_n_1Pc0r)

## 👨‍💻 Acerca del Proyecto

Serialmon es un proyecto de código abierto creado para simplificar el desarrollo con microcontroladores. Su objetivo es hacer que la experimentación y el prototipado sean más accesibles para todos.

- **Repo**: [github.com/LEDFACIL/Serialmon](https://github.com/LEDFACIL/Serialmon)

---

### 🤓 By **Damián G. Lasso** 🌐 [LASSO-TECH](https://lasso-tech.com/) Electrónica aplicada & soluciones.

