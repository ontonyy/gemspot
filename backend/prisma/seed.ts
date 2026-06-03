/* Seed mirrors web/src/shared/api/placesApi.ts RAW[] + entities/place/categories.tsx
   FG_CATS, so the backend serves byte-identical DTOs to the mock. Keep in sync. */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CATS = [
  { id: 'tabletennis', label: 'Table tennis', short: 'Ping pong', cssvar: '--c-tabletennis' },
  { id: 'basketball', label: 'Basketball', short: 'Hoops', cssvar: '--c-basketball' },
  { id: 'football', label: 'Football', short: 'Football', cssvar: '--c-football' },
  { id: 'tennis', label: 'Tennis', short: 'Tennis', cssvar: '--c-tennis' },
  { id: 'padel', label: 'Padel', short: 'Padel', cssvar: '--c-padel' },
  { id: 'scenic', label: 'Viewpoint', short: 'Views', cssvar: '--c-scenic' },
  { id: 'sakura', label: 'Sakura', short: 'Sakura', cssvar: '--c-sakura' },
]

const RAW = [
  { id: '01', slug: 'politseiaia-ping-pong', name: 'Politseiaia ping-pong', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4351, lng: 24.7475, saves: 38, views: 412, shares: 9, tags: ['Free', 'Concrete', 'Lit'], note: 'Two weather-worn outdoor tables tucked behind the police garden. Quiet on weekday mornings, busy after 18:00 when the after-work crowd rolls in.', by: 'maris_t', verified: '12 days ago', isFree: true, access: 'Free', lit: 'Yes', best: 'Eve' },
  { id: '02', slug: 'kanuti-aed-blossoms', name: 'Kanuti aed blossoms', cat: 'sakura', area: 'Kesklinn', lat: 59.4405, lng: 24.7495, saves: 96, views: 1203, shares: 41, tags: ['Seasonal', 'Late Apr'], note: 'A short row of cherry trees along the old bastion wall. Peak bloom lasts roughly ten days; go early to beat the photographers.', by: 'tallinn_walks', verified: '4 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
  { id: '03', slug: 'patkuli-viewpoint', name: 'Patkuli viewpoint', cat: 'scenic', area: 'Toompea', lat: 59.4395, lng: 24.7385, saves: 142, views: 2890, shares: 88, tags: ['Free', 'Sunset', 'Rooftops'], note: 'The classic red-roof panorama over the lower town and harbour. North-facing, so best at golden hour rather than true sunset.', by: 'gemspot_team', verified: '2 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '04', slug: 'politseipark-hoops', name: 'Politseipark hoops', cat: 'basketball', area: 'Kesklinn', lat: 59.4330, lng: 24.7480, saves: 21, views: 198, shares: 4, tags: ['Free', 'Full court'], note: 'Single full court with fresh nets as of this spring. Surface drains well, so it dries fast after rain.', by: 'hoops_ee', verified: '9 days ago', isFree: true, access: 'Free', lit: 'Yes', best: 'Day' },
  { id: '05', slug: 'kadrioru-tennis-courts', name: 'Kadrioru tennis courts', cat: 'tennis', area: 'Kadriorg', lat: 59.4380, lng: 24.7905, saves: 44, views: 530, shares: 12, tags: ['Hard court', 'Lit'], note: 'Public hard courts beside the park. First-come on weekdays; bring your own net tension tolerance and a spare ball.', by: 'noor.k', verified: '6 days ago', isFree: false, access: 'Paid', lit: 'Yes', best: 'Day' },
  { id: '06', slug: 'lowenruh-pitch', name: 'Löwenruh pitch', cat: 'football', area: 'Kristiine', lat: 59.4270, lng: 24.7180, saves: 34, views: 305, shares: 7, tags: ['Free', 'Grass'], note: 'Full-size grass pitch beside the park pond. Open for pickup games when the clubs are not training.', by: 'fc_local', verified: '15 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Eve' },
  { id: '07', slug: 'snelli-pond-tables', name: 'Snelli pond tables', cat: 'tabletennis', area: 'Kesklinn', lat: 59.4375, lng: 24.7430, saves: 52, views: 644, shares: 15, tags: ['Free', 'Shaded'], note: 'Three tables under the trees by Snelli pond. Shaded all afternoon, which makes it the summer favourite.', by: 'maris_t', verified: '3 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Day' },
  { id: '08', slug: 'pirita-padel-club', name: 'Pirita padel club', cat: 'padel', area: 'Pirita', lat: 59.4690, lng: 24.8330, saves: 27, views: 281, shares: 6, tags: ['Booking', 'Indoor'], note: 'Four indoor padel courts out by the marina. Book ahead on weekends; off-peak weekday slots are easy to grab.', by: 'fc_local', verified: '8 days ago', isFree: false, access: 'Booking', lit: 'Yes', best: 'Eve' },
  { id: '09', slug: 'lasnamae-cliff-view', name: 'Lasnamäe cliff view', cat: 'scenic', area: 'Lasnamäe', lat: 59.4360, lng: 24.8400, saves: 67, views: 910, shares: 22, tags: ['Free', 'Industrial'], note: 'Limestone escarpment looking back at the city skyline. Raw, a little industrial, and almost always empty.', by: 'noor.k', verified: '11 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Dusk' },
  { id: '10', slug: 'tammsaare-cherries', name: 'Tammsaare cherries', cat: 'sakura', area: 'Kesklinn', lat: 59.4330, lng: 24.7530, saves: 113, views: 1740, shares: 53, tags: ['Seasonal', 'Late Apr', 'Central'], note: 'The most photographed blossoms in town, ringing the park fountain. Crowded at peak, but worth one early visit.', by: 'tallinn_walks', verified: '5 days ago', isFree: true, access: 'Free', lit: 'No', best: 'Apr' },
]

async function main() {
  // categories — order preserved via sort
  for (let i = 0; i < CATS.length; i++) {
    const c = CATS[i]
    await prisma.category.upsert({
      where: { id: c.id },
      update: { slug: c.id, label: c.label, short: c.short, cssvar: c.cssvar, sort: i },
      create: { id: c.id, slug: c.id, label: c.label, short: c.short, cssvar: c.cssvar, sort: i },
    })
  }

  // places + primary category link — order preserved via sort
  for (let i = 0; i < RAW.length; i++) {
    const r = RAW[i]
    await prisma.place.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        slug: r.slug,
        name: r.name,
        neighborhood: r.area,
        lat: r.lat,
        lng: r.lng,
        savesCount: r.saves,
        viewsCount: r.views,
        sharesCount: r.shares,
        isFree: r.isFree,
        tags: r.tags,
        note: r.note,
        contributorName: r.by,
        verifiedLabel: r.verified,
        accessNote: r.access,
        litNote: r.lit,
        bestNote: r.best,
        sort: i,
        categories: {
          create: { categoryId: r.cat, primary: true },
        },
      },
    })
  }

  // admin user — moderation panel access. Idempotent upsert; password from
  // ADMIN_PASSWORD env (defaults to a dev value).
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@gemspot.ee').toLowerCase()
  const adminPass = process.env.ADMIN_PASSWORD ?? 'admin1234'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPass, 10),
      role: 'ADMIN',
      profile: { create: { name: 'GemSpot Admin' } },
    },
  })

  const places = await prisma.place.count()
  const cats = await prisma.category.count()
  console.log(`Seeded ${cats} categories, ${places} places. Admin: ${adminEmail}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
