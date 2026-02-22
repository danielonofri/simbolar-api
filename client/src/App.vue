<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// --- 1. CONFIGURACIÓN Y ESTADO ---
const API_BASE = 'https://simbolar-api-1bc5.onrender.com/api/Sensores';
const solapaActiva = ref('monitoreo'); // 'monitoreo', 'tecnico', 'info'

const distanciaReal = ref(0);
const sensor_m_val = ref(30);
const porcentaje = ref(0);
const altura = ref(0);
const lcdEncendido = ref(true);
const cargando = ref(false);
const errorApi = ref('');
const rawData = ref('');
const datosCompletos = ref(null);

const relays = ref({
  relay1ON: false,
  relay2ON: false,
  relay3ON: false,
  relay4ON: false
});

// --- 2. LÓGICA COMPUTADA ---
const colorAgua = computed(() => {
  const distanciaAlSensor = 300 - altura.value;
  if (altura.value > 0 && distanciaAlSensor <= 30) {
    return '#f1c40f'; // AMARILLO (Alerta Sensor)
  }
  return porcentaje.value < 20 ? '#e74c3c' : '#3498db'; // ROJO o AZUL
});

const bitsDevices = computed(() => {
  const num = datosCompletos.value?.Sensores?.p_in || 0;
  return num.toString(2).padStart(8, '0').split('').map(bit => bit === '1');
});

// --- 3. MÉTODOS ---
const obtenerDatos = async () => {
  try {
    const respuesta = await axios.get(`${API_BASE}/estado`);
    const raiz = respuesta.data.devolver;

    if (raiz) {
      datosCompletos.value = raiz;
      rawData.value = JSON.stringify(raiz, null, 2);

      if (raiz.Sensores) {
        altura.value = raiz.Sensores.altura_agua || 0;
        porcentaje.value = raiz.Sensores.porcentaje || 0;
        distanciaReal.value = raiz.Sensores.distancia || 0;
        sensor_m_val.value = raiz.Sensores.sensor_m || 30;
      }

      if (raiz.Comandos) {
        relays.value = {
          relay1ON: raiz.Comandos.relay1ON,
          relay2ON: raiz.Comandos.relay2ON,
          relay3ON: raiz.Comandos.relay3ON,
          relay4ON: raiz.Comandos.relay4ON
        };
        lcdEncendido.value = raiz.Comandos.lcd;
      }
    }
  } catch (e) {
    console.error("Error capturando datos:", e);
  }
};

const alternarLCD = async () => {
  cargando.value = true;
  errorApi.value = '';
  const nuevoEstado = !lcdEncendido.value;

  const payload = {
    ...relays.value,
    lcd: nuevoEstado
  };

  try {
    await axios.post(`${API_BASE}/comandos`, payload);
    lcdEncendido.value = nuevoEstado;
  } catch (error) {
    console.error("Fallo POST:", error.response?.data || error.message);
    errorApi.value = 'Error al cambiar el LCD';
  } finally {
    cargando.value = false;
  }
};

const copiarAlPortapapeles = () => {
  navigator.clipboard.writeText(rawData.value)
    .then(() => alert("JSON copiado"))
    .catch(err => console.error('Error al copiar:', err));
};

onMounted(() => {
  obtenerDatos();
  setInterval(obtenerDatos, 3000);
});
</script>

<template>
  <div class="contenedor">
    <h1 class="titulo">AguaSimbolar</h1>

    <div class="tabs-header">
      <button @click="solapaActiva = 'monitoreo'" :class="{ activa: solapaActiva === 'monitoreo' }">📡 Antena</button>
      <button @click="solapaActiva = 'tecnico'" :class="{ activa: solapaActiva === 'tecnico' }">⚙️ Técnico</button>
      <button @click="solapaActiva = 'info'" :class="{ activa: solapaActiva === 'info' }">📜 Docs</button>
    </div>

    <div v-if="errorApi" class="error-banner">{{ errorApi }}</div>

    <div v-if="solapaActiva === 'monitoreo'" class="tab-content">
      <div class="tanque-cuerpo">
        <div class="agua" :style="{ height: porcentaje + '%', backgroundColor: colorAgua }">
          <div class="ola"></div>
        </div>
        <div class="texto-porcentaje">
          <div v-if="altura > 0 && (300 - altura) <= 30">
            <div style="font-size: 1.5rem;">⚠️</div>
            <div style="font-size: 0.5rem; font-weight: bold;">AVISO</div>
          </div>
          <div v-else>{{ porcentaje }}%</div>
        </div>
      </div>
      <p class="texto-altura">Nivel: {{ altura }} cm / {{ porcentaje }}%</p>

      <div class="controles">
        <button @click="alternarLCD" :class="['btn-lcd', lcdEncendido ? 'encendido' : 'apagado']" :disabled="cargando">
          {{ cargando ? '...' : (lcdEncendido ? 'Apagar LCD' : 'Encender LCD') }}
        </button>
      </div>
    </div>

    <div v-if="solapaActiva === 'tecnico'" class="tab-content">
      <div class="detalles-container" v-if="datosCompletos">
        <h3 class="subtitulo">📊 Diagnóstico en Tiempo Real</h3>
        <div class="card-detalle">
          <ul>
            <li><span>Distancia Bruta:</span> <strong>{{ distanciaReal }} cm</strong></li>
            <li>
              <span>Devices (p_in):</span>
              <div class="pulsos-display">
                <strong class="valor-decimal">{{ datosCompletos.Sensores.p_in }}</strong>
                <div class="bits-container">
                  <div v-for="(on, idx) in bitsDevices" :key="idx" :class="['bit-cuadrito', on ? 'on' : 'off']"></div>
                </div>
              </div>
            </li>
            <li><span>Botones Físicos:</span>
              <div class="botones-status">
                <div v-for="(val, key) in datosCompletos.Sensores.botones" :key="key"
                  :class="['indicador-boton', val ? 'activo' : 'inactivo']">
                  {{ key.toUpperCase() }}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="caja-negra-container">
        <div class="caja-negra-header">
          <span>RAW JSON DATA</span>
          <button @click="copiarAlPortapapeles" class="btn-copiar">📋 Copiar</button>
        </div>
        <pre class="caja-negra-content">{{ rawData }}</pre>
      </div>
    </div>

    <div v-if="solapaActiva === 'info'" class="tab-content info-md">
      <h2>🚀 AguaSimbolar v1.0</h2>
      <p>Sistema IoT de monitoreo hídrico con transmisión LoRa y gestión PWA en Vue 3.</p>

      <div class="info-seccion">
        <h3>📍 Arquitectura de Hardware</h3>
        <div class="info-card">
          <strong>Transmisor (Arduino Uno):</strong>
          <ul>
            <li>Sensor Ultrasónico: D3 (Trig) / D4 (Echo)</li>
            <li>LoRa: D10-D13, D9 (RST), D2 (DIO0)</li>
            <li>Entradas (p_in): A0-A3 (Digitalizadas)</li>
          </ul>
          <strong>Receptor (NodeMCU):</strong>
          <ul>
            <li>LCD I2C: D1 (SCL) / D2 (SDA)</li>
            <li>Comunicación: Serial Half-Duplex via LoRa</li>
          </ul>
        </div>
      </div>

      <div class="info-seccion">
        <h3>📦 Estructura de Datos (Payload)</h3>
        <pre class="code-block">struct Payload {
  float distancia; // Lectura real
  byte p_in;       // Estados de entrada
  byte p_out;      // Comandos de relé
};</pre>
      </div>

      <div class="info-seccion">
        <h3>🌐 API & Gestión</h3>
        <ul>
          <li><strong>Endpoint:</strong> <code>/api/Sensores/estado</code></li>
          <li><strong>Integridad:</strong> Gestionada por código en la aplicación.</li>
          <li><strong>Licencia:</strong> SaaS mensual/anual vinculada a hardware.</li>
        </ul>
      </div>

      <blockquote>
        El sistema utiliza una ventana de escucha (Listen Window) de 200ms para recibir comandos tras la transmisión
        LoRa.
      </blockquote>
    </div>
  </div>
</template>

<style scoped>
.contenedor {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background-color: #121212;
  color: white;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.titulo {
  font-weight: 300;
  margin-bottom: 20px;
  letter-spacing: 1px;
}

/* Tabs */
.tabs-header {
  display: flex;
  width: 100%;
  max-width: 400px;
  background: #1e1e1e;
  padding: 6px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}

.tabs-header button {
  flex: 1;
  background: transparent;
  border: none;
  color: #666;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.tabs-header button.activa {
  background: #3498db;
  color: white;
}

.tab-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: slideIn 0.3s ease-out;
}

/* Tanque Estilo PWA */
.tanque-cuerpo {
  position: relative;
  width: 170px;
  height: 240px;
  background-color: #ecf0f1;
  border: 5px solid #bdc3c7;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}

.agua {
  position: absolute;
  bottom: 0;
  width: 100%;
  transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.texto-porcentaje {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5rem;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.5);
  z-index: 5;
}

.controles {
  margin-top: 30px;
  width: 100%;
  max-width: 200px;
}

.btn-lcd {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.btn-lcd.encendido {
  background: #27ae60;
  color: white;
}

.btn-lcd.apagado {
  background: #c0392b;
  color: white;
}

/* Técnico y Bits */
.detalles-container {
  width: 100%;
  max-width: 400px;
  background: #1a1a1a;
  padding: 20px;
  border-radius: 15px;
  border: 1px solid #333;
}

.subtitulo {
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
  margin-bottom: 15px;
  font-size: 1rem;
  color: #3498db;
}

.bits-container {
  display: flex;
  gap: 2px;
  background: #000;
  padding: 3px;
  border: 1px solid #444;
}

.bit-cuadrito {
  width: 12px;
  height: 12px;
}

.bit-cuadrito.on {
  background: #2ecc71;
  box-shadow: 0 0 6px #2ecc71;
}

.bit-cuadrito.off {
  background: #222;
}

/* Caja Negra */
.caja-negra-container {
  margin-top: 20px;
  width: 100%;
  max-width: 400px;
  background: #0d0d0d;
  border-radius: 10px;
  border: 1px solid #222;
}

.caja-negra-content {
  text-align: left;
  padding: 15px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  color: #a6e22e;
  white-space: pre;
  overflow-x: auto;
}

/* Info Documentation */
.info-md {
  text-align: left;
  max-width: 450px;
  line-height: 1.6;
  color: #ddd;
}

.info-seccion {
  margin-bottom: 25px;
}

.info-card {
  background: #1e1e1e;
  padding: 15px;
  border-radius: 10px;
  border-left: 4px solid #3498db;
}

.code-block {
  background: #000;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  color: #f8f8f2;
  font-size: 0.8rem;
  margin: 10px 0;
}

blockquote {
  border-left: 4px solid #f1c40f;
  padding-left: 15px;
  margin: 20px 0;
  color: #aaa;
  font-style: italic;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>