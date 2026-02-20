Aquí te dejo una documentación en **Markdown (MD)** que describe claramente tu **API en Express** y el **frontend Vue** que estás sirviendo desde Render.  

---

# 📘 Documentación del Proyecto AguaSimbolar

## 🔹 API (Express)

### Base URL
```
https://simbolar-api.onrender.com/api
```

### Endpoints

#### 1. POST `/api/Sensores`
- **Descripción**: Recibe datos enviados por el NodeMCU.  
- **Body (JSON)**:
```json
{
  "altura_agua": 120,
  "porcentaje": 40,
  "tank_h": 300,
  "sensor_m": 30,
  "delta_max": 0,
  "Boton1": "OFF",
  "Boton2": "OFF",
  "Boton3": "OFF",
  "Boton4": "OFF"
}
```
- **Respuesta**:
```json
{
  "status": "ok",
  "lcd": true
}
```

---

#### 2. GET `/api/Sensores/comandos`
- **Descripción**: Devuelve el estado actual de los relés y del LCD.  
- **Respuesta**:
```json
{
  "relay1ON": false,
  "relay2ON": false,
  "relay3ON": false,
  "relay4ON": false,
  "lcd": true
}
```

---

#### 3. POST `/api/Sensores/comandos`
- **Descripción**: Actualiza los comandos enviados desde la App Vue.  
- **Body (JSON)**:
```json
{
  "relay1ON": true,
  "relay2ON": false,
  "relay3ON": false,
  "relay4ON": false,
  "lcd": false
}
```
- **Respuesta**:
```json
{
  "status": "comandos actualizados"
}
```

---

#### 4. GET `/api/Sensores/estado`
- **Descripción**: Devuelve todo el estado (sensores + comandos) en un solo objeto.  
- **Respuesta**:
```json
{
  "devolver": {
    "Sensores": {
      "altura_agua": 120,
      "porcentaje": 40,
      "tank_h": 300,
      "sensor_m": 30,
      "delta_max": 0,
      "Boton1": "OFF",
      "Boton2": "OFF",
      "Boton3": "OFF",
      "Boton4": "OFF"
    },
    "Comandos": {
      "relay1ON": true,
      "relay2ON": false,
      "relay3ON": false,
      "relay4ON": false,
      "lcd": false
    }
  }
}
```

---

## 🔹 Frontend (Vue + Vite)

### Ubicación
- Servido automáticamente desde:
```
https://simbolar-api.onrender.com/
```

### Características
- Construido con **Vue 3** y **Vite**.  
- Usa **Axios** para consumir la API.  
- El build genera los archivos en `client/dist`.  
- Express sirve esos archivos estáticos y redirige cualquier ruta no-API a `index.html` para soportar SPA (Single Page Application).

### Flujo de uso
1. El usuario accede al frontend en `/`.  
2. Vue carga la interfaz y hace peticiones con Axios a los endpoints `/api/Sensores/...`.  
3. El backend responde con el estado de sensores y comandos.  
4. El frontend actualiza la UI en tiempo real.

---

✅ Con esta documentación en MD tenés un resumen claro de cómo funciona tu **API** y tu **frontend Vue** en Render.  

¿Querés que te arme también un **README.md completo** para tu repo en GitHub con esta misma estructura lista para copiar y pegar?
