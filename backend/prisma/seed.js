// ============================================================
// MODULE: AUTH — Seed
// Données initiales : crée le compte administrateur par défaut.
// Lancer avec : npm run db:seed
// ============================================================

const { PrismaClient } = require('@prisma/client')
const bcrypt           = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed GMAO...\n')

  // #REGION admin-user

  const adminEmail    = process.env.SEED_ADMIN_EMAIL    || 'admin@gmao.local'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Gmao2024!'

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (existing) {
    console.log(`⏭  Administrateur déjà présent : ${adminEmail}`)
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const admin = await prisma.user.create({
      data: {
        email:        adminEmail,
        nom:          'ADMIN',
        prenom:       'Super',
        role:         'ADMIN',
        passwordHash,
        actif:        true,
      },
    })
    console.log(`✅ Administrateur créé : ${admin.email}  (id: ${admin.id})`)
    console.log(`   Mot de passe initial : ${adminPassword}`)
    console.log(`   ⚠️  Changez ce mot de passe dès la première connexion !\n`)
  }

  // #ENDREGION admin-user

  // #REGION demo-users (uniquement en développement)

  if (process.env.NODE_ENV !== 'production') {
    const demoUsers = [
      { email: 'maintenance1@gmao.local', nom: 'DUPONT', prenom: 'Paul',    role: 'MAINTENANCE' },
      { email: 'maintenance2@gmao.local', nom: 'LEROY',  prenom: 'Sophie',  role: 'MAINTENANCE' },
      { email: 'production1@gmao.local',  nom: 'MARTIN', prenom: 'Luc',     role: 'PRODUCTION'  },
      { email: 'production2@gmao.local',  nom: 'BLANC',  prenom: 'Camille', role: 'PRODUCTION'  },
    ]

    const demoHash = await bcrypt.hash('Demo1234!', 12)

    for (const u of demoUsers) {
      const ex = await prisma.user.findUnique({ where: { email: u.email } })
      if (!ex) {
        await prisma.user.create({ data: { ...u, passwordHash: demoHash, actif: true } })
        console.log(`✅ Utilisateur démo créé : ${u.email}  [${u.role}]`)
      } else {
        console.log(`⏭  Déjà présent : ${u.email}`)
      }
    }
    console.log('\n   Mot de passe des comptes démo : Demo1234!')
  }

  // #ENDREGION demo-users

  console.log('\n✨ Seed terminé.')
}

main()
  .catch((e) => { console.error('❌ Erreur seed :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
