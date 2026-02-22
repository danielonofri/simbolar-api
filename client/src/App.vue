<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
const distanciaReal = ref(0);
const sensor_m_val = ref(30); // Margen de seguridad definido en tu server.js
// --- 1. CONFIGURACIÓN DE LA API ---
const API_BASE = 'https://simbolar-api-1bc5.onrender.com/api/Sensores';

// --- 2. ESTADO DE LA APLICACIÓN ---
const porcentaje = ref(0)
const altura = ref(0)
const lcdEncendido = ref(true)
const cargando = ref(false)
const errorApi = ref('')
const rawData = ref('');
const mostrarCajaNegra = ref(false);

const relays = ref({
  relay1ON: false,
  relay2ON: false,
  relay3ON: false,
  relay4ON: false
})

const colorAgua = computed(() => {
  // Según tu JSON: tank_h (300) - altura_agua (330 en tu ejemplo) = distancia
  // Si esa diferencia es menor o igual a 30 (sensor_m), amarillo.
  const distanciaAlSensor = 300 - altura.value;

  if (altura.value > 0 && distanciaAlSensor <= 30) {
    return '#f1c40f'; // AMARILLO
  }
  return porcentaje.value < 20 ? '#e74c3c' : '#3498db';
});
const datosCompletos = ref(null); // Para la "caja negra" o solapa de detalles
const obtenerDatos = async () => {
  try {
    const respuesta = await axios.get(`${API_BASE}/estado`);
    const raiz = respuesta.data.devolver;

    if (raiz) {
      datosCompletos.value = raiz; // Guardamos todo para la solapa
      rawData.value = JSON.stringify(raiz, null, 2); // Para el debug

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
  } catch (e) { console.error("Error capturando datos:", e); }
};

const alternarLCD = async () => {
  cargando.value = true;
  errorApi.value = '';

  const nuevoEstado = !lcdEncendido.value;

  const payload = {
    relay1ON: relays.value.relay1ON,
    relay2ON: relays.value.relay2ON,
    relay3ON: relays.value.relay3ON,
    relay4ON: relays.value.relay4ON,
    lcd: nuevoEstado
  };

  try {
    // 1. Enviamos el comando a la API
    await axios.post(`${API_BASE}/comandos`, payload);

    // 2. Si la API responde OK, actualizamos la interfaz
    lcdEncendido.value = nuevoEstado;
    cargando.value = false;
  } catch (error) {
    // 3. Si hay error, lo mostramos en la consola para saber qué falló
    console.error("DETALLE DEL FALLO:", error.response?.data || error.message);

    errorApi.value = 'Error al cambiar el LCD';
    cargando.value = false;
  }
};

// --- 6. AL INICIAR ---
onMounted(() => {
  obtenerDatos();
  setInterval(obtenerDatos, 3000);
});

const toggleCajaNegra = () => {
  mostrarCajaNegra.value = !mostrarCajaNegra.value;
};
</script>

<template>
  <div class="contenedor">
    <h1 class="titulo">📡 Agua</h1>

    <div v-if="errorApi" class="error">{{ errorApi }}</div>

    <div class="tanque-container">
      <div class="tanque-cuerpo">
        <div class="agua" :style="{ height: porcentaje + '%', backgroundColor: colorAgua }">
          <div class="ola"
            :style="{ backgroundImage: `linear-gradient(45deg, ${colorAgua} 25%, transparent 25%, transparent 50%, ${colorAgua} 50%, ${colorAgua} 75%, transparent 75%, transparent)` }">
          </div>
        </div>
        <div class="texto-porcentaje">
          <div v-if="altura > 0 && (300 - altura) <= 30">
            <div style="font-size: 1.5rem;">⚠️</div>
            <div style="font-size: 0.5rem; font-weight: bold;">AVISO</div>
          </div>

          <div v-else>
            {{ porcentaje }}%
          </div>
        </div>
      </div>
      <p class="texto-altura">Nivel de agua: {{ altura }} cm</p>
    </div>

    <div class="controles">
      <button @click="alternarLCD" :class="['btn-lcd', lcdEncendido ? 'encendido' : 'apagado']" :disabled="cargando">
        <span v-if="!cargando">
          {{ lcdEncendido ? 'Apagar Display' : 'Encender Display' }}
        </span>
        <span v-else>Enviando...</span>
      </button>
    </div>

    <div class="detalles-container" v-if="datosCompletos">
      <h3 class="subtitulo">📊 Estado Detallado</h3>

      <div class="grid-detalles">
        <div class="card-detalle">
          <h4>Parámetros Técnicos</h4>
          <ul>
            <li><strong>Distancia:</strong> {{ datosCompletos.Sensores.distancia }} cm</li>
            <li><strong>Altura Tanque:</strong> {{ datosCompletos.Sensores.tank_h }} cm</li>
            <li><strong>Margen Sensor:</strong> {{ datosCompletos.Sensores.sensor_m }} cm</li>
            <li><strong>Pulsos Entrada (p_in):</strong> {{ datosCompletos.Sensores.p_in }}</li>
          </ul>
        </div>

        <div class="card-detalle">
          <h4>Botones Físicos</h4>
          <div class="botones-status">
            <div v-for="(val, key) in datosCompletos.Sensores.botones" :key="key"
              :class="['indicador-boton', val ? 'activo' : 'inactivo']">
              {{ key.toUpperCase() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="debug-section">
      <button @click="mostrarCajaNegra = !mostrarCajaNegra" class="btn-debug">
        {{ mostrarCajaNegra ? '▲ Ocultar estado' : '▼ Último estado' }}
      </button>

      <div v-if="mostrarCajaNegra" class="caja-negra">
        <pre><code>{{ rawData }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;

  /* CAMBIA ESTO: */
  justify-content: flex-start;
  /* En lugar de center, que empiece arriba */
  min-height: 100vh;
  /* Asegura que ocupe todo el alto */
  padding-top: 50px;
  /* Dale un aire arriba para que el título no pegue al borde */
  padding-bottom: 50px;
  /* Para que la caja negra no pegue al fondo al abrirse */
}

.titulo {
  margin-bottom: 20px;
  font-weight: 300;
}

.error {
  background-color: #e74c3c;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.tanque-container {
  margin-bottom: 30px;
}

.tanque-cuerpo {
  position: relative;
  width: 180px;
  height: 240px;
  margin: 0 auto;
  background-color: #ecf0f1;
  border: 4px solid #95a5a6;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.1);
}

.agua {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  transition: height 1s ease-in-out, background-color 0.5s;
  display: flex;
  align-items: flex-start;
}

.ola {
  width: 200%;
  height: 15px;
  background-size: 30px 30px;
  opacity: 0.5;
  animation: moverOla 4s linear infinite;
  margin-top: -10px;
}

@keyframes moverOla {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(-50%);
  }
}

.texto-porcentaje {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5em;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.texto-altura {
  margin-top: 10px;
  color: #bdc3c7;
}

.controles {
  display: flex;
  justify-content: center;
}

.btn-lcd {
  padding: 15px 25px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: bold;
  width: 100%;
  transition: 0.3s;
}

.btn-lcd.encendido {
  background-color: #27ae60;
  color: white;
}

.btn-lcd.apagado {
  background-color: #7f8c8d;
  color: white;
}

.btn-lcd:disabled {
  opacity: 0.6;
}

.debug-box {
  margin-top: 30px;
  background-color: #111;
  color: #00ff00;
  padding: 15px;
  border-radius: 8px;
  text-align: left;
  font-family: monospace;
  font-size: 0.85em;
  overflow-x: auto;
}

.detalles-container {
  margin-top: 30px;
  width: 100%;
  max-width: 400px;
  background: #2c3e50;
  padding: 15px;
  border-radius: 12px;
  color: white;
}

.subtitulo {
  font-size: 1rem;
  margin-bottom: 15px;
  border-bottom: 1px solid #555;
  padding-bottom: 5px;
}

.grid-detalles {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.card-detalle h4 {
  font-size: 0.85rem;
  color: #bdc3c7;
  margin-bottom: 8px;
}

.card-detalle ul {
  list-style: none;
  padding: 0;
  font-size: 0.9rem;
}

.card-detalle li {
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
}

.botones-status {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.indicador-boton {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.indicador-boton.activo {
  background-color: #27ae60;
  color: white;
}

.indicador-boton.inactivo {
  background-color: #7f8c8d;
  color: #bdc3c7;
}
</style>