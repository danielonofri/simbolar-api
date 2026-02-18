const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// --- MEMORIA (Equivalente a tus variables static en C#) ---

// Equivalente a: private static dynamic ultimoComando = new { ... }
let ultimoComando = {
    relay1ON: false,
    relay2ON: false,
    relay3ON: false,
    relay4ON: false,
    lcd: true
};

// Equivalente a: private static SensorData? ultimoDato;
// Lo inicializamos con valores por defecto para que no sea null
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

// --- RUTAS (Endpoints) ---

// 1. POST /api/Sensores (Recibe datos del NodeMCU)
// Equivalente a: [HttpPost] public IActionResult Post([FromBody] SensorData data)
app.post('/api/Sensores', (req, res) => {
    const data = req.body;
    
    // Guardamos los datos recibidos en memoria
    // Nota: Fusionamos con lo anterior por si falta algún campo, o reemplazamos todo si prefieres.
    // Aquí reemplazamos todo igual que tu C#: ultimoDato = data;
    ultimoDato = data;

    console.log(`Recibido: Altura=${data.altura_agua}, Porc=${data.porcentaje}%`);

    // Retornamos el estado del LCD para que el NodeMCU sepa qué hacer
    res.json({
        status: "ok",
        lcd: ultimoComando.lcd // C# devuelve: new { status="ok", lcd = ultimoComando.Lcd }
    });
});

// 2. GET /api/Sensores/comandos (Para ver estado de relés)
// Equivalente a: [HttpGet("comandos")]
app.get('/api/Sensores/comandos', (req, res) => {
    res.json(ultimoComando);
});

// 3. POST /api/Sensores/comandos (Para recibir órdenes desde la App Vue)
// Equivalente a: [HttpPost("comandos")]
app.post('/api/Sensores/comandos', (req, res) => {
    const comandos = req.body;
    
    // Actualizamos la memoria
    ultimoComando = comandos;

    console.log(`Comandos actualizados: R1=${comandos.relay1ON}, LCD=${comandos.lcd}`);

    res.json({ status: "comandos actualizados" });
});

// 4. GET /api/Sensores/estado (Para que Vue lea TODO de una vez)
// Equivalente a: [HttpGet("estado")]
app.get('/api/Sensores/estado', (req, res) => {
    const devolver = {
        Sensores: ultimoDato,
        Comandos: ultimoComando
    };

    // C# devuelve: return Ok(new { devolver });
    res.json({ devolver: devolver });
});

// --- ARRANCAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Simbolar API C# Replica corriendo en puerto ${PORT}`);
});