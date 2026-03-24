const db = require('../db');

console.log('⏳ Iniciando worker Cron para limpieza de datos...');

// Limpieza de mensajes anónimos mayores a 24 horas.
// En producción, ejecutar con cron job: * * * * * node cron.js
const runCron = async () => {
  try {
    console.log('🧹 Ejecutando limpieza de mensajes anónimos...');
    const result = await db.query("DELETE FROM anon_messages WHERE created_at < NOW() - INTERVAL '24 hours'");
    console.log(`✅ Limpieza finalizada. Mensajes eliminados: ${result.rowCount}`);
  } catch (err) {
    console.error('❌ Error en cron anon_messages cleanup:', err.message);
  } finally {
    process.exit(0);
  }
};

runCron();
