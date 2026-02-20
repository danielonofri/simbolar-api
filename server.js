const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());

// --- MEMORIA ---
let ultimoComando = {
  relay1ON: false,
  relay2ON: false,
  relay3ON: false,
  relay4ON: false,
  lcd: true,
  p_out: 16, // 16 en binario es 10000 (Bit 4 encendido, asignado al LCD)
};

let ultimoDato = {
  distancia: -1,
  altura_agua: 0,
  porcentaje: 0,
  tank_h: 300, // Altura total del tanque
  sensor_m: 30, // Distancia mínima del sensor al nivel máximo
  p_in: 0, // Byte crudo que llega del Arduino
  botones: { b1: false, b2: false, b3: false, b4: false },
};

// --- RUTAS API ---
// 1. Recibe del NodeMCU: { "distancia": 45.5, "p_in": 5 }
app.post("/api/Sensores", (req, res) => {
  const { distancia, p_in } = req.body;

  // A. Cálculos de nivel de agua (Lo hace el server, no el Arduino)
  let altura = ultimoDato.tank_h - distancia;
  let porc = Math.round(
    (altura / (ultimoDato.tank_h - ultimoDato.sensor_m)) * 100,
  );
  if (porc < 0) porc = 0;
  if (porc > 100) porc = 100;

  // B. Desempaquetar los bits de los botones para mostrarlos en Vue si quieres
  let b1 = (p_in & 1) !== 0; // Bit 0
  let b2 = (p_in & 2) !== 0; // Bit 1
  let b3 = (p_in & 4) !== 0; // Bit 2
  let b4 = (p_in & 8) !== 0; // Bit 3

  // C. Guardar en memoria
  ultimoDato.distancia = distancia;
  ultimoDato.p_in = p_in;
  ultimoDato.altura_agua = altura;
  ultimoDato.porcentaje = porc;
  ultimoDato.botones = { b1, b2, b3, b4 };

  console.log(
    `NodeMCU -> Dist: ${distancia}, p_in: ${p_in} (Botones: ${b4 ? 1 : 0}${b3 ? 1 : 0}${b2 ? 1 : 0}${b1 ? 1 : 0})`,
  );

  // D. Responder al NodeMCU con el byte empaquetado p_out
  res.json({ p_out: ultimoComando.p_out });
});

app.post('/api/Sensores', (req, res) => {
  const { distancia, p_in, tank_h, sensor_m, delta_max } = req.body;
  
  // 1. Actualizar parámetros de calibración si vienen en el JSON
  if (tank_h !== undefined) ultimoDato.tank_h = tank_h;      // Ejemplo: 300
  if (sensor_m !== undefined) ultimoDato.sensor_m = sensor_m;  // Ejemplo: 30
  if (delta_max !== undefined) ultimoDato.delta_max = delta_max; // Ejemplo: 5

  // 2. Filtro Delta Max (Validación de medidas erróneas)
  // Si ya tenemos una medida previa y la nueva es muy dispar, la ignoramos
  if (ultimoDato.distancia !== -1 && ultimoDato.delta_max > 0) {
    const diferencia = Math.abs(distancia - ultimoDato.distancia);
    if (diferencia > ultimoDato.delta_max) {
      console.log(`⚠️ Medida descartada por Delta Max: Dif ${diferencia} > ${ultimoDato.delta_max}`);
      return res.json({ p_out: ultimoComando.p_out, status: "ignored_by_delta" });
    }
  }

  // 3. Cálculos físicos según tu instalación:
  // Altura del agua desde el suelo = (tanque + aire) - distancia leída
  const sensor_suelo = ultimoDato.tank_h + ultimoDato.sensor_m; // 300 + 30 = 330
  let alturaReal = sensor_suelo - distancia; 
  
  // Porcentaje de llenado real del tanque (sobre los 300cm)
  let porc = Math.round((alturaReal / ultimoDato.tank_h) * 100);

  // Límites lógicos (0-100%)
  if (porc < 0) porc = 0;
  if (porc > 100) porc = 100;

  // 4. Guardar en memoria
  ultimoDato.distancia = distancia;
  ultimoDato.p_in = p_in;
  ultimoDato.altura_agua = alturaReal;
  ultimoDato.porcentaje = porc;

  // Desempaquetar botones (bitwise)
  ultimoDato.botones = {
    b1: (p_in & 1) !== 0,
    b2: (p_in & 2) !== 0,
    b3: (p_in & 4) !== 0,
    b4: (p_in & 8) !== 0
  };

  console.log(`✅ OK: Dist ${distancia}cm -> ${porc}% Lleno`);
  
  res.json({ p_out: ultimoComando.p_out });
});

// 3. Envía el estado al Frontend Vue
app.get("/api/Sensores/estado", (req, res) => {
  res.json({ devolver: { Sensores: ultimoDato, Comandos: ultimoComando } });
});

app.get("/api/Sensores/comandos", (req, res) => {
  res.json(ultimoComando);
});

// --- FRONTEND VUE ---
app.use(express.static(path.join(__dirname, "client", "dist")));

// Catch-all: cualquier ruta que no sea /api devuelve index.html
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next(); // deja que las rutas API se manejen arriba
  }
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// --- ARRANCAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // necesario para Render y otros hostings
app.listen(PORT, HOST, () => {
  console.log(`Simbolar API + Vue corriendo en http://${HOST}:${PORT}`);
});
