const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('❌ Uso: node generate-hash.js TuContraseñaSegura');
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 12);
    console.log('✅ Hash generado:');
    console.log(hash);
    console.log('\n📋 Copia este hash en tu archivo .env como ADMIN_PASSWORD_HASH');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();