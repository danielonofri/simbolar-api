 const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Memoria volátil (se borra si se reinicia)
let estado = {
    sensores: { altura: 0, porcentaje: 0, tank_h: 300, sensor_m: 30 },
    comandos: { lcd: true, relay1ON: false, relay2ON: false, relay3ON: false, relay4ON: false }
};

// GET: Para que Vue lea datos
app.get('/api/Sensores/estado', (req, res) => {
    res.json({ devolver: estado });
});

// POST: Para que NodeMCU envíe datos y Vue envíe comandos
app.post('/api/Sensores/comandos', (req, res) => {
    const data = req.body;
    
    // Si viene del NodeMCU (tiene altura)
    if (data.altura !== undefined) {
        estado.sensores.altura = data.altura;
        estado.sensores.porcentaje = data.porcentaje;
        // También actualizamos configs si las manda
        if (data.tank_h) estado.sensores.tank_h = data.tank_h;
    }

    // Si viene de Vue (tiene LCD o Relays)
    if (data.lcd !== undefined) estado.comandos.lcd = data.lcd;
    if (data.relay1ON !== undefined) estado.comandos.relay1ON = data.relay1ON;
    // ... repetir para otros relays si hace falta

    res.json({ status: "ok", recibido: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Simbolar API corriendo en puerto ${PORT}`));