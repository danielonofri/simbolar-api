const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// --- RUTAS API ---
// (todas tus rutas /api/... van aquí)
app.post('/api/Sensores', (req, res) => { ... });
app.get('/api/Sensores/comandos', (req, res) => { ... });
app.post('/api/Sensores/comandos', (req, res) => { ... });
app.get('/api/Sensores/estado', (req, res) => { ... });



// --- MEMORIA ---
let ultimoComando = {
  relay1ON: false,
  relay2ON: false,
  relay3ON: false,
  relay4ON: false,
  lcd: true
};

let ultimoDato = {
  altura_agua: -1,
  porcentaje: 0,
  tank_h: 300,
  sensor_m: 30,
  delta_max: 0,
  Boton1: "OFF",
  Boton2: "OFF",
  Boton3: "OFF",
  Boton4: "OFF"
};

// --- RUTAS API ---
app.post('/api/Sensores', (req, res) => {
  const data = req.body;
  ultimoDato = data;
  console.log(`Recibido: Altura=${data.altura_agua}, Porc=${data.porcentaje}%`);
  res.json({ status: "ok", lcd: ultimoComando.lcd });
});

app.get('/api/Sensores/comandos', (req, res) => {
  res.json(ultimoComando);
});

app.post('/api/Sensores/comandos', (req, res) => {
  const comandos = req.body;
  ultimoComando = comandos;
  console.log(`Comandos actualizados: R1=${comandos.relay1ON}, LCD=${comandos.lcd}`);
  res.json({ status: "comandos actualizados" });
});

app.get('/api/Sensores/estado', (req, res) => {
  res.json({ devolver: { Sensores: ultimoDato, Comandos: ultimoComando } });
});

// Servir archivos estáticos de Vue
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Servir archivos estáticos de Vue
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Catch-all: cualquier ruta que no sea /api devuelve index.html
app.get('/*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});