const express = require('express');
const cors = require('cors');
const path = require('path');
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
  p_out: 16
};

let ultimoDato = {
  distancia: -1,
  altura_agua: 0,
  porcentaje: 0,
  tank_h: 300,   // Altura del tanque (Suelo al borde)
  sensor_m: 30,  // Aire (Borde al sensor)
  p_in: 0,
  botones: { b1: false, b2: false, b3: false, b4: false }
};

// --- RUTAS API ---

app.post('/api/Sensores', (req, res) => {
  const { distancia, p_in, tank_h, sensor_m } = req.body;
  
  // Actualizamos calibración si viene en el JSON
  if (tank_h !== undefined) ultimoDato.tank_h = Number(tank_h);
  if (sensor_m !== undefined) ultimoDato.sensor_m = Number(sensor_m);

  // --- LÓGICA FANTÁSTICA (Tu fórmula) ---
  // 1. El sensor está a 330cm del suelo (300 de tanque + 30 de aire)
  const puntoSensor = ultimoDato.tank_h + ultimoDato.sensor_m; 
  
  // 2. Altura real del agua respecto al suelo: 330 - 120.5 = 209.5
  let alturaReal = puntoSensor - distancia; 
  
  // 3. Porcentaje sobre los 300cm del tanque: (209.5 / 300) * 100 = 69.83
  let porc = Math.round((alturaReal / ultimoDato.tank_h) * 100);

  // Limites lógicos
  if (porc < 0) porc = 0;
  if (porc > 100) porc = 100;

  // Guardar en memoria
  ultimoDato.distancia = distancia;
  ultimoDato.p_in = p_in || 0;
  ultimoDato.altura_agua = alturaReal;
  ultimoDato.porcentaje = porc;

  // Desempaquetar botones (bitwise)
  ultimoDato.botones = {
    b1: (ultimoDato.p_in & 1) !== 0,
    b2: (ultimoDato.p_in & 2) !== 0,
    b3: (ultimoDato.p_in & 4) !== 0,
    b4: (ultimoDato.p_in & 8) !== 0
  };

  console.log(`Recibido: ${distancia} | Calculado: ${porc}%`);
  res.json({ p_out: ultimoComando.p_out });
});

app.get('/api/Sensores/estado', (req, res) => {
  res.json({ devolver: { Sensores: ultimoDato, Comandos: ultimoComando } });
});

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

// --- FRONTEND VUE ---
app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('/(.*)', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listo en puerto ${PORT}`);
});