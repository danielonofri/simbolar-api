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
    return '#f1c40f'; // AMARILLO (Alerta cercanía sensor)
  }
  return porcentaje.value < 20 ? '#e74c3c' : '#3498db'; // ROJO o AZUL
});

// Representación de exactamente 5 bits para los devices
const bitsDevices = computed(() => {
  const num = datosCompletos.value?.Sensores?.p_in || 0;
  return num.toString(2).padStart(5, '0').split('').slice(-5).map(bit => bit === '1');
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
    errorApi.value = 'Error de conexión con la API';
  }
};

const alternarLCD = async () => {
  cargando.value = true;
  errorApi.value = '';
  const nuevoEstado = !lcdEncendido.value;
  const payload = { ...relays.value, lcd: nuevoEstado };

  try {
    await axios.post(`${API_BASE}/comandos`, payload);
    lcdEncendido.value = nuevoEstado;
  } catch (error) {
    errorApi.value = 'Error al cambiar el LCD';
  } finally {
    cargando.value = false;
  }
};

const copiarAlPortapapeles = () => {
  navigator.clipboard.writeText(rawData.value).then(() => alert("JSON copiado"));
};

onMounted(() => {
  obtenerDatos();
  setInterval(obtenerDatos, 3000);
});
</script>

<template>
  <div class="contenedor-pwa">
    <header class="header">
      <h1 class="titulo">AguaSimbolar</h1>
      <nav class="tabs-nav">
        <button @click="solapaActiva = 'monitoreo'" :class="{ activa: solapaActiva === 'monitoreo' }">📡
          Monitor</button>
        <button @click="solapaActiva = 'tecnico'" :class="{ activa: solapaActiva === 'tecnico' }">⚙️ Técnico</button>
        <button @click="solapaActiva = 'info'" :class="{ activa: solapaActiva === 'info' }">📜 Docs</button>
      </nav>
    </header>

    <main class="contenido-pPrincipal">
      <div v-if="errorApi" class="banner-error">{{ errorApi }}</div>

      <section v-if="solapaActiva === 'monitoreo'" class="tab-fade">
        <div class="tanque-visual">
          <div class="tanque-cuerpo">
            <div class="agua" :style="{ height: porcentaje + '%', backgroundColor: colorAgua }">
              <div class="ola"></div>
            </div>
            <div class="texto-central">
              <div v-if="altura > 0 && (300 - altura) <= 30">⚠️</div>
              <div v-else>{{ porcentaje }}%</div>
            </div>
          </div>
          <p class="stats-texto">Nivel: {{ altura }} cm | {{ porcentaje }}%</p>
        </div>

        <div class="panel-controles">
          <button @click="alternarLCD" :class="['btn-accion', lcdEncendido ? 'on' : 'off']" :disabled="cargando">
            {{ cargando ? '...' : (lcdEncendido ? 'Apagar Display' : 'Encender Display') }}
          </button>
        </div>
      </section>

      <section v-if="solapaActiva === 'tecnico'" class="tab-fade">
        <div class="card-tecnica" v-if="datosCompletos">
          <h3>📊 Diagnóstico en Tiempo Real</h3>
          <ul class="lista-diagnostico">
            <li>
              <span>Distancia Bruta:</span>
              <strong>{{ distanciaReal }} cm</strong>
            </li>
            <li>
              <span>Devices (p_in):</span>
              <div class="display-bits">
                <div class="bits-fila">
                  <div v-for="(on, i) in bitsDevices" :key="i" :class="['bit-fijo', on ? 'on' : 'off']"></div>
                </div>
                <span class="valor-decimal">{{ datosCompletos.Sensores.p_in }}</span>
              </div>
            </li>
            <li>
              <span>Botones Físicos:</span>
              <div class="botones-fila">
                <div v-for="(val, key) in datosCompletos.Sensores.botones" :key="key"
                  :class="['status-pill', val ? 'act' : 'inact']">
                  {{ key.toUpperCase() }}
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="caja-negra">
          <div class="caja-header">
            <span>RAW DATA</span>
            <button @click="copiarAlPortapapeles" class="btn-mini">COPIAR</button>
          </div>
          <pre class="json-code">{{ rawData }}</pre>
        </div>
      </section>

      <section v-if="solapaActiva === 'info'" class="tab-fade docs-container">
        <div class="info-block">
          <h2>🚀 Arquitectura del Sistema</h2>
          <p>Proyecto <strong>AguaSimbolar V1.0</strong>.</p>
          <ul>
            <li><strong>Transmisor (Arduino Uno):</strong> Gestión de medición física.</li>
            <li><strong>Receptor (NodeMCU):</strong> Cerebro central y comunicación API.</li>
            <li><strong>Transmisión:</strong> LoRa con ventana de escucha de 200ms.</li>
          </ul>
        </div>

        <div class="info-block technical">
          <h3>🔧 Hardware Config</h3>
          <p><strong>Pines Uno:</strong> D3/D4 (Ultrasonic), A0-A3 (Input Buttons).</p>
          <p><strong>Pines NodeMCU:</strong> D1/D2 (I2C LCD).</p>
        </div>

        <blockquote class="nota-tecnica">
          "La verdad reside en la memoria del NodeMCU; el sistema opera de forma volátil sin base de datos".
        </blockquote>
      </section>
    </main>
  </div>
</template>

<style scoped>
.contenedor-pwa {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #121212;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.header {
  padding: 20px 0;
  background: #1a1a1a;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  position: sticky;
  top: 0;
  z-index: 100;
}

.titulo {
  text-align: center;
  font-weight: 300;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.tabs-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
}

.tabs-nav button {
  padding: 10px 15px;
  border-radius: 8px;
  border: none;
  background: #2a2a2a;
  color: #888;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.tabs-nav button.activa {
  background: #3498db;
  color: white;
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.4);
}

.contenido-pPrincipal {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Tanque */
.tanque-cuerpo {
  position: relative;
  width: 170px;
  height: 240px;
  background: #ecf0f1;
  border: 4px solid #bdc3c7;
  border-radius: 20px;
  overflow: hidden;
  margin: 0 auto;
}

.agua {
  position: absolute;
  bottom: 0;
  width: 100%;
  transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.texto-central {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5rem;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.5);
}

.stats-texto {
  text-align: center;
  margin-top: 10px;
  color: #7f8c8d;
}

/* Controles */
.panel-controles {
  margin-top: 30px;
  width: 100%;
  max-width: 250px;
}

.btn-accion {
  width: 100%;
  padding: 15px;
  border-radius: 50px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.btn-accion.on {
  background: #27ae60;
  color: white;
}

.btn-accion.off {
  background: #7f8c8d;
  color: white;
}

/* Tarjeta Técnica */
.card-tecnica {
  background: #1a1a1a;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid #333;
  width: 100%;
  max-width: 380px;
}

.lista-diagnostico {
  list-style: none;
  padding: 0;
}

.lista-diagnostico li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #2a2a2a;
}

/* Bits Visuales (Solo 5) */
.display-bits {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bits-fila {
  display: flex;
  gap: 2px;
  background: #000;
  padding: 2px;
  border: 1px solid #444;
}

.bit-fijo {
  width: 12px;
  height: 12px;
  background: #222;
}

.bit-fijo.on {
  background: #2ecc71;
  box-shadow: 0 0 5px #2ecc71;
}

/* Botones Físicos */
.botones-fila {
  display: flex;
  gap: 4px;
}

.status-pill {
  padding: 4px 8px;
  font-size: 0.7rem;
  font-weight: bold;
  border-radius: 4px;
}

.status-pill.act {
  background: #27ae60;
  color: white;
}

.status-pill.inact {
  background: #333;
  color: #777;
}

/* Caja Negra */
.caja-negra {
  margin-top: 20px;
  width: 100%;
  max-width: 380px;
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}

.caja-header {
  background: #222;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #666;
}

.json-code {
  padding: 15px;
  font-family: 'Consolas', monospace;
  font-size: 0.8rem;
  color: #a6e22e;
  text-align: left;
  white-space: pre;
  overflow-x: auto;
}

/* Docs */
.docs-container {
  text-align: left;
  max-width: 450px;
}

.info-block {
  margin-bottom: 25px;
}

.nota-tecnica {
  border-left: 4px solid #f1c40f;
  padding-left: 15px;
  color: #aaa;
  font-style: italic;
}

.tab-fade {
  animation: fadeIn 0.3s ease-out;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>