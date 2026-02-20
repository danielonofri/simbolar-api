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
  const { distancia, p_in, tank_h, sensor_m } = req.body;
  
  if (tank_h !== undefined) ultimoDato.tank_h = tank_h;
  if (sensor_m !== undefined) ultimoDato.sensor_m = sensor_m;

  // --- TU LÓGICA MATEMÁTICA ---
  // El sensor está a (300 + 30) = 330cm del suelo
  const sensor_suelo = ultimoDato.tank_h + ultimoDato.sensor_m; 
  
  // Altura agua = 330 - 120.5 = 209.5cm
  let alturaReal = sensor_suelo - distancia; 
  
  // Porcentaje = (209.5 / 300) * 100 = 69.83%
  let porc = Math.round((alturaReal / ultimoDato.tank_h) * 100);

  if (porc < 0) porc = 0;
  if (porc > 100) porc = 100;

  ultimoDato.distancia = distancia;
  ultimoDato.p_in = p_in;
  ultimoDato.altura_agua = alturaReal;
  ultimoDato.porcentaje = porc;
  ultimoDato.botones = {
    b1: (p_in & 1) !== 0,
    b2: (p_in & 2) !== 0,
    b3: (p_in & 4) !== 0,
    b4: (p_in & 8) !== 0
  };

  res.json({ p_out: ultimoComando.p_out });
});

// 2. Endpoint para el Frontend Vue (Estado completo)
app.get('/api/Sensores/estado', (req, res) => {
  res.json({ devolver: { Sensores: ultimoDato, Comandos: ultimoComando } });
});

// 3. Endpoint para que el Frontend mande comandos
app.post('/api/Sensores/comandos', (req, res) => {
  const { relay1ON, relay2ON, relay3ON, relay4ON, lcd } = req.body;
  
  let p_out = 0;
  if (relay1ON) p_out |= 1;
  if (relay2ON) p_out |= 2;
  if (relay3ON) p_out |= 4;
  if (relay4ON) p_out |= 8;
  if (lcd)      p_out |= 16;

  ultimoComando = { relay1ON, relay2ON, relay3ON, relay4ON, lcd, p_out };
  res.json({ status: "ok", p_out });
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
