
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Help Center Knowledge Base ──
const ARTICLES = {
    reporting: {
        icon: 'flag',
        title: 'Reporting a Profile',
        color: 'from-red-500 to-pink-500',
        articles: [
            {
                id: 'r1',
                title: 'How to Report a Suspicious Profile',
                content: `If you encounter a suspicious profile on RedFlag, follow these steps:\n\n1. **Go to the profile** you want to report.\n2. Tap the **three dots (⋯)** at the top right corner.\n3. Select **"Report Profile"**.\n4. Choose the reason for reporting:\n   • Fake profile or catfishing\n   • Inappropriate content\n   • Harassment or threats\n   • Underage user\n   • Spam or scam\n5. Add any additional details that might help our team.\n6. Tap **"Submit Report"**.\n\nOur safety team reviews all reports within 24 hours. You will receive a notification once action has been taken.`,
            },
            {
                id: 'r2',
                title: 'What Happens After I Report Someone?',
                content: `Once you submit a report:\n\n• **Immediate:** The reported user cannot see that they were reported.\n• **Within 24 hours:** Our safety team reviews the report.\n• **Action taken:** Depending on severity, we may:\n   - Issue a warning to the user\n   - Temporarily suspend their account\n   - Permanently ban the user\n   - Report to law enforcement if applicable\n• **You'll be notified** of the outcome via your Notifications tab.\n\nRepeat offenders are permanently banned from the platform.`,
            },
            {
                id: 'r3',
                title: 'Reporting Fake Photos or Catfishing',
                content: `RedFlag takes catfishing very seriously. Our facial recognition verification system helps prevent fake profiles, but if you suspect someone:\n\n1. **Use our Facial Scan feature** — Upload their photo to check if it appears elsewhere online.\n2. **Check their verification badge** — Verified users have completed our identity check.\n3. **Report via the profile** — Select "Fake profile or catfishing" as the reason.\n4. **Provide evidence** — Screenshots of conversations or links can help our team.\n\n**Tip:** Always be cautious with unverified profiles. Use video calls before meeting in person.`,
            },
        ],
    },
    privacy: {
        icon: 'security',
        title: 'Privacy & Safety',
        color: 'from-blue-500 to-indigo-500',
        articles: [
            {
                id: 'p1',
                title: 'How We Protect Your Data',
                content: `At RedFlag, your privacy is our top priority:\n\n• **End-to-end encryption** on all private messages.\n• **Anonymous chat rooms** — Your identity is never revealed in public chats.\n• **Photo searches are private** — Only you see your search results.\n• **No data selling** — We never sell your personal data to third parties.\n• **Automatic message expiry** — Chat room messages expire after 24 hours.\n• **Secure storage** — All data is encrypted at rest using AES-256.\n\nYou can download or delete your data at any time from Settings > Privacy.`,
            },
            {
                id: 'p2',
                title: 'Blocking and Restricting Users',
                content: `To block someone:\n\n1. Open their **profile** or **chat conversation**.\n2. Tap the **three dots (⋯)** menu.\n3. Select **"Block User"**.\n\nWhen you block someone:\n• They **cannot** see your profile.\n• They **cannot** send you messages.\n• They **won't** appear in your dating matches.\n• Existing conversations are **hidden**.\n• They are **NOT notified** that you blocked them.\n\nYou can unblock users anytime from Settings > Blocked Users.`,
            },
            {
                id: 'p3',
                title: 'Identity Verification Process',
                content: `Our identity verification uses advanced AI to ensure genuine users:\n\n**How it works:**\n1. Navigate to Chat or your Profile.\n2. You'll be prompted to verify your identity.\n3. Take a live selfie (no pre-saved photos allowed).\n4. Our AI analyzes facial features and confirms your gender.\n5. Your verified badge appears on your profile.\n\n**Why we verify:**\n• Prevents catfishing and fake profiles.\n• Ensures gender-appropriate chat room access.\n• Builds trust between users.\n• Required for accessing chat features.\n\n**Privacy:** Your verification selfie is encrypted and never shared with other users.`,
            },
            {
                id: 'p4',
                title: 'Personal Guard & Date Safety',
                content: `RedFlag's Personal Guard feature keeps you safe during dates:\n\n**Features:**\n• **Trusted Contacts** — Share your live location with up to 5 people.\n• **Check-In Timer** — Set a duration; if you don't check in, alerts are sent.\n• **Panic Button** — Instantly alert your contacts and emergency services.\n• **Emergency Call** — One-tap call to 911 or local emergency number.\n\n**How to activate:**\n1. Go to Dating Mode > Shield icon.\n2. Add trusted contacts.\n3. Set your check-in duration.\n4. Tap "START DATE GUARD".\n\n**Tip:** Always let someone know where you're going before a date.`,
            },
        ],
    },
    payments: {
        icon: 'payments',
        title: 'Payment & Subscription',
        color: 'from-emerald-500 to-green-500',
        articles: [
            {
                id: 'pay1',
                title: 'Subscription Plans & Pricing',
                content: `RedFlag offers flexible plans:\n\n**Free Plan:**\n• Basic profile search\n• View limited results\n• Community access (after verification)\n\n**Premium Plan — $3.99/month:**\n• Unlimited photo searches\n• Full facial recognition scans\n• Priority support\n• Advanced filters\n• Dating mode access\n\n**Annual Plan — $47.88/year:**\n• All Premium features\n• Save compared to monthly\n• Exclusive early access to new features\n\nAll plans include a 7-day free trial. Cancel anytime.`,
            },
            {
                id: 'pay2',
                title: 'How to Cancel or Change Your Plan',
                content: `To manage your subscription:\n\n1. Go to **Settings** > **Subscription**.\n2. Choose **"Manage Plan"**.\n3. Select **Cancel** or **Change Plan**.\n\n**Important notes:**\n• Cancellation takes effect at the end of your billing period.\n• You keep access until the period ends.\n• No partial refunds for unused time.\n• You can resubscribe at any time.\n\n**Refund Policy:**\nWe offer full refunds within 48 hours of purchase if you haven't used premium features. Contact support for assistance.`,
            },
            {
                id: 'pay3',
                title: 'Payment Methods & Billing',
                content: `We accept:\n• **Credit/Debit cards** (Visa, Mastercard, AMEX)\n• **Apple Pay** and **Google Pay**\n• **PayPal**\n\n**Billing cycle:**\n• Monthly plans renew on the same date each month.\n• Annual plans renew yearly.\n• You'll receive an email receipt for each charge.\n\n**Failed payment:**\nIf a payment fails, we'll retry after 3 days. Your account remains active for a 7-day grace period. Update your payment method in Settings > Payment to avoid interruption.`,
            },
        ],
    },
    account: {
        icon: 'manage_accounts',
        title: 'Account Settings',
        color: 'from-purple-500 to-violet-500',
        articles: [
            {
                id: 'a1',
                title: 'How to Update Your Profile',
                content: `Keep your profile fresh:\n\n1. Tap **Profile** in the bottom navigation.\n2. Here you can edit:\n   • **Display name**\n   • **Bio** (up to 300 characters)\n   • **Interests** — Choose from categories\n   • **Photos** — Add up to 6 photos\n   • **Videos** — Add up to 3 clips\n   • **Voice Notes** — Record your intro\n   • **Appearance** settings\n\n3. Changes save automatically.\n\n**Tips for a great profile:**\n• Use recent, clear photos\n• Write a genuine bio\n• Add diverse interests\n• Complete your verification for the badge`,
            },
            {
                id: 'a2',
                title: 'Changing Your Password',
                content: `To change your password:\n\n1. Go to **Settings** (gear icon).\n2. Under **Security**, tap **"Change Password"**.\n3. A password reset email will be sent to your registered email.\n4. Click the link in the email.\n5. Enter your new password (minimum 8 characters).\n\n**Forgot your password?**\n1. On the login screen, tap **"Forgot Password?"**.\n2. Enter your email address.\n3. Check your email for the reset link.\n4. Create a new password.\n\n**Security tip:** Use a unique password with letters, numbers, and symbols.`,
            },
            {
                id: 'a3',
                title: 'Deleting Your Account',
                content: `We're sorry to see you go. To delete your account:\n\n1. Go to **Settings** > **Account**.\n2. Scroll to **"Delete Account"**.\n3. Confirm by typing "DELETE".\n4. Your account will be permanently removed.\n\n**What gets deleted:**\n• Profile information\n• All messages and conversations\n• Search history\n• Subscription (automatically cancelled)\n• Dating matches and preferences\n\n**What we keep (30 days):**\n• Reports you've filed (for safety)\n• Payment records (required by law)\n\nAfter 30 days, all remaining data is permanently purged.`,
            },
            {
                id: 'a4',
                title: 'Two-Factor Authentication (2FA)',
                content: `Add an extra layer of security:\n\n1. Go to **Settings** > **Security**.\n2. Toggle on **"Two-Factor Authentication"**.\n3. Choose your method:\n   • **SMS** — Receive codes via text\n   • **Email** — Receive codes via email\n4. Verify with a test code.\n\n**When 2FA is active:**\n• You'll need a code every time you log in from a new device.\n• Trusted devices can be remembered for 30 days.\n• You can generate backup codes in case you lose access.\n\n**Recommendation:** Enable 2FA to protect your account from unauthorized access.`,
            },
        ],
    },
};

// ── Frequently Asked Questions ──
const FAQS = [
    {
        q: '¿Es RedFlag gratis?',
        a: 'RedFlag ofrece un plan gratuito con funciones básicas. Para acceso completo a escaneo facial, búsquedas ilimitadas y Dating Mode, necesitas un plan Premium ($3.99/mes o $47.88/año).',
    },
    {
        q: '¿Cómo funciona la verificación de identidad?',
        a: 'Tomamos una selfie en vivo, nuestra IA analiza tus rasgos faciales y confirma tu género. Esto previene perfiles falsos y catfishing. Tu selfie se encripta y nunca se comparte.',
    },
    {
        q: '¿Mis búsquedas de fotos son privadas?',
        a: 'Sí, 100%. Nadie puede ver tus búsquedas. Los resultados solo aparecen en tu pantalla y no se almacenan en servidores después de que cierras la sesión.',
    },
    {
        q: '¿Qué hago si me siento inseguro/a en una cita?',
        a: 'Usa la función Personal Guard: activa el Date Guard antes de tu cita, comparte tu ubicación con contactos de confianza, y usa el Panic Button para alertar a emergencias y tus contactos.',
    },
    {
        q: '¿Cómo reporto a alguien?',
        a: 'Ve al perfil del usuario, toca los tres puntos (⋯), selecciona "Report Profile", elige la razón y envía. Nuestro equipo revisa todos los reportes en menos de 24 horas.',
    },
    {
        q: '¿Puedo recuperar mi cuenta después de eliminarla?',
        a: 'No. Una vez eliminada, la cuenta se borra permanentemente en 30 días. Deberás crear una nueva cuenta si deseas volver.',
    },
];

export default function Support() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { from: 'bot', text: '👋 ¡Hola! Soy el asistente de RedFlag. ¿En qué puedo ayudarte hoy?' },
    ]);
    const [chatInput, setChatInput] = useState('');

    // Search results
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const results = [];
        Object.values(ARTICLES).forEach((topic) => {
            topic.articles.forEach((article) => {
                if (
                    article.title.toLowerCase().includes(q) ||
                    article.content.toLowerCase().includes(q)
                ) {
                    results.push({ ...article, topicTitle: topic.title, topicIcon: topic.icon });
                }
            });
        });
        return results;
    }, [searchQuery]);

    // ── Comprehensive AI Chat Engine ──
    const getAIResponse = (msg) => {
        const lower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Pattern matching with weighted responses
        const patterns = [
            // Greetings
            {
                match: /^(hola|hello|hi|hey|buenas|buenos|que tal|saludos|alo|ey|sup|yo)/,
                responses: [
                    '👋 ¡Hola! Soy la asistente de RedFlag. Estoy aquí para ayudarte con cualquier pregunta sobre la app, tu cuenta, seguridad, pagos, o lo que necesites. ¿En qué puedo ayudarte?',
                    '👋 ¡Hey! Bienvenido/a al soporte de RedFlag. Pregúntame lo que quieras — reportes, privacidad, verificación, matches, pagos... ¡estoy para ti!',
                    '👋 ¡Hola! ¿Qué tal? Cuéntame en qué te puedo ayudar hoy. Puedo asistirte con cualquier tema de la app.',
                ]
            },
            // Farewell
            {
                match: /(adios|bye|chao|hasta luego|nos vemos|me voy|gracias por todo)/,
                responses: [
                    '👋 ¡Hasta luego! Si necesitas algo más, aquí estaré 24/7. ¡Cuídate mucho!',
                    '😊 ¡Fue un placer ayudarte! No dudes en volver cuando lo necesites. ¡Que tengas un excelente día!',
                ]
            },
            // Thanks
            {
                match: /(gracia|thank|thx|merci|te agradezco|muy amable|perfecto|excelente|genial|chevere)/,
                responses: [
                    '😊 ¡De nada! Me alegra poder ayudarte. ¿Hay algo más en lo que pueda asistirte?',
                    '💖 ¡Con mucho gusto! Si tienes otra pregunta, no dudes en escribirme.',
                    '🙌 ¡Para eso estamos! ¿Necesitas ayuda con algo más?',
                ]
            },
            // How are you / small talk
            {
                match: /(como estas|como te va|que haces|como andas|que onda|como vas)/,
                responses: [
                    '😊 ¡Estoy genial, gracias por preguntar! Siempre lista para ayudarte. ¿Qué necesitas hoy?',
                    '🤖 ¡Funcionando perfecto! 24/7 para lo que necesites. ¿En qué te puedo ayudar?',
                ]
            },
            // Who are you
            {
                match: /(quien eres|que eres|eres humano|eres real|eres robot|eres una ia|eres bot)/,
                responses: [
                    '🤖 Soy la asistente virtual de RedFlag. Estoy entrenada para ayudarte con cualquier tema de la app: seguridad, reportes, verificación, pagos, Dating Mode, y mucho más. Si necesitas un humano, puedo conectarte con nuestro equipo.',
                    '💡 Soy la IA de soporte de RedFlag. Puedo resolver la mayoría de tus dudas al instante. Si mi respuesta no te satisface, puedo escalar tu caso a un agente humano. ¿Qué necesitas?',
                ]
            },
            // Reporting
            {
                match: /(report|reporte|denunci|acusar|queja|abus|acoso|harass|fake|falso|catfish|fraude|estaf|scam)/,
                responses: [
                    '🚩 Para reportar un perfil:\n\n1. Ve al perfil sospechoso\n2. Toca los tres puntos (⋯)\n3. Selecciona "Report Profile"\n4. Elige la razón (perfil falso, acoso, spam, etc.)\n5. Agrega detalles y envía\n\nNuestro equipo de seguridad revisa TODOS los reportes en menos de 24 horas. Si es una emergencia, llama al 911 inmediatamente. ¿Necesitas más info?',
                    '⚠️ Tomo los reportes muy en serio. Para denunciar:\n\nPerfil → ⋯ → "Report Profile" → Elige razón → Enviar\n\nAcciones que podemos tomar: advertencia, suspensión temporal, ban permanente, o reporte a autoridades si es necesario. Nunca le decimos al usuario quién lo reportó. ¿Algo más?',
                ]
            },
            // Blocking
            {
                match: /(block|bloque|silenci|mute|ignor|no quiero que me escriba|como evit)/,
                responses: [
                    '🚫 Para bloquear a alguien:\n\nPerfil o Chat → ⋯ → "Block User"\n\nCuando bloqueas:\n• No pueden ver tu perfil\n• No te pueden enviar mensajes\n• No aparecen en tus matches\n• NO son notificados del bloqueo\n\nDesbloquear: Settings → Blocked Users. ¿Algo más?',
                ]
            },
            // Password / Login
            {
                match: /(password|contrasena|clave|login|no puedo entrar|no me deja entrar|olvid|forgot|acceder|iniciar sesion)/,
                responses: [
                    '🔑 Para cambiar tu contraseña:\nSettings → Security → "Change Password"\n\n¿Olvidaste tu contraseña?\n1. En el login, toca "Forgot Password?"\n2. Ingresa tu email\n3. Revisa tu correo (incluido spam)\n4. Sigue el enlace para crear una nueva\n\n💡 Tip: Usa una contraseña con letras, números y símbolos (mínimo 8 caracteres). ¿Necesitas más ayuda?',
                ]
            },
            // Verification / Selfie / Camera
            {
                match: /(verif|selfie|camer|foto|reconocimiento|facial|identidad|badge|insignia)/,
                responses: [
                    '📸 La verificación de identidad:\n\n1. Ve a Chat → selecciona un room\n2. Se te pedirá verificarte\n3. Toma una selfie EN VIVO (no fotos guardadas)\n4. La IA analiza tu rostro\n5. Recibes tu badge de verificado ✅\n\n💡 Tips para que funcione bien:\n• Buena iluminación (luz natural es ideal)\n• Mira directo a la cámara\n• Sin lentes de sol ni gorras\n• Fondo claro si es posible\n\n¿Tienes problemas con la cámara? Verifica los permisos del navegador.',
                ]
            },
            // Dating / Matches
            {
                match: /(dating|cita|match|pareja|amor|novio|novia|like|swipe|tinder|relacion|conocer gente)/,
                responses: [
                    '💜 Dating Mode en RedFlag:\n\n• Toca "DATING MODE" en el header\n• Desliza perfiles para dar Like o Skip\n• Si ambos dan Like = ¡Match! 🎉\n• Chatea con tus matches\n• Usa "Matches & Chats" para ver conversaciones\n\n🛡️ Seguridad extra: Activa el Date Guard antes de una cita real (ícono de escudo). Comparte tu ubicación con contactos de confianza.\n\n¿Quieres saber más sobre alguna función?',
                ]
            },
            // Guard / Panic / Emergency / Safety
            {
                match: /(guard|panic|emergenc|segur|911|peligr|ayuda urgente|socorro|auxilio|policia|sos|amenaz)/,
                responses: [
                    '🛡️ Personal Guard — Tu seguridad es prioridad:\n\n📍 **Activar Date Guard:**\nDating Mode → Ícono de escudo → START DATE GUARD\n\n👥 **Contactos de confianza:** Agrega hasta 5 personas que recibirán tu ubicación en tiempo real\n\n⏰ **Check-In Timer:** Si no confirmas en el tiempo, tus contactos son alertados automáticamente\n\n🔴 **PANIC BUTTON:** Presiona en emergencia para:\n• Enviar tu ubicación GPS exacta\n• Alertar a todos tus contactos\n• Llamar al 911\n\n⚠️ Si estás en peligro AHORA MISMO, llama al 911 directamente.',
                ]
            },
            // Subscription / Payment / Price
            {
                match: /(pago|precio|cost|subscri|suscri|premium|plan|cobr|tarjeta|visa|mastercard|paypal|factur|dinero|dolar|free|gratis|trial|prueba)/,
                responses: [
                    '💳 Planes de RedFlag:\n\n🆓 **Gratis:**\n• Búsqueda básica de perfiles\n• Acceso a Community\n• Chat anónimo (con verificación)\n\n⭐ **Premium — $3.99/mes:**\n• Búsquedas ilimitadas\n• Escaneo facial completo\n• Dating Mode completo\n• Soporte prioritario\n\n📅 **Anual — $47.88/año (ahorra):**\n• Todo Premium + acceso anticipado a nuevas funciones\n\n✅ Todos incluyen 7 días de prueba gratis\n\nPara gestionar: Settings → Subscription. ¿Necesitas más info?',
                ]
            },
            // Cancel subscription
            {
                match: /(cancel|anular|dar de baja|desuscrip|dejar de pagar|no quiero pagar|reembols|refund|devolucion)/,
                responses: [
                    '💰 Para cancelar tu suscripción:\n\nSettings → Subscription → "Manage Plan" → Cancel\n\n📋 Lo que debes saber:\n• Sigues con acceso hasta el fin del período\n• No hay reembolsos parciales\n• Puedes reactivar en cualquier momento\n\n💵 Política de reembolso:\nReembolso completo dentro de 48 horas si no usaste funciones premium. Contáctanos por email a support@redflag.com.\n\n¿Algo más?',
                ]
            },
            // Delete account
            {
                match: /(eliminar|borrar|delete|cerrar cuenta|dar de baja cuenta|quitar cuenta|salir de)/,
                responses: [
                    '⚠️ Eliminar tu cuenta:\n\nSettings → Account → "Delete Account" → Escribe "DELETE"\n\n❌ Se eliminará:\n• Tu perfil completo\n• Mensajes y conversaciones\n• Historial de búsquedas\n• Matches y preferencias\n• Suscripción (se cancela)\n\n⏳ Lo que guardamos 30 días:\n• Reportes que hayas hecho (por seguridad)\n• Registros de pago (requerido por ley)\n\n⚡ Esta acción es PERMANENTE. ¿Estás seguro/a?',
                ]
            },
            // Privacy / Data
            {
                match: /(privaci|datos|data|informacion personal|que saben de mi|espian|rastrea|track|encrypt|cifr|seguridad de datos)/,
                responses: [
                    '🔒 Tu privacidad en RedFlag:\n\n• 🔐 Encriptación end-to-end en mensajes privados\n• 👻 Chat anónimo — tu identidad nunca se revela\n• 🔍 Búsquedas privadas — solo tú ves los resultados\n• 🚫 NO vendemos datos a terceros\n• ⏰ Mensajes de chat expiran en 24 horas\n• 🛡️ AES-256 encryption en almacenamiento\n\nPuedes descargar o eliminar todos tus datos desde Settings → Privacy.\n\n¿Tienes alguna preocupación específica?',
                ]
            },
            // Chat / Messages
            {
                match: /(chat|mensaje|escribir|comunicar|conversar|room|sala|hablar con)/,
                responses: [
                    '💬 Sistema de Chat:\n\n**Chat Anónimo:**\n• Toca "Chat" en la barra inferior\n• Elige Women\'s Room o Men\'s Room\n• Necesitas verificación para entrar\n• Los mensajes expiran en 24 horas\n• 100% anónimo — nadie sabe quién eres\n\n**Chat de Dating:**\n• Disponible con tus matches\n• Ve a Dating Mode → Matches & Chats\n• Solo puedes chatear con personas con las que hiciste match\n\n¿Tienes problemas con algún chat?',
                ]
            },
            // Photos / Search / Scan
            {
                match: /(buscar|busqueda|search|escan|scan|foto|photo|subir imagen|analiz|investigar|huella digital|footprint)/,
                responses: [
                    '🔍 Búsqueda y Escaneo:\n\n**Por Foto:**\n1. Sube una foto en la página principal\n2. Nuestro sistema busca coincidencias en apps de citas y la web\n3. Resultados 100% privados\n\n**Por Nombre/Teléfono/Handle:**\n1. Usa las pestañas de búsqueda en Home\n2. Ingresa la información\n3. Toca "Search Database"\n\n**Facial Scan (Premium):**\n• Análisis profundo de reconocimiento facial\n• Detecta perfiles duplicados\n• Busca coincidencias en múltiples plataformas\n\n¿Necesitas ayuda con una búsqueda específica?',
                ]
            },
            // Community
            {
                match: /(communit|comunidad|foro|post|publicar|comentar|grupo|social|feeds?)/,
                responses: [
                    '👥 Community Hub:\n\n• Toca "Community" en la barra inferior\n• Publica posts con texto e imágenes\n• Da Like ❤️ y comenta en posts\n• Sigue a otros usuarios\n• Ve perfiles de la comunidad\n\nReglas:\n• Sé respetuoso/a\n• No spam ni contenido inapropiado\n• Reporta contenido que viole las normas\n\n¿Quieres saber algo más sobre la comunidad?',
                ]
            },
            // Profile / Settings
            {
                match: /(perfil|profile|configurar|setting|ajust|cambiar nombre|cambiar foto|bio|intereses|apariencia)/,
                responses: [
                    '👤 Tu Perfil:\n\nToca "Profile" en la barra inferior para editar:\n• 📝 Nombre y Bio\n• 📸 Hasta 6 fotos\n• 🎬 Hasta 3 videos\n• 🎙️ Notas de voz\n• 💅 Apariencia\n• 🏷️ Intereses\n\n⚙️ Settings (desde el menú del avatar):\n• Seguridad y 2FA\n• Notificaciones\n• Privacidad\n• Suscripción\n• Tema oscuro/claro\n\nLos cambios se guardan automáticamente. ¿Algo específico?',
                ]
            },
            // 2FA / Security
            {
                match: /(2fa|dos factores|two factor|autenticacion|seguridad de cuenta|proteger cuenta|hackea)/,
                responses: [
                    '🔐 Seguridad de tu cuenta:\n\n**Two-Factor Authentication (2FA):**\nSettings → Security → Toggle "2FA"\n• Recibe códigos por SMS o Email\n• Se pide al login desde nuevos dispositivos\n• Puedes guardar dispositivos de confianza por 30 días\n\n**Otras medidas:**\n• Usa contraseñas únicas y fuertes\n• No compartas tu cuenta\n• Revisa sesiones activas periódicamente\n• Activa notificaciones de login sospechoso\n\n¿Tu cuenta fue comprometida? Cambia tu contraseña inmediatamente.',
                ]
            },
            // Notifications
            {
                match: /(notificacion|notification|alerta|alert|aviso|campana|no me llegan)/,
                responses: [
                    '🔔 Notificaciones:\n\nSettings → Notifications para configurar:\n• 📧 Email — recibe actualizaciones por correo\n• 📱 Push — alertas en tu dispositivo\n• 📲 SMS — mensajes de texto\n• 🚨 Safety Alerts — alertas de seguridad\n\n¿No te llegan notificaciones?\n1. Verifica permisos del navegador\n2. Revisa que no estén en spam\n3. Asegura que están activadas en Settings\n\n¿Necesitas algo más?',
                ]
            },
            // Technical issues / Bugs
            {
                match: /(error|bug|falla|no funciona|no carga|lento|crash|problema tecnico|se traba|congela|no abre|pantalla|negro|blanco)/,
                responses: [
                    '🔧 Solución de problemas técnicos:\n\n1. **Refresca la página** (F5 o Ctrl+R)\n2. **Limpia caché** del navegador\n3. **Prueba otro navegador** (Chrome, Firefox, Edge)\n4. **Verifica tu conexión** a internet\n5. **Desactiva extensiones** que puedan interferir\n\n📱 En móvil:\n• Cierra y reabre la app\n• Verifica actualizaciones del navegador\n• Reinicia tu dispositivo\n\nSi el problema persiste, descríbeme exactamente qué ves y enviaremos el caso a nuestro equipo técnico.',
                ]
            },
            // Dark mode / Theme
            {
                match: /(dark mode|modo oscuro|tema|theme|color|claro|light mode|noche)/,
                responses: [
                    '🌙 Modo Oscuro/Claro:\n\nProfile → Dark Mode toggle\n\nEl tema se guarda automáticamente y persiste entre sesiones. El modo oscuro reduce el brillo para uso nocturno y ahorra batería en pantallas OLED.\n\n¿Algo más?',
                ]
            },
            // App / What is RedFlag
            {
                match: /(que es redflag|para que sirve|como funciona la app|que hace|proposito|mision|objetivo de la app)/,
                responses: [
                    '🚩 RedFlag es tu escudo de protección en el mundo digital del dating:\n\n🔍 **Búsqueda:** Investiga perfiles sospechosos con foto, nombre, teléfono o handle\n📸 **Facial Scan:** Reconocimiento facial para detectar catfishing\n💬 **Chat Anónimo:** Comparte experiencias de forma segura\n💜 **Dating Mode:** Encuentra matches genuinos y verificados\n🛡️ **Personal Guard:** Protección durante citas en persona\n👥 **Community:** Red social de apoyo entre usuarios\n\nNuestra misión: Proteger tus relaciones y mantenerte seguro/a en el mundo digital. ¿Quieres saber más?',
                ]
            },
            // Age / Minor
            {
                match: /(edad|menor|nino|joven|adolescent|underage|18|anos tiene)/,
                responses: [
                    '⚠️ RedFlag es exclusivamente para mayores de 18 años. Si sospechas que un menor está usando la plataforma, repórtalo inmediatamente:\n\nPerfil → ⋯ → Report → "Underage user"\n\nTomamos esto extremadamente en serio y actuamos de inmediato. Si un menor está en peligro, contacta a las autoridades locales.',
                ]
            },
            // Languages
            {
                match: /(idioma|language|ingles|english|espanol|spanish|traducir|translate)/,
                responses: [
                    '🌐 Actualmente RedFlag está disponible en español e inglés. La interfaz se adapta automáticamente. Nuestro soporte puede asistirte en ambos idiomas. ¿En qué idioma prefieres que te ayude?',
                ]
            },
            // How to use / Help
            {
                match: /(como uso|como se usa|ayuda|help|tutorial|guia|instrucciones|no entiendo|como hago|ensename|explicar)/,
                responses: [
                    '📖 Guía rápida de RedFlag:\n\n1. **Regístrate** con tu email\n2. **Verifica tu identidad** con una selfie\n3. **Explora** las funciones:\n   • 🏠 Home — Busca perfiles sospechosos\n   • 👥 Community — Conecta con otros usuarios\n   • 💬 Chat — Salas anónimas por género\n   • 👤 Profile — Edita tu perfil\n   • 💜 Dating — Encuentra matches\n\n¿Sobre qué función específica necesitas ayuda? Puedo darte instrucciones detalladas.',
                ]
            },
            // Compliments about app
            {
                match: /(buena app|me gusta|increible|genial la app|excelente app|muy buena|love it|amazing)/,
                responses: [
                    '🥰 ¡Muchas gracias! Tu feedback nos motiva a seguir mejorando. Si tienes sugerencias para nuevas funciones, nos encantaría escucharlas. ¡Tu seguridad y satisfacción es nuestra prioridad!',
                ]
            },
            // Complaints
            {
                match: /(mala app|no sirve|horrible|pesima|odio|worst|terrible|basura|no me gusta)/,
                responses: [
                    '😔 Lamento mucho que tengas una mala experiencia. Tu feedback es importante para nosotros. ¿Puedes contarme específicamente qué problema estás teniendo? Quiero intentar ayudarte a resolverlo. Si prefieres, puedo escalar tu caso a un supervisor.',
                ]
            },
            // Human agent
            {
                match: /(persona real|humano|agente|supervisor|hablar con alguien|quiero un humano|no eres util|escalar)/,
                responses: [
                    '👨‍💼 Entiendo que prefieras hablar con un agente humano. Puedes:\n\n1. 📧 Enviar email a support@redflag.com\n2. 📱 Nuestro equipo responde en menos de 2 horas\n3. He registrado tu solicitud para que un agente se comunique contigo\n\nMientras tanto, ¿puedo intentar ayudarte con algo?',
                ]
            },
            // Suggestion / Feature request
            {
                match: /(sugeren|suggestion|feature|funcion nueva|agregar|anadir|quisiera que|seria bueno|podrian)/,
                responses: [
                    '💡 ¡Nos encantan las sugerencias! Cuéntame qué te gustaría ver en RedFlag y lo enviaré a nuestro equipo de producto. Todas las sugerencias son evaluadas y las más populares se implementan en futuras actualizaciones. ¿Cuál es tu idea?',
                ]
            },
            // WiFi / Connection
            {
                match: /(wifi|internet|conexion|offline|sin red|no carga|sin conexion|signal|senal)/,
                responses: [
                    '📡 Problemas de conexión:\n\n1. Verifica que tienes internet activo\n2. Intenta cambiar entre WiFi y datos móviles\n3. Refresca la página\n4. RedFlag tiene modo offline básico gracias a su PWA\n\nSi el problema persiste, puede ser un issue temporal del servidor. Intenta de nuevo en unos minutos. ¿Algo más?',
                ]
            },
            // Love / Relationship advice
            {
                match: /(consejo|advice|como conquist|primera cita|que digo|que hago si me gusta|relacion sana|red flag en pareja|bandera roja)/,
                responses: [
                    '❤️ Algunos consejos de seguridad en dating:\n\n🟢 **Green flags:**\n• Comunicación abierta y honesta\n• Respeto de límites\n• Consistencia entre palabras y acciones\n\n🔴 **Red flags:**\n• Piden dinero rápidamente\n• Evitan videollamadas\n• Historias inconsistentes\n• Presión para encontrarse demasiado rápido\n• Perfil sin verificar\n\n💡 Siempre usa las herramientas de RedFlag para verificar antes de confiar. ¿Quieres saber algo más específico?',
                ]
            },
            // Phone number
            {
                match: /(telefono|phone|llamar|numero|contacto directo|linea)/,
                responses: [
                    '📞 Nuestros canales de contacto:\n\n• 💬 Este chat (disponible 24/7)\n• 📧 Email: support@redflag.com\n• 🆘 Emergencias: Usa el Panic Button en la app\n\nPara emergencias reales, siempre llama al 911. ¿En qué más puedo ayudarte?',
                ]
            },
        ];

        // Find matching pattern
        for (const pattern of patterns) {
            if (pattern.match.test(lower)) {
                const responses = pattern.responses;
                return responses[Math.floor(Math.random() * responses.length)];
            }
        }

        // Intelligent fallback — try to extract topic
        const words = lower.split(/\s+/).filter(w => w.length > 3);
        const topicHints = {
            'app': '¿Quieres saber cómo funciona alguna función de la app? Puedo explicarte sobre búsquedas, chat, dating, verificación, o cualquier otra cosa.',
            'problema': '¿Puedes describir el problema con más detalle? Por ejemplo: ¿qué pantalla ves? ¿Aparece algún error? ¿Desde cuándo ocurre?',
            'como': '¿Qué es lo que quieres hacer? Puedo guiarte paso a paso con cualquier función de RedFlag.',
            'puedo': 'Cuéntame qué quieres lograr y te explico cómo hacerlo en RedFlag.',
            'quiero': '¡Perfecto! Dime exactamente qué necesitas y te ayudo con eso.',
            'donde': '¿Qué estás buscando en la app? Te puedo indicar exactamente dónde encontrarlo.',
        };

        for (const [hint, response] of Object.entries(topicHints)) {
            if (words.some(w => w.includes(hint))) {
                return `🤔 ${response}`;
            }
        }

        // Smart fallback responses
        const fallbacks = [
            `🤔 Interesante pregunta. Aunque no estoy 100% segura de entender, intentaré ayudarte. ¿Podrías darme más detalles sobre "${msg.split(' ').slice(0, 4).join(' ')}..."?\n\nTambién puedo ayudarte con:\n• 🔍 Búsquedas y escaneos\n• 💬 Chat y mensajes\n• 💜 Dating y matches\n• 🛡️ Seguridad y privacidad\n• 💳 Pagos y suscripción\n• ⚙️ Tu cuenta y perfil`,
            `💡 No estoy segura de tener la respuesta exacta para eso, pero estoy aprendiendo constantemente. Te sugiero:\n\n1. Revisar los artículos de ayuda (botón ← atrás)\n2. Reformular tu pregunta con más detalle\n3. O escribir a support@redflag.com para atención personalizada\n\n¿Hay algo específico que pueda intentar responder?`,
            `🙋 ¡Buena pregunta! Déjame intentar ayudarte. ¿Tu consulta está relacionada con alguno de estos temas?\n\n• Reportar a alguien\n• Problemas con tu cuenta\n• Pagos y suscripción\n• Verificación de identidad\n• Dating Mode\n• Seguridad personal\n\nEscríbeme el tema y te doy información detallada.`,
        ];

        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    };

    // Chat bot with typing indicator
    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput.trim();
        setChatMessages((prev) => [...prev, { from: 'user', text: userMsg }]);
        setChatInput('');

        // Show typing indicator
        setChatMessages((prev) => [...prev, { from: 'bot', text: '...', typing: true }]);

        const delay = 600 + Math.random() * 800; // Random delay for realism
        setTimeout(() => {
            const reply = getAIResponse(userMsg);
            setChatMessages((prev) => {
                const filtered = prev.filter((m) => !m.typing);
                return [...filtered, { from: 'bot', text: reply }];
            });
        }, delay);
    };

    // ── Article Detail View ──
    if (selectedArticle) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen flex justify-center">
                <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
                    <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <button onClick={() => setSelectedArticle(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <span className="material-icons text-2xl">chevron_left</span>
                        </button>
                        <h1 className="text-sm font-bold truncate max-w-[60%]">Help Article</h1>
                        <div className="w-10"></div>
                    </header>
                    <main className="flex-1 px-6 py-6 pb-24 overflow-y-auto hide-scrollbar">
                        <h2 className="text-xl font-bold mb-4 leading-tight">{selectedArticle.title}</h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            {selectedArticle.content.split('\n').map((line, i) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                    return <h3 key={i} className="text-base font-bold mt-4 mb-2 text-primary">{line.replace(/\*\*/g, '')}</h3>;
                                }
                                if (line.startsWith('•') || line.startsWith('   •') || line.startsWith('   -')) {
                                    return <p key={i} className="ml-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>;
                                }
                                if (line.match(/^\d\./)) {
                                    return <p key={i} className="ml-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                                }
                                if (line.trim() === '') return <br key={i} />;
                                return <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                            })}
                        </div>
                        {/* Helpful? */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                            <p className="text-sm text-center text-slate-500 mb-3">¿Fue útil este artículo?</p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-500/20 transition-colors text-sm font-medium">
                                    <span className="material-icons text-lg">thumb_up</span> Sí
                                </button>
                                <button onClick={() => { setSelectedArticle(null); setChatOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors text-sm font-medium">
                                    <span className="material-icons text-lg">thumb_down</span> No
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ── Topic Detail View ──
    if (selectedTopic) {
        const topic = ARTICLES[selectedTopic];
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen flex justify-center">
                <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
                    <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <button onClick={() => setSelectedTopic(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <span className="material-icons text-2xl">chevron_left</span>
                        </button>
                        <h1 className="text-sm font-bold">{topic.title}</h1>
                        <div className="w-10"></div>
                    </header>
                    <main className="flex-1 px-6 py-4 pb-24 overflow-y-auto hide-scrollbar">
                        {/* Topic Header */}
                        <div className={`p-5 rounded-2xl bg-gradient-to-br ${topic.color} mb-6`}>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                                <span className="material-icons text-white text-2xl">{topic.icon}</span>
                            </div>
                            <h2 className="text-lg font-bold text-white">{topic.title}</h2>
                            <p className="text-white/80 text-sm mt-1">{topic.articles.length} artículos disponibles</p>
                        </div>
                        {/* Articles List */}
                        <div className="flex flex-col gap-3">
                            {topic.articles.map((article) => (
                                <button
                                    key={article.id}
                                    onClick={() => setSelectedArticle(article)}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-white/10 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="material-icons text-primary/60 group-hover:text-primary transition-colors text-lg">article</span>
                                        <span className="text-sm font-medium truncate">{article.title}</span>
                                    </div>
                                    <span className="material-icons text-slate-300 dark:text-slate-600 group-hover:text-primary text-lg transition-colors ml-2 flex-shrink-0">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ── Live Chat View ──
    if (chatOpen) {
        return (
            <div className="bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen flex justify-center">
                <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
                    <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <button onClick={() => setChatOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            <span className="material-icons text-2xl">chevron_left</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <span className="material-icons text-white text-sm">support_agent</span>
                            </div>
                            <div>
                                <h1 className="text-sm font-bold leading-tight">RedFlag Support</h1>
                                <p className="text-[10px] text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="w-10"></div>
                    </header>

                    {/* Chat Messages */}
                    <main className="flex-1 px-4 py-4 overflow-y-auto hide-scrollbar flex flex-col gap-3">
                        {chatMessages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.from === 'user'
                                        ? 'bg-primary text-white rounded-br-md'
                                        : 'bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-bl-md border border-slate-100 dark:border-white/5'
                                        }`}
                                >
                                    {msg.typing ? (
                                        <div className="flex items-center gap-1 py-1">
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    ) : (
                                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </main>

                    {/* Chat Input */}
                    <div className="sticky bottom-0 px-4 py-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-slate-100 dark:border-white/5">
                        <div className="flex gap-2">
                            <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 py-3 px-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-400"
                            />
                            <button
                                onClick={handleSendChat}
                                className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/30"
                            >
                                <span className="material-icons">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Help Center View ──
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 min-h-screen flex justify-center">
            <div className="w-full max-w-md bg-background-light dark:bg-background-dark min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
                {/* Header */}
                <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <span className="material-icons text-2xl">chevron_left</span>
                    </button>
                    <h1 className="text-lg font-bold">Help Center</h1>
                    <div className="w-10"></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-6 pb-24 overflow-y-auto hide-scrollbar">
                    {/* Hero Search Section */}
                    <div className="mt-4 mb-8">
                        <h2 className="text-2xl font-bold mb-2">How can we help?</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Find advice and answers from the RedFlag team.</p>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="material-icons text-primary/70 group-focus-within:text-primary transition-colors">search</span>
                            </div>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-3.5 pl-12 pr-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent placeholder-slate-400 text-sm shadow-sm transition-all"
                                placeholder="Search for articles, topics..."
                                type="text"
                            />
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.trim() && (
                        <div className="mb-8">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                            </p>
                            {searchResults.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.id}
                                            onClick={() => setSelectedArticle(result)}
                                            className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/50 transition-all text-left group"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{result.title}</p>
                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                    <span className="material-icons text-xs">{result.topicIcon}</span>
                                                    {result.topicTitle}
                                                </p>
                                            </div>
                                            <span className="material-icons text-slate-300 group-hover:text-primary text-lg ml-2">chevron_right</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <span className="material-icons text-4xl text-slate-300 dark:text-slate-600">search_off</span>
                                    <p className="text-sm text-slate-400 mt-2">No se encontraron resultados.</p>
                                    <p className="text-xs text-slate-400 mt-1">Intenta con otros términos o contacta soporte.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Categories Grid */}
                    {!searchQuery.trim() && (
                        <>
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Browse Topics</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(ARTICLES).map(([key, topic]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedTopic(key)}
                                            className="flex flex-col items-start p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-white/10 transition-all group text-left"
                                        >
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${topic.color} flex items-center justify-center mb-3 text-white shadow-lg`}>
                                                <span className="material-icons text-xl">{topic.icon}</span>
                                            </div>
                                            <span className="font-semibold text-sm">{topic.title}</span>
                                            <span className="text-xs text-slate-400 mt-1">{topic.articles.length} artículos</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* FAQ Section */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Preguntas Frecuentes</h3>
                                <div className="flex flex-col gap-2">
                                    {FAQS.map((faq, i) => (
                                        <div key={i}>
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/50 transition-all text-left"
                                            >
                                                <span className="text-sm font-medium flex-1 pr-2">{faq.q}</span>
                                                <span className={`material-icons text-slate-400 transition-transform duration-300 ${expandedFaq === i ? 'rotate-180 text-primary' : ''}`}>
                                                    expand_more
                                                </span>
                                            </button>
                                            {expandedFaq === i && (
                                                <div className="px-4 py-3 bg-primary/5 dark:bg-white/[0.02] border border-t-0 border-slate-100 dark:border-white/5 rounded-b-xl -mt-1 animate-page-in">
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{faq.a}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Contact Section */}
                    <div className="mt-4 mb-8">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold">Still need help?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Our team is available 24/7 for urgent concerns.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setChatOpen(true)}
                                className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-icons">chat_bubble</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-sm">Chat with Support</span>
                                        <span className="text-xs text-white/80 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                            Wait time: &lt; 2 min
                                        </span>
                                    </div>
                                </div>
                                <span className="material-icons text-white/70">arrow_forward</span>
                            </button>

                            <button
                                onClick={() => window.location.href = 'mailto:support@redflag.com'}
                                className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl hover:border-primary/50 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-icons text-primary">email</span>
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-sm">Email Support</span>
                                        <span className="text-xs text-slate-400">support@redflag.com</span>
                                    </div>
                                </div>
                                <span className="material-icons text-slate-300">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
